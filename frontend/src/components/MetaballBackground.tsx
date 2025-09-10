"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Pane } from "tweakpane";

/*
  MetaballBackground: Efficient port of provided CodePen metaball hero.
  Differences / optimizations:
  - Lazy init inside useEffect to avoid SSR issues
  - Optional controls via NEXT_PUBLIC_METABALL_CONTROLS flag
  - Cleanup on unmount: event listeners, renderer, pane
  - Reduced default spheres for perf; presets available
  - Extracted shader strings to constants for readability
*/

// Device capability detection
const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const hwThreads = (typeof navigator !== 'undefined' && (navigator as any).hardwareConcurrency) || 8;
const isLowPowerDevice = isMobile || hwThreads <= 4;

// Presets (subset retained; can extend easily)
const presets: any = {
  holographic: {
    sphereCount: isMobile ? 4 : 6,
    ambientIntensity: 0.12,
    diffuseIntensity: 1.2,
    specularIntensity: 2.5,
    specularPower: 3,
    fresnelPower: 0.8,
    backgroundColor: new THREE.Color(0x0a0a15),
    sphereColor: new THREE.Color(0x050510),
    lightColor: new THREE.Color(0xccaaff),
    lightPosition: new THREE.Vector3(0.9, 0.9, 1.2),
    smoothness: 0.8,
    contrast: 1.6,
    fogDensity: 0.06,
    cursorGlowIntensity: 1.2,
    cursorGlowRadius: 2.2,
    cursorGlowColor: new THREE.Color(0xaa77ff)
  },
  minimal: {
    sphereCount: isMobile ? 2 : 3,
    ambientIntensity: 0.0,
    diffuseIntensity: 0.25,
    specularIntensity: 1.3,
    specularPower: 11,
    fresnelPower: 1.7,
    backgroundColor: new THREE.Color(0x0a0a0a),
    sphereColor: new THREE.Color(0x000000),
    lightColor: new THREE.Color(0xffffff),
    lightPosition: new THREE.Vector3(1, 0.5, 0.8),
    smoothness: 0.25,
    contrast: 2.0,
    fogDensity: 0.1,
    cursorGlowIntensity: 0.3,
    cursorGlowRadius: 1.0,
    cursorGlowColor: new THREE.Color(0xffffff)
  }
};

const baseSettings = {
  preset: 'holographic',
  fixedTopLeftRadius: 0.8,
  fixedBottomRightRadius: 0.9,
  smallTopLeftRadius: 0.3,
  smallBottomRightRadius: 0.35,
  cursorRadiusMin: 0.08,
  cursorRadiusMax: 0.15,
  animationSpeed: 0.6,
  movementScale: 1.2,
  mouseSmoothness: 0.1,
  mergeDistance: 1.5,
  mouseProximityEffect: true,
  minMovementScale: 0.3,
  maxMovementScale: 1.0
};

interface MetaballBackgroundProps {
  className?: string;
  preset?: keyof typeof presets;
  enableControls?: boolean; // override flag
  quality?: 'auto' | 'high' | 'medium' | 'low'; // performance baseline
  disableWhenIdle?: boolean; // pause if user not interacting
}

