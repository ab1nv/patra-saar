import Link from 'next/link'
import Image from 'next/image'

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt="PatraSaar"
        width={size}
        height={size}
        className="transition-transform duration-300 group-hover:scale-105"
        priority
      />
      <span className="font-serif text-xl font-semibold tracking-tight">PatraSaar</span>
    </Link>
  )
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/#audit"
            className="rounded-control px-3 py-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            Audit
          </Link>
          <Link
            href="/chat"
            className="rounded-control bg-accent px-4 py-2 font-semibold text-background transition-all hover:bg-accent-strong active:scale-[.98]"
          >
            Open workspace
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
        <p className="rounded-card border border-warning/25 bg-warning-soft p-4 text-xs leading-relaxed text-warning">
          PatraSaar provides information about statutory text. It is not legal advice and does not
          create a lawyer–client relationship. Verify all provisions against the official bare act
          before relying on them.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <span className="font-serif text-sm text-muted">PatraSaar</span>
          <span>Built for Indian statutory research across the IPC → BNS transition.</span>
        </div>
      </div>
    </footer>
  )
}
