import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { AppNav } from '@/components/layout/AppNav'
import { MigrateTool } from '@/components/migrate/MigrateTool'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'PatraSaar — IPC to BNS mapper',
}

export default async function MigratePage() {
  const session = await getSession()
  if (!session) redirect('/login?next=/migrate')
  return (
    <div className="min-h-screen">
      <AppNav />
      <MigrateTool />
    </div>
  )
}
