import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getSectionByActNumber } from '@/lib/corpus/index'
import { NotFound, Unauthorized, handleError } from '@/lib/api/respond'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ act: string; num: string }> }

/** Full verbatim section text for the citation drawer. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await getSession()
    if (!session) throw new Unauthorized()
    const { act, num } = await params
    const section = getSectionByActNumber(decodeURIComponent(act), decodeURIComponent(num))
    if (!section) throw new NotFound('Section not found in corpus')
    return NextResponse.json({ section })
  } catch (err) {
    return handleError(err)
  }
}
