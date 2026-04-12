import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const token = cookies.get('patrasaar_token')

  if (!token) {
    throw redirect(302, `/?next=${encodeURIComponent(url.pathname)}`)
  }

  return {}
}
