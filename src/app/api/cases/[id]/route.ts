import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { deleteCase, getCase, getCaseMessages, updateCase } from '@/lib/db/store'
import { BadRequest, NotFound, Unauthorized, handleError } from '@/lib/api/respond'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await getSession()
    if (!session) throw new Unauthorized()
    const { id } = await params
    const found = await getCase(session.sub, id)
    if (!found) throw new NotFound('Case not found')
    const messages = await getCaseMessages(id)
    return NextResponse.json({ case: found, messages })
  } catch (err) {
    return handleError(err)
  }
}

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  pinned: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await getSession()
    if (!session) throw new Unauthorized()
    const { id } = await params
    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) throw new BadRequest('Nothing to update')
    const updated = await updateCase(session.sub, id, parsed.data)
    if (!updated) throw new NotFound('Case not found')
    return NextResponse.json({ case: updated })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await getSession()
    if (!session) throw new Unauthorized()
    const { id } = await params
    const deleted = await deleteCase(session.sub, id)
    if (!deleted) throw new NotFound('Case not found')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}
