import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/public'

export const GET: RequestHandler = async ({ url, cookies }) => {
  const next = url.searchParams.get('next') ?? '/dashboard'

  // CSRF protection — random state ties the callback back to this request
  const state = crypto.randomUUID()
  cookies.set('oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  })
  cookies.set('oauth_next', next, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 60 * 10,
  })

  // Dummy login: redirect to callback directly with a dummy code
  const callbackUrl = `${url.origin}/auth/callback?code=dummy_code&state=${state}`
  throw redirect(302, callbackUrl)
}
