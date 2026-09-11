import Link from 'next/link'
import Image from 'next/image'
import { LoginForm } from '@/components/auth/LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const target = next && next.startsWith('/') ? next : '/chat'

  return (
    <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Image src="/logo.png" alt="PatraSaar" width={32} height={32} priority />
          <span className="font-serif text-2xl font-semibold">PatraSaar</span>
        </Link>

        <div className="rounded-card border border-border bg-surface p-6 shadow-lift sm:p-7">
          <h1 className="font-serif text-xl font-semibold">Sign in</h1>
          <p className="mb-6 mt-1 text-xs text-muted">
            Every answer is grounded in the indexed bare acts.
          </p>
          <LoginForm next={target} />
        </div>

        <p className="mt-4 text-center text-[11px] text-faint">
          Demo credentials: <span className="text-muted">abhinav@test.com</span> /{' '}
          <span className="text-muted">abhinav</span>
        </p>
      </div>
    </main>
  )
}
