'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>('#');

  // Scroll spy: observe sections if they exist
  useEffect(() => {
    const ids = ['features', 'how-it-works', 'security', 'upload'];
    const elements = ids
      .map(id => ({ id, el: document.getElementById(id) }))
      .filter(x => x.el) as { id: string; el: Element }[];
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActive('#' + entry.target.id);
          }
        });
      },
      {
        rootMargin: '-45% 0px -50% 0px',
        threshold: [0, 0.01, 0.25]
      }
    );
    elements.forEach(({ el }) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="sticky top-0 z-20">
      {/* Glow backdrop */}
        {/* Legal themed gradient backdrop */}
        <div className="absolute inset-0 -z-10 h-16 bg-gradient-to-b from-[var(--brand-bg)]/85 via-[var(--brand-bg)]/60 to-transparent backdrop-blur-xl" />
      <nav aria-label="Global" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Card container */}
        <div className="relative mt-3 mb-3 rounded-2xl border border-white/10 bg-black/35 backdrop-blur-xl backdrop-saturate-200 backdrop-contrast-125 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
          {/* Subtle highlight/inner glow for crisper glass */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 [mask:linear-gradient(to_bottom,rgba(255,255,255,0.65),transparent_70%)]" />
          <div className="relative flex h-14 items-center justify-between px-3 sm:px-4">
            {/* Decorative metaballs */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
                  <div className="absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-gradient-to-tr from-indigo-700/25 via-slate-600/10 to-[var(--brand-gold)]/15 blur-2xl animate-float-slow" />
                  <div className="absolute right-0 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-[var(--brand-gold)]/25 via-teal-500/15 to-indigo-700/25 blur-xl animate-float-medium" />
            </div>

            {/* Left: brand */}
            <div className="flex items-center gap-2">
              <Link href="/" className="group inline-flex items-center gap-2">
                <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 ring-1 ring-inset ring-white/10">
                  <Image src="/assets/logo.png" alt="PatraSaar logo" width={20} height={20} className="h-5 w-5 opacity-90" />
                      <span className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[var(--brand-gold)]/0 via-[var(--brand-gold)]/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                    <span className="text-sm font-semibold tracking-wide text-[var(--brand-ink)]">PatraSaar</span>
              </Link>
            </div>

            {/* Center: links (desktop) */}
            <div className="hidden md:flex items-center gap-1">
                  <NavLink href="#features" label="Features" active={active === '#features'} />
                  <NavLink href="#how-it-works" label="Process" active={active === '#how-it-works'} />
                  <NavLink href="#security" label="Security" active={active === '#security'} />
                  <NavLink href="#compliance" label="Compliance" active={active === '#compliance'} />
              <NavLink href="https://github.com/adimukh1234/patra-saar" label="GitHub" external />
            </div>

            {/* Right: CTA and menu */}
            <div className="flex items-center gap-2">
                  <Link href="#upload" className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-[var(--brand-ink)] shadow-md shadow-black/30 backdrop-blur-md transition hover:border-[var(--brand-gold)]/60 hover:bg-[var(--brand-gold)]/15 hover:text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-gold)] shadow-[0_0_0_3px_rgba(var(--brand-gold-rgb)/0.25)]" />
                    Upload
                  </Link>

              {/* Mobile menu button */}
              <button
                aria-label="Toggle menu"
                aria-expanded={open}
                aria-controls="mobile-menu"
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                onClick={() => setOpen((v) => !v)}
              >
                <div className="relative h-4 w-4">
                  <span className={`absolute left-0 top-0 h-0.5 w-4 bg-white transition-transform ${open ? 'translate-y-1.5 rotate-45' : ''}`} />
                  <span className={`absolute left-0 top-1.5 h-0.5 w-4 bg-white transition-opacity ${open ? 'opacity-0' : 'opacity-100'}`} />
                  <span className={`absolute left-0 top-3 h-0.5 w-4 bg-white transition-transform ${open ? '-translate-y-1.5 -rotate-45' : ''}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile panel */}
          {open && (
            <div id="mobile-menu" className="md:hidden border-t border-white/10 px-3 pb-3">
              <div className="mt-2 grid gap-1">
                    <MobileLink href="#features" label="Features" active={active === '#features'} onClick={() => setOpen(false)} />
                    <MobileLink href="#how-it-works" label="Process" active={active === '#how-it-works'} onClick={() => setOpen(false)} />
                    <MobileLink href="#security" label="Security" active={active === '#security'} onClick={() => setOpen(false)} />
                    <MobileLink href="#compliance" label="Compliance" active={active === '#compliance'} onClick={() => setOpen(false)} />
                <MobileLink href="https://github.com/adimukh1234/patra-saar" label="GitHub" external onClick={() => setOpen(false)} />
                <Link href="#upload" onClick={() => setOpen(false)} className="mt-1 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white">
                  Upload document
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
interface NavBaseProps { href: string; label: string; external?: boolean; active?: boolean; onClick?: () => void; }

function NavLink({ href, label, external, active }: NavBaseProps) {
  const props = external ? { target: '_blank', rel: 'noreferrer' } : {};
  return (
    <Link
      href={href}
      {...props}
      aria-current={active ? 'page' : undefined}
      className={`relative inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/60
        ${active ? 'text-[var(--brand-ink)] bg-white/10' : 'text-[var(--brand-ink-muted)] hover:text-[var(--brand-ink)] hover:bg-white/5'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full transition ${active ? 'bg-[var(--brand-gold)] shadow-[0_0_0_3px_rgba(var(--brand-gold-rgb)/0.25)]' : 'bg-white/25'}`} />
      {label}
      {active && (
        <span className="absolute inset-x-2 -bottom-1 h-px bg-gradient-to-r from-transparent via-[var(--brand-gold)]/70 to-transparent" />
      )}
    </Link>
  );
}

function MobileLink({ href, label, external, onClick, active }: NavBaseProps) {
  const props = external ? { target: '_blank', rel: 'noreferrer' } : {};
  return (
    <Link
      href={href}
      {...props}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition
        ${active ? 'text-[var(--brand-ink)] bg-white/10' : 'text-[var(--brand-ink)]/80 hover:text-[var(--brand-ink)] hover:bg-white/5'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[var(--brand-gold)]' : 'bg-white/25'}`} />
      {label}
    </Link>
  );
}
