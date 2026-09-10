import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyPassword } from '@/lib/auth/password'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session'
import { findUserByEmail } from '@/lib/db/store'
import { BadRequest, Unauthorized, handleError } from '@/lib/api/respond'

export const runtime = 'nodejs'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new BadRequest('Email and password are required')

    const { email, password } = parsed.data
    const user = await findUserByEmail(email)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new Unauthorized('Invalid email or password')
    }

    const token = await createSessionToken({ sub: user.id, email: user.email })
    const res = NextResponse.json({ user: { id: user.id, email: user.email } })
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
    return res
  } catch (err) {
    return handleError(err)
  }
}