export function MetaballBackground({ className, preset = 'holographic', enableControls, quality = 'auto', disableWhenIdle = true }: MetaballBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
  if (!container) return;

    const settings: any = { ...baseSettings, ...presets[preset] };

    let scene: THREE.Scene, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer, material: THREE.ShaderMaterial;
    let clock: THREE.Clock, frameCount = 0, lastTime = performance.now(), fps = 0;
    const targetMouse = new THREE.Vector2(0.5, 0.5);
    const mousePos = new THREE.Vector2(0.5, 0.5);
    const cursorSphere3D = new THREE.Vector3();
    let activeMerges = 0;

    // baseline pixel ratio caps by quality
    function basePR(){
      if(quality==='low') return 0.75;
      if(quality==='medium') return 1;
      if(quality==='high') return Math.min(window.devicePixelRatio||1, 2);
      // auto
      return Math.min(window.devicePixelRatio||1, isMobile?1.2:1.8);
    }
    let dynamicPixelRatio = basePR();
    const devicePixelRatio = dynamicPixelRatio;

    // dynamic scaling state
    let fpsSamples: number[] = [];
    const MAX_SAMPLES = 30;
    let lastInteraction = performance.now();
    let pausedForIdle = false;
    let hidden = false;

    function screenToWorldJS(nx: number, ny: number) {
      const uvx = nx * 2 - 1;
      const uvy = ny * 2 - 1; // already flipped in caller
      const aspect = window.innerWidth / window.innerHeight;
      return new THREE.Vector3(uvx * aspect * 2.0, uvy * 2.0, 0.0);
    }

  function init() {
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;
      clock = new THREE.Clock();

  renderer = new THREE.WebGLRenderer({ antialias: quality==='high' && !isMobile && !isLowPowerDevice, alpha: true, powerPreference: isMobile ? 'default' : 'high-performance' });
  const pixelRatio = dynamicPixelRatio;
      const vw = window.innerWidth; const vh = window.innerHeight;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(vw, vh);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const canvas = renderer.domElement;
      canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none;';
  // container is assured non-null here via early return above
  (container as HTMLDivElement).appendChild(canvas);

      material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(vw, vh) },
            uActualResolution: { value: new THREE.Vector2(vw * pixelRatio, vh * pixelRatio) },
            uPixelRatio: { value: pixelRatio },
            uMousePosition: { value: new THREE.Vector2(0.5, 0.5) },
            uCursorSphere: { value: new THREE.Vector3(0, 0, 0) },
            uCursorRadius: { value: settings.cursorRadiusMin },
            uSphereCount: { value: settings.sphereCount },
            uFixedTopLeftRadius: { value: settings.fixedTopLeftRadius },
            uFixedBottomRightRadius: { value: settings.fixedBottomRightRadius },
            uSmallTopLeftRadius: { value: settings.smallTopLeftRadius },
            uSmallBottomRightRadius: { value: settings.smallBottomRightRadius },
            uMergeDistance: { value: settings.mergeDistance },
            uSmoothness: { value: settings.smoothness },
            uAmbientIntensity: { value: settings.ambientIntensity },
            uDiffuseIntensity: { value: settings.diffuseIntensity },
            uSpecularIntensity: { value: settings.specularIntensity },
            uSpecularPower: { value: settings.specularPower },
            uFresnelPower: { value: settings.fresnelPower },
            uBackgroundColor: { value: settings.backgroundColor },
            uSphereColor: { value: settings.sphereColor },
            uLightColor: { value: settings.lightColor },
            uLightPosition: { value: settings.lightPosition },
            uContrast: { value: settings.contrast },
            uFogDensity: { value: settings.fogDensity },
            uAnimationSpeed: { value: settings.animationSpeed },
            uMovementScale: { value: settings.movementScale },
            uMouseProximityEffect: { value: settings.mouseProximityEffect },
            uMinMovementScale: { value: settings.minMovementScale },
            uMaxMovementScale: { value: settings.maxMovementScale },
            uCursorGlowIntensity: { value: settings.cursorGlowIntensity },
            uCursorGlowRadius: { value: settings.cursorGlowRadius },
            uCursorGlowColor: { value: settings.cursorGlowColor },
            uIsSafari: { value: isSafari ? 1.0 : 0.0 },
            uIsMobile: { value: isMobile ? 1.0 : 0.0 },
            uIsLowPower: { value: isLowPowerDevice ? 1.0 : 0.0 }
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: fragmentShaderSource(),
        transparent: true
      });

      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2), material);
      scene.add(mesh);
      onPointerMove({ clientX: window.innerWidth/2, clientY: window.innerHeight/2 } as any);
  animate();
    }

    function onPointerMove(e: { clientX: number; clientY: number; }) {
      targetMouse.x = e.clientX / window.innerWidth;
      targetMouse.y = 1 - e.clientY / window.innerHeight;
      lastInteraction = performance.now();
      if(pausedForIdle){ pausedForIdle=false; clock.start(); }
      const world = screenToWorldJS(targetMouse.x, targetMouse.y);
      cursorSphere3D.copy(world);

      // merges
      const fixedPositions = [
        screenToWorldJS(0.08,0.92),
        screenToWorldJS(0.25,0.72),
        screenToWorldJS(0.92,0.08),
        screenToWorldJS(0.72,0.25)
      ];
      let closest = 999; activeMerges = 0;
      fixedPositions.forEach(p=>{ const dist = cursorSphere3D.distanceTo(p); closest=Math.min(closest,dist); if(dist < settings.mergeDistance) activeMerges++; });
      const pf = Math.max(0,1-closest/settings.mergeDistance);
      const sf = pf*pf*(3-2*pf);
      const dynRadius = settings.cursorRadiusMin + (settings.cursorRadiusMax-settings.cursorRadiusMin)*sf;
      material.uniforms.uCursorSphere.value.copy(cursorSphere3D);
      material.uniforms.uCursorRadius.value = dynRadius;
    }

    function onWindowResize() {
      const w = window.innerWidth, h = window.innerHeight; const pr = Math.min(window.devicePixelRatio||1, isMobile?1.5:2);
      camera.updateProjectionMatrix();
      renderer.setSize(w,h); renderer.setPixelRatio(pr);
      material.uniforms.uResolution.value.set(w,h);
      material.uniforms.uActualResolution.value.set(w*pr,h*pr);
      material.uniforms.uPixelRatio.value = pr;
    }

    function animate(){
      requestAnimationFrame(animate);
      if(hidden){ return; }
      if(disableWhenIdle){
        const idleMs = performance.now() - lastInteraction;
        if(idleMs > 15000 && !pausedForIdle){ // 15s idle -> pause update except every 2s cheap frame
          pausedForIdle = true; clock.stop();
        }
        if(pausedForIdle){
          // only render every ~2s to keep subtle presence
          if(idleMs % 2000 < 16){ render(true); }
          return;
        }
      }
      render();
    }

    function render(lightPass?: boolean){
      const now = performance.now(); frameCount++; if(now-lastTime>=1000){ fps = Math.round(frameCount*1000/(now-lastTime)); frameCount=0; lastTime=now; }
      // collect fps samples for auto quality tuning
      if(!lightPass){
        fpsSamples.push(fps);
        if(fpsSamples.length > MAX_SAMPLES) fpsSamples.shift();
        if(quality==='auto' && fpsSamples.length===MAX_SAMPLES){
          const avg = fpsSamples.reduce((a,b)=>a+b,0)/fpsSamples.length;
          // adjust pixel ratio based on sustained fps
            let targetPR = dynamicPixelRatio;
            if(avg < 30) targetPR = Math.max(0.6, dynamicPixelRatio - 0.15);
            else if(avg > 50) targetPR = Math.min(basePR(), dynamicPixelRatio + 0.1);
            if(Math.abs(targetPR - dynamicPixelRatio) > 0.05){
              dynamicPixelRatio = targetPR;
              const w = window.innerWidth, h = window.innerHeight;
              renderer.setPixelRatio(dynamicPixelRatio);
              material.uniforms.uActualResolution.value.set(w*dynamicPixelRatio, h*dynamicPixelRatio);
              material.uniforms.uPixelRatio.value = dynamicPixelRatio;
            }
        }
      }
      mousePos.x += (targetMouse.x - mousePos.x) * settings.mouseSmoothness;
      mousePos.y += (targetMouse.y - mousePos.y) * settings.mouseSmoothness;
      material.uniforms.uTime.value = clock.getElapsedTime();
      material.uniforms.uMousePosition.value.copy(mousePos);
      renderer.render(scene,camera);
    }

    function addEvents(){
      window.addEventListener('mousemove', onPointerMove as any, { passive: true });
      window.addEventListener('resize', onWindowResize as any, { passive: true });
      window.addEventListener('touchmove', touchMoveHandler as any, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
    }

    function touchMoveHandler(ev: TouchEvent){
      if(ev.touches.length>0){ onPointerMove({ clientX: ev.touches[0].clientX, clientY: ev.touches[0].clientY}); }
    }

    function removeEvents(){
      window.removeEventListener('mousemove', onPointerMove as any);
      window.removeEventListener('resize', onWindowResize as any);
      window.removeEventListener('touchmove', touchMoveHandler as any);
      document.removeEventListener('visibilitychange', onVisibility);
    }

    function onVisibility(){
      hidden = document.hidden;
      if(!hidden && pausedForIdle){ clock.start(); }
    }

    // Controls (optional)
  let pane: Pane | undefined;
    const controlsEnabled = enableControls ?? (process.env.NEXT_PUBLIC_METABALL_CONTROLS === '1');
    function initUI(){
      if(!controlsEnabled) return;
  pane = new Pane({ title: 'Metaballs', expanded: false });
  const p: any = pane; // cast for typings
  p.addBinding(settings,'preset',{ options: { Holographic:'holographic', Minimal:'minimal' } }).on('change', (ev: any)=>{ applyPreset(ev.value); });
  p.addBinding(settings,'sphereCount',{ min:1, max:10, step:1 }).on('change', (ev: any)=> material.uniforms.uSphereCount.value = ev.value);
  p.addBinding(settings,'animationSpeed',{ min:0.1,max:3,step:0.1 }).on('change', (ev: any)=> material.uniforms.uAnimationSpeed.value = ev.value);
  p.addBinding(settings,'movementScale',{ min:0.5,max:2,step:0.1 }).on('change', (ev: any)=> material.uniforms.uMovementScale.value = ev.value);
  p.addBinding(settings,'smoothness',{ min:0.1,max:1,step:0.01 }).on('change', (ev: any)=> material.uniforms.uSmoothness.value = ev.value);
    }

    function applyPreset(name: string){
      const p = presets[name]; if(!p) return; settings.preset=name; Object.assign(settings, p);
      material.uniforms.uSphereCount.value = settings.sphereCount;
      material.uniforms.uAmbientIntensity.value = settings.ambientIntensity;
      material.uniforms.uDiffuseIntensity.value = settings.diffuseIntensity;
      material.uniforms.uSpecularIntensity.value = settings.specularIntensity;
      material.uniforms.uSpecularPower.value = settings.specularPower;
      material.uniforms.uFresnelPower.value = settings.fresnelPower;
      material.uniforms.uBackgroundColor.value = settings.backgroundColor;
      material.uniforms.uSphereColor.value = settings.sphereColor;
      material.uniforms.uLightColor.value = settings.lightColor;
      material.uniforms.uLightPosition.value = settings.lightPosition;
      material.uniforms.uSmoothness.value = settings.smoothness;
      material.uniforms.uContrast.value = settings.contrast;
      material.uniforms.uFogDensity.value = settings.fogDensity;
      material.uniforms.uCursorGlowIntensity.value = settings.cursorGlowIntensity;
      material.uniforms.uCursorGlowRadius.value = settings.cursorGlowRadius;
      material.uniforms.uCursorGlowColor.value = settings.cursorGlowColor;
  (pane as any)?.refresh?.();
    }

    init();
    addEvents();
    initUI();

    return () => {
      removeEvents();
      pane?.dispose();
      material.dispose();
      renderer.dispose();
      container.innerHTML='';
    };
  }, [preset, enableControls]);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}

