import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/public'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = ['openid', 'email', 'profile'].join(' ')

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

  const callbackUrl = `${url.origin}/auth/callback`

  const params = new URLSearchParams({
    client_id: env.PUBLIC_GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: SCOPES,
    state,
    access_type: 'online',
    prompt: 'select_account',
  })

  throw redirect(302, `${GOOGLE_AUTH_URL}?${params}`)
}
