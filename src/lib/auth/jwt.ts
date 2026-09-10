import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'ps_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export type SessionPayload = {
  sub: string
  email: string
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (typeof payload.sub !== 'string') return null
    return { sub: payload.sub, email: String(payload.email ?? '') }
  } catch {
    return null
  }
}
