import { redirect, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/public'

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')

  // User denied OAuth consent
  if (errorParam) {
    throw redirect(302, `/?error=${encodeURIComponent(errorParam)}`)
  }

  if (!code || !state) {
    throw error(400, 'Missing OAuth code or state')
  }

  // Validate CSRF state
  const savedState = cookies.get('oauth_state')
  if (!savedState || savedState !== state) {
    throw error(403, 'Invalid OAuth state — possible CSRF attack')
  }

  const next = cookies.get('oauth_next') ?? '/dashboard'

  // Clear one-time OAuth cookies
  cookies.delete('oauth_state', { path: '/' })
  cookies.delete('oauth_next', { path: '/' })

  // Exchange code for JWT via the API
  const apiUrl = env.PUBLIC_API_URL ?? 'http://127.0.0.1:8787'
  const callbackUrl = `${url.origin}/auth/callback`

  const response = await fetch(`${apiUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: callbackUrl }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw error(502, (body as { error?: string }).error ?? 'Authentication failed')
  }

  const { token } = await response.json<{ token: string }>()

  // Set the session cookie — same name the auth guard + middleware read
  cookies.set('patrasaar_token', token, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  throw redirect(302, next)
}
