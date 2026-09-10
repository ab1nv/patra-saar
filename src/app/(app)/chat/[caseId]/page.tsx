import { redirect } from 'next/navigation'
import { ChatWorkspace } from '@/components/chat/ChatWorkspace'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function ChatCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const session = await getSession()
  const { caseId } = await params
  if (!session) redirect(`/login?next=/chat/${caseId}`)
  return <ChatWorkspace initialCaseId={caseId} email={session.email} />
}
