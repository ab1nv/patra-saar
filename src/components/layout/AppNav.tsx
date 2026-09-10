import Link from 'next/link'
import { Scale } from 'lucide-react'

export function AppNav() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Scale size={18} className="text-accent" />
          <span className="font-serif text-lg font-semibold">PatraSaar</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/chat"
            className="rounded-md px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            Workspace
          </Link>
          <Link
            href="/migrate"
            className="rounded-md px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            IPC ↔ BNS
          </Link>
          <Link
            href="/coverage"
            className="rounded-md px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            Coverage
          </Link>
        </nav>
      </div>
    </header>
  )
}
