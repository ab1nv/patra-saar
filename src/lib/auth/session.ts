import { cookies } from 'next/headers'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
  type SessionPayload,
} from './jwt'

export { SESSION_COOKIE, createSessionToken } from './jwt'
export type { SessionPayload } from './jwt'

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
}

/** Reads and verifies the session cookie in a Server Component / Route Handler. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}
