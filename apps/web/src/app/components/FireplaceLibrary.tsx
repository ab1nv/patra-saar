'use client'

import { useState, useEffect, useCallback } from 'react'

/* ───────────────── rotating law terms ───────────────── */
const LAW_TERMS = [
  'Habeas Corpus',
  'FIR',
  'Bail',
  'Affidavit',
  'Summons',
  'Writ Petition',
  'Injunction',
  'Caveat',
  'Decree',
  'Tort',
  'Lien',
  'Estoppel',
]

/* ───────────────── component ───────────────── */
export default function FireplaceLibrary() {
  const [termIdx, setTermIdx] = useState(0)
  const [scrollOpen, setScrollOpen] = useState(false)
  const [termFading, setTermFading] = useState(false)

  // rotate terms every 10s
  useEffect(() => {
    const id = setInterval(() => {
      setTermFading(true)
      setTimeout(() => {
        setTermIdx((i) => (i + 1) % LAW_TERMS.length)
        setTermFading(false)
      }, 400)
    }, 10_000)
    return () => clearInterval(id)
  }, [])

  const openScroll = useCallback(() => setScrollOpen(true), [])
  const closeScroll = useCallback(() => setScrollOpen(false), [])

  return (
    <>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
        {/* Base illustration */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustration.svg"
          alt="Cozy library with fireplace and reading penguin"
          style={{ width: '100%', height: 'auto', display: 'block' }}
          draggable={false}
        />

        {/* ── Flame overlay (positioned over the fireplace area) ── */}
        <div
          style={{
            position: 'absolute',
            bottom: '18%',
            left: '38%',
            width: '24%',
            height: '18%',
            pointerEvents: 'none',
          }}
        >
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            {/* main flame */}
            <ellipse cx="50" cy="80" rx="28" ry="10" fill="rgba(255,120,30,0.2)">
              <animate attributeName="rx" values="28;32;26;30;28" dur="2s" repeatCount="indefinite" />
            </ellipse>

            <path d="M50 15 C55 40, 75 55, 70 75 C65 90, 35 90, 30 75 C25 55, 45 40, 50 15Z" fill="url(#flameGrad)" opacity="0.85">
              <animate attributeName="d"
                values="M50 15 C55 40, 75 55, 70 75 C65 90, 35 90, 30 75 C25 55, 45 40, 50 15Z;
                        M50 20 C58 38, 78 52, 72 73 C66 88, 34 88, 28 73 C22 52, 42 38, 50 20Z;
                        M50 12 C52 42, 72 58, 68 76 C64 92, 36 92, 32 76 C28 58, 48 42, 50 12Z;
                        M50 15 C55 40, 75 55, 70 75 C65 90, 35 90, 30 75 C25 55, 45 40, 50 15Z"
                dur="1.8s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="scale" values="1 1;1.03 0.97;0.97 1.03;1 1" dur="2.2s" repeatCount="indefinite" />
            </path>

            {/* inner flame */}
            <path d="M50 35 C53 50, 62 60, 60 72 C58 80, 42 80, 40 72 C38 60, 47 50, 50 35Z" fill="url(#flameInner)" opacity="0.9">
              <animate attributeName="d"
                values="M50 35 C53 50, 62 60, 60 72 C58 80, 42 80, 40 72 C38 60, 47 50, 50 35Z;
                        M50 38 C55 48, 64 58, 62 70 C60 78, 40 78, 38 70 C36 58, 45 48, 50 38Z;
                        M50 32 C52 52, 60 62, 58 74 C56 82, 44 82, 42 74 C40 62, 48 52, 50 32Z;
                        M50 35 C53 50, 62 60, 60 72 C58 80, 42 80, 40 72 C38 60, 47 50, 50 35Z"
                dur="1.5s" repeatCount="indefinite" />
            </path>

            {/* sparks */}
            <circle cx="42" cy="30" r="1.5" fill="#FFD700" opacity="0">
              <animate attributeName="cy" values="30;5" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.9;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="58" cy="28" r="1" fill="#FF8C00" opacity="0">
              <animate attributeName="cy" values="28;2" dur="2.2s" repeatCount="indefinite" begin="0.5s" />
              <animate attributeName="opacity" values="0;0.8;0" dur="2.2s" repeatCount="indefinite" begin="0.5s" />
            </circle>
            <circle cx="50" cy="25" r="1.2" fill="#FFAA33" opacity="0">
              <animate attributeName="cy" values="25;0" dur="2s" repeatCount="indefinite" begin="1s" />
              <animate attributeName="opacity" values="0;0.7;0" dur="2s" repeatCount="indefinite" begin="1s" />
            </circle>

            <defs>
              <radialGradient id="flameGrad" cx="50%" cy="80%" r="60%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="40%" stopColor="#FF8C00" />
                <stop offset="100%" stopColor="#C44800" stopOpacity="0.3" />
              </radialGradient>
              <radialGradient id="flameInner" cx="50%" cy="70%" r="50%">
                <stop offset="0%" stopColor="#FFFBE0" />
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FF8C00" stopOpacity="0.5" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* ── Flickering fireplace light glow ── */}
        <div
          className="fireplace-glow"
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '30%',
            width: '40%',
            height: '30%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,140,40,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
            filter: 'blur(20px)',
          }}
        />

        {/* ── Speech bubble with rotating law terms ── */}
        <div
          style={{
            position: 'absolute',
            top: '12%',
            right: '5%',
            pointerEvents: 'none',
          }}
        >
          <svg width="110" height="52" viewBox="0 0 110 52">
            {/* bubble */}
            <rect x="2" y="2" width="106" height="38" rx="10" ry="10"
              fill="rgba(30,25,20,0.85)" stroke="rgba(196,133,72,0.4)" strokeWidth="1.5" />
            {/* tail */}
            <polygon points="20,40 30,40 22,50" fill="rgba(30,25,20,0.85)" />
            <text
              x="55" y="26"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#d4a853"
              fontFamily="var(--font-mono, monospace)"
              fontSize="11"
              fontWeight="600"
              style={{
                opacity: termFading ? 0 : 1,
                transition: 'opacity 0.4s ease',
              }}
            >
              {LAW_TERMS[termIdx]}
            </text>
          </svg>
        </div>

        {/* ── Glowing book ── */}
        <button
          onClick={openScroll}
          aria-label="Open ancient scroll"
          style={{
            position: 'absolute',
            top: '28%',
            left: '12%',
            width: 28,
            height: 36,
            padding: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg viewBox="0 0 28 36" style={{ width: '100%', height: '100%' }}>
            {/* book shape */}
            <rect x="4" y="2" width="20" height="32" rx="2" fill="#6B3A2A" stroke="#8B6914" strokeWidth="0.8" />
            <rect x="6" y="4" width="16" height="28" rx="1" fill="#7B4A3A" />
            {/* title lines */}
            <line x1="9" y1="10" x2="19" y2="10" stroke="#d4a853" strokeWidth="1" opacity="0.6" />
            <line x1="10" y1="14" x2="18" y2="14" stroke="#d4a853" strokeWidth="0.7" opacity="0.4" />
            {/* circular glow */}
            <circle cx="14" cy="18" r="16" fill="none" stroke="rgba(212,168,83,0.5)" strokeWidth="1.5">
              <animate attributeName="r" values="14;17;14" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="14" cy="18" r="12" fill="rgba(212,168,83,0.08)">
              <animate attributeName="r" values="10;14;10" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.1;0.2;0.1" dur="3s" repeatCount="indefinite" />
            </circle>
          </svg>
        </button>
      </div>

      {/* ── CSS for flickering glow ── */}
      <style>{`
        .fireplace-glow {
          animation: flicker 4s ease-in-out infinite;
        }
        @keyframes flicker {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          10% { opacity: 0.5; }
          20% { opacity: 0.8; transform: scale(1.02); }
          30% { opacity: 0.6; }
          50% { opacity: 0.9; transform: scale(1.04); }
          60% { opacity: 0.55; }
          70% { opacity: 0.85; transform: scale(0.98); }
          80% { opacity: 0.6; }
          90% { opacity: 0.75; transform: scale(1.01); }
        }
      `}</style>

      {/* ── Ancient Scroll Modal ── */}
      {scrollOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ancient scroll"
          onClick={closeScroll}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: 560,
              maxHeight: '85vh',
              overflowY: 'auto',
              borderRadius: 12,
              padding: '2.5rem 2rem',
              background: `
                linear-gradient(135deg, #3b2a1a 0%, #2a1e14 30%, #1e150e 100%)
              `,
              border: '2px solid rgba(168,120,60,0.4)',
              boxShadow: '0 0 60px rgba(168,120,60,0.15), inset 0 0 40px rgba(0,0,0,0.3)',
              animation: 'scrollUnroll 0.5s ease',
            }}
          >
            {/* Close button */}
            <button
              onClick={closeScroll}
              aria-label="Close scroll"
              style={{
                position: 'sticky',
                top: 0,
                float: 'right',
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid rgba(168,120,60,0.4)',
                background: 'rgba(30,20,14,0.9)',
                color: '#d4a853',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              ✕
            </button>

            {/* Scroll header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📜</div>
              <h2
                style={{
                  fontFamily: 'var(--font-heading, Georgia, serif)',
                  fontSize: '1.4rem',
                  color: '#d4a853',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Ancient Legal Scroll
              </h2>
              <div
                style={{
                  width: 80,
                  height: 2,
                  margin: '0 auto',
                  background: 'linear-gradient(90deg, transparent, #d4a853, transparent)',
                }}
              />
            </div>

            {/* Scroll body — lorem ipsum */}
            <div
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '0.92rem',
                lineHeight: 1.85,
                color: '#c4a878',
                textAlign: 'justify',
              }}
            >
              <p style={{ marginBottom: '1rem', textIndent: '1.5rem' }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vitae
                juris prudentia antiqua. In foro Romano, leges et constitutiones
                populi Romani fundamentum iustitiae posuerunt. Praetores edicta
                sua proposuerunt ut ius civile temperarent et aequitatem
                praestarent.
              </p>
              <p style={{ marginBottom: '1rem', textIndent: '1.5rem' }}>
                Corpus Iuris Civilis, a Iustiniano imperatore compositum, totius
                iuris Romani thesaurum continet. Digestae, Institutiones, Codex,
                et Novellae omnem sapientiam iuris antiqui in unum corpus
                collegerunt. Quod opus per saecula multis gentibus legem dedit.
              </p>
              <p style={{ marginBottom: '1rem', textIndent: '1.5rem' }}>
                Lex duodecim tabularum, prima Romanorum lex scripta, civibus
                omnibus nota erat. Haec tabulae in foro expositae, ut nemo
                ignorantiam legis praetendere posset. Sic ius publicum et ius
                privatum distincta sunt, et fundamenta rei publicae Romanae iecta.
              </p>
              <p style={{ textIndent: '1.5rem' }}>
                Advocati et iuris consulti in basilica sedentes, causas
                audiebant et responsa dabant. Contractus, testamenta, et
                obligationes omnes sub lege fiebant. Nulla res sine iure, nullum
                ius sine ratione. Finis coronat opus. ⚖️
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scrollUnroll {
          from { opacity: 0; transform: scaleY(0.3) translateY(-40px); }
          to { opacity: 1; transform: scaleY(1) translateY(0); }
        }
      `}</style>
    </>
  )
}