// Fragment shader builder (trimmed to essentials & identical core logic)
function fragmentShaderSource(){
  return `
    ${isMobile || isSafari || isLowPowerDevice ? 'precision mediump float;' : 'precision highp float;'}
    uniform float uTime; uniform vec2 uResolution; uniform vec2 uActualResolution; uniform float uPixelRatio; uniform vec2 uMousePosition; uniform vec3 uCursorSphere; uniform float uCursorRadius; uniform int uSphereCount; uniform float uFixedTopLeftRadius; uniform float uFixedBottomRightRadius; uniform float uSmallTopLeftRadius; uniform float uSmallBottomRightRadius; uniform float uMergeDistance; uniform float uSmoothness; uniform float uAmbientIntensity; uniform float uDiffuseIntensity; uniform float uSpecularIntensity; uniform float uSpecularPower; uniform float uFresnelPower; uniform vec3 uBackgroundColor; uniform vec3 uSphereColor; uniform vec3 uLightColor; uniform vec3 uLightPosition; uniform float uContrast; uniform float uFogDensity; uniform float uAnimationSpeed; uniform float uMovementScale; uniform bool uMouseProximityEffect; uniform float uMinMovementScale; uniform float uMaxMovementScale; uniform float uCursorGlowIntensity; uniform float uCursorGlowRadius; uniform vec3 uCursorGlowColor; uniform float uIsSafari; uniform float uIsMobile; uniform float uIsLowPower; varying vec2 vUv; const float PI=3.14159265359; const float EPS=0.001; float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*0.25; } float sdSphere(vec3 p,float r){ return length(p)-r; } vec3 screenToWorld(vec2 n){ vec2 uv=n*2.-1.; uv.x*=uResolution.x/uResolution.y; return vec3(uv*2.,0.); } float getDistanceToCenter(vec2 pos){ float d=length(pos-vec2(.5,.5))*2.; return smoothstep(0.,1.,d); } float sceneSDF(vec3 pos){ float res=100.; vec3 tl=screenToWorld(vec2(.08,.92)); float topLeft=sdSphere(pos-tl,uFixedTopLeftRadius); vec3 stl=screenToWorld(vec2(.25,.72)); float smallTopLeft=sdSphere(pos-stl,uSmallTopLeftRadius); vec3 br=screenToWorld(vec2(.92,.08)); float bottomRight=sdSphere(pos-br,uFixedBottomRightRadius); vec3 sbr=screenToWorld(vec2(.72,.25)); float smallBottomRight=sdSphere(pos-sbr,uSmallBottomRightRadius); float t=uTime*uAnimationSpeed; float dynMove=uMovementScale; if(uMouseProximityEffect){ float d=getDistanceToCenter(uMousePosition); float mixF=smoothstep(0.,1.,d); dynMove=mix(uMinMovementScale,uMaxMovementScale,mixF);} int maxIter= uIsMobile>0.5?4:(uIsLowPower>0.5?6:min(uSphereCount,10)); for(int i=0;i<10;i++){ if(i>=uSphereCount||i>=maxIter) break; float fi=float(i); float speed=.4+fi*.12; float radius=.12+mod(fi,3.)*.06; float orbit=(.3+mod(fi,3.)*.15)*dynMove; float phase=fi*PI*.35; float distToCursor=length(vec3(0.)-uCursorSphere); float prox=1.+(1.-smoothstep(0.,1.,distToCursor))*0.5; orbit*=prox; vec3 off; if(i==0){ off=vec3(sin(t*speed)*orbit*.7,sin(t*.5)*orbit,cos(t*speed*.7)*orbit*.5);} else if(i==1){ off=vec3(sin(t*speed+PI)*orbit*.5,-sin(t*.5)*orbit,cos(t*speed*.7+PI)*orbit*.5);} else { off=vec3(sin(t*speed+phase)*orbit*.8,cos(t*speed*.85+phase*1.3)*orbit*.6,sin(t*speed*.5+phase)*.3);} vec3 toCursor=uCursorSphere-off; float cDist=length(toCursor); if(cDist<uMergeDistance && cDist>0.){ float attract=(1.-cDist/uMergeDistance)*.3; off+=normalize(toCursor)*attract; } float moving=sdSphere(pos-off,radius); float blend=.05; if(cDist<uMergeDistance){ float influence=1.-(cDist/uMergeDistance); blend=mix(.05,uSmoothness,influence*influence*influence);} res=smin(res,moving,blend);} float cursorBall=sdSphere(pos-uCursorSphere,uCursorRadius); float tlGroup=smin(topLeft,smallTopLeft,.4); float brGroup=smin(bottomRight,smallBottomRight,.4); res=smin(res,tlGroup,.3); res=smin(res,brGroup,.3); res=smin(res,cursorBall,uSmoothness); return res; } vec3 calcNormal(vec3 p){ float eps=uIsLowPower>0.5?0.002:0.001; return normalize(vec3(sceneSDF(p+vec3(eps,0,0))-sceneSDF(p-vec3(eps,0,0)), sceneSDF(p+vec3(0,eps,0))-sceneSDF(p-vec3(0,eps,0)), sceneSDF(p+vec3(0,0,eps))-sceneSDF(p-vec3(0,0,eps)))); } float softShadow(vec3 ro,vec3 rd,float mint,float maxt,float k){ if(uIsLowPower>0.5){ float result=1.; float t=mint; for(int i=0;i<3;i++){ t+=.3; if(t>=maxt) break; float h=sceneSDF(ro+rd*t); if(h<EPS) return 0.; result=min(result,k*h/t);} return result;} float result=1.; float t=mint; for(int i=0;i<20;i++){ if(t>=maxt) break; float h=sceneSDF(ro+rd*t); if(h<EPS) return 0.; result=min(result,k*h/t); t+=h;} return result;} float rayMarch(vec3 ro,vec3 rd){ float t=0.; int maxSteps= uIsMobile>0.5?16:(uIsSafari>0.5?16:48); for(int i=0;i<48;i++){ if(i>=maxSteps) break; vec3 p=ro+rd*t; float d=sceneSDF(p); if(d<EPS) return t; if(t>5.) break; t+=d*(uIsLowPower>0.5?1.2:.9);} return -1.; } vec3 lighting(vec3 p,vec3 rd,float t){ if(t<0.) return vec3(0.); vec3 n=calcNormal(p); vec3 viewDir=-rd; vec3 base=uSphereColor; vec3 lightDir=normalize(uLightPosition); float diff=max(dot(n,lightDir),0.); float shadow=softShadow(p,lightDir,0.01,10.,20.); vec3 diffuse=uLightColor*diff*uDiffuseIntensity*shadow; vec3 refl=reflect(-lightDir,n); float spec=pow(max(dot(viewDir,refl),0.),uSpecularPower); float fres=pow(1.-max(dot(viewDir,n),0.),uFresnelPower); vec3 specCol=uLightColor*spec*uSpecularIntensity*fres; vec3 fresRim=uLightColor*fres*0.4; vec3 color=(base + (uLightColor*uAmbientIntensity) + diffuse + specCol + fresRim); color=pow(color, vec3(uContrast*0.9)); color=color/(color+vec3(0.8)); return color; } float cursorGlow(vec3 pos){ float d=length(pos.xy - uCursorSphere.xy); float g=1.-smoothstep(0.,uCursorGlowRadius,d); return pow(g,2.)*uCursorGlowIntensity; } void main(){ vec2 uv=(gl_FragCoord.xy*2.-uActualResolution.xy)/uActualResolution.xy; uv.x*=uResolution.x/uResolution.y; vec3 ro=vec3(uv*2.,-1.); vec3 rd=vec3(0.,0.,1.); float t=rayMarch(ro,rd); vec3 p=ro+rd*t; vec3 col=lighting(p,rd,t); float glow=cursorGlow(ro); vec3 glowCol=uCursorGlowColor*glow; if(t>0.){ float fog=1.-exp(-t*uFogDensity); col=mix(col,uBackgroundColor,fog*0.3); col+=glowCol*0.3; gl_FragColor=vec4(col,1.0);} else { if(glow>.01) gl_FragColor=vec4(glowCol, glow*0.8); else gl_FragColor=vec4(0.,0.,0.,0.); } }`;
}

export default MetaballBackground;
