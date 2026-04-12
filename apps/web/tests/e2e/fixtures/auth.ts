import { Page, BrowserContext } from '@playwright/test'

/**
 * Injects a mock session cookie so tests bypass the SvelteKit auth guard.
 * The guard in +layout.server.ts reads `patrasaar_token` from cookies.
 */
export async function mockAuthSession(context: BrowserContext) {
  await context.addCookies([
    {
      name: 'patrasaar_token',
      value: 'mock-jwt-token',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])
}

export async function clearAuthSession(page: Page) {
  await page.context().clearCookies()
}
