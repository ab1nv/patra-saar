import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { Unauthorized, handleError } from '@/lib/api/respond'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) throw new Unauthorized()
    return NextResponse.json({ user: { id: session.sub, email: session.email } })
  } catch (err) {
    return handleError(err)
  }
}
