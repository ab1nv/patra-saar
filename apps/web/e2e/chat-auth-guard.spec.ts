import { test, expect } from '@playwright/test'

/**
 * Chat page auth-guard tests.
 *
 * The chat layout fetches /api/chats on mount (via http://localhost:8787).
 * When the API returns a non-200, the layout calls router.push('/login').
 * We intercept the cross-origin API call using Playwright route interception.
 *
 * NOTE: The API base URL is http://localhost:8787 (Cloudflare Workers dev server).
 * The pattern 'http://localhost:8787/api/chats' is used for exact matching.
 */

const API_CHATS = 'http://localhost:8787/api/chats'
const API_CATEGORIES = 'http://localhost:8787/api/categories'

function mockChatsRoute(
  page: import('@playwright/test').Page,
  status: number,
  body: object,
) {
  return page.route(API_CHATS, (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    }),
  )
}

function mockCategoriesRoute(page: import('@playwright/test').Page) {
  return page.route(API_CATEGORIES, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    }),
  )
}

test.describe('Chat Page — Auth Guard', () => {
  test('unauthenticated user can access /chat in test mode (no redirect)', async ({ page }) => {
    // In test mode, the API uses optionalAuth which assigns a test user ID
    // instead of returning 401. The layout silently handles any API errors
    // and stays on the chat page. Simulate the API returning 401 to confirm
    // no redirect still occurs — the error is caught and swallowed.
    await mockChatsRoute(page, 401, { error: { message: 'Unauthorized' } })

    await page.goto('/chat')
    // Should NOT redirect — stay on /chat
    await expect(page).toHaveURL('/chat', { timeout: 8000 })
    // Page chrome (header logo) should be visible
    await expect(page.getByText('PatraSaar').first()).toBeVisible()
  })

  test('unauthenticated user accessing /chat/:id loads page in test mode', async ({ page }) => {
    // Same test-mode behaviour: API errors are swallowed, no redirect to /login
    await mockChatsRoute(page, 401, { error: { message: 'Unauthorized' } })

    await page.goto('/chat/some-fake-id')
    // Should remain on the chat/:id route, not be pushed to /login
    await expect(page).not.toHaveURL('/login', { timeout: 8000 })
    await expect(page.getByText('PatraSaar').first()).toBeVisible()
  })

  test('authenticated user sees chat UI on /chat', async ({ page }) => {
    // Mock successful /api/chats response — empty chat list
    await mockChatsRoute(page, 200, { data: [] })
    await mockCategoriesRoute(page)

    await page.goto('/chat')
    // Should NOT redirect — stay on /chat
    await expect(page).toHaveURL('/chat')
    // Sidebar logo should be visible
    await expect(page.getByText('PatraSaar').first()).toBeVisible()
  })

  test('authenticated user sees chat sidebar with "New chat" button', async ({ page }) => {
    await mockChatsRoute(page, 200, { data: [] })
    await mockCategoriesRoute(page)

    await page.goto('/chat')
    await expect(page).toHaveURL('/chat')
    // New chat button (aria-label="New chat")
    await expect(page.getByRole('button', { name: /New chat/i })).toBeVisible()
  })

  test('authenticated user sees "No chats yet" empty state in sidebar', async ({ page }) => {
    await mockChatsRoute(page, 200, { data: [] })
    await mockCategoriesRoute(page)

    await page.goto('/chat')
    await expect(page.getByText(/No chats yet/i)).toBeVisible()
  })

  test('authenticated user sees existing chats in sidebar', async ({ page }) => {
    const mockChats = [
      { id: 'chat-1', title: 'IPC Section 420 Query', updated_at: new Date().toISOString() },
      { id: 'chat-2', title: 'Employment Contract Review', updated_at: new Date().toISOString() },
    ]

    await mockChatsRoute(page, 200, { data: mockChats })
    await mockCategoriesRoute(page)

    await page.goto('/chat')
    await expect(page.getByText('IPC Section 420 Query')).toBeVisible()
    await expect(page.getByText('Employment Contract Review')).toBeVisible()
  })
})
