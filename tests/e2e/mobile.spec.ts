import { test, expect } from '@playwright/test'
import { sse, CHAT_ANSWER } from './fixtures'
import { gotoHydrated, sendMessage } from './helpers'

test.describe('Mobile experience', () => {
  test('landing page is readable and routes to login', async ({ page }) => {
    await gotoHydrated(page, '/')
    await expect(page.getByRole('heading', { name: /It cites the law/i })).toBeVisible()
    await page
      .getByRole('link', { name: /Open workspace/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('audit page renders on a phone viewport', async ({ page }) => {
    await gotoHydrated(page, '/audit')
    await expect(page.getByRole('heading', { name: /same model/i })).toBeVisible()
  })

  test('sidebar is a drawer and chat still works', async ({ page }) => {
    await gotoHydrated(page, '/login')
    await page.fill('#email', 'abhinav@test.com')
    await page.fill('#password', 'abhinav')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/chat/, { timeout: 30_000 })
    await page.waitForSelector('html[data-hydrated="1"]')

    // Sidebar is off-canvas until the hamburger opens it.
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('button', { name: /New inquiry/i })).toBeVisible()
    await page.getByRole('button', { name: 'Close sidebar' }).click()

    await page.route('**/api/chat', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: sse([
          { ...CHAT_ANSWER.meta, caseId: 'mobile-case' },
          { type: 'token', value: 'Murder is punishable under the BNS. ' },
          CHAT_ANSWER.citations,
          CHAT_ANSWER.title,
          { ...CHAT_ANSWER.done, caseId: 'mobile-case' },
        ]),
      }),
    )
    await sendMessage(page, 'What is the punishment for murder under the BNS?')
    await expect(page.getByText('✓ 1 verified')).toBeVisible()
  })
})
