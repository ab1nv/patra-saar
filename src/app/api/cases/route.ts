import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { createCase, listCases } from '@/lib/db/store'
import { BadRequest, Unauthorized, handleError } from '@/lib/api/respond'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) throw new Unauthorized()
    const cases = await listCases(session.sub)
    return NextResponse.json({ cases })
  } catch (err) {
    return handleError(err)
  }
}

const schema = z.object({ title: z.string().min(1).max(120) })

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) throw new Unauthorized()
    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new BadRequest('A title is required')
    const created = await createCase(session.sub, parsed.data.title)
    return NextResponse.json({ case: created }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}
