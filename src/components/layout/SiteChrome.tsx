import Link from 'next/link'
import Image from 'next/image'

const REPO_URL = 'https://github.com/ab1nv/patra-saar'

function GithubMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

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
            href="/chat"
            className="rounded-control bg-accent px-4 py-2 font-semibold text-background transition-all hover:bg-accent-strong active:scale-[.98]"
          >
            Try the demo
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
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="PatraSaar" width={26} height={26} />
            <span className="font-serif text-lg font-semibold">PatraSaar</span>
          </Link>

          <div className="flex flex-col gap-2 text-xs text-faint sm:items-end">
            <p>
              © 2026 Abhinav Singh. Released under the{' '}
              <a
                href={`${REPO_URL}/blob/master/LICENSE`}
                target="_blank"
                rel="noreferrer"
                className="text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                MIT License
              </a>
              .
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-foreground"
            >
              <GithubMark size={13} /> github.com/ab1nv/patra-saar
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
