import Link from 'next/link'
import { Scale } from 'lucide-react'
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
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Scale size={20} className="text-accent" />
          <span className="font-serif text-2xl font-semibold">PatraSaar</span>
        </Link>

        <div className="rounded-card border border-border bg-surface p-7">
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
