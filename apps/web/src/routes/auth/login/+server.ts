import { redirect, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/public'

export const GET: RequestHandler = async ({ url, cookies }) => {
  const next = url.searchParams.get('next') ?? '/dashboard'

  // Exchange code for JWT via the API directly
  const apiUrl = env.PUBLIC_API_URL ?? 'http://127.0.0.1:8787'
  const callbackUrl = `${url.origin}/auth/callback`

  const response = await fetch(`${apiUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'dummy_code', redirect_uri: callbackUrl }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw error(502, (body as { error?: string }).error ?? 'Authentication failed')
  }

  const { token } = await response.json<{ token: string }>()

  cookies.set('patrasaar_token', token, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  throw redirect(302, next)
}
