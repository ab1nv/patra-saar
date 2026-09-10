import { redirect } from 'next/navigation'
import { ChatWorkspace } from '@/components/chat/ChatWorkspace'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const session = await getSession()
  if (!session) redirect('/login?next=/chat')
  return <ChatWorkspace initialCaseId={null} email={session.email} />
}
