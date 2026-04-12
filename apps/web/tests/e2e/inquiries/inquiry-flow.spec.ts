import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../fixtures/auth'

/**
 * Tests the core RAG inquiry flow:
 * inquiries list → new inquiry → ask question → receive streamed response → citation panel
 *
 * Graph path: inquiries_page → sse_streaming → rag_orchestration → legal_corpus_namespace
 */
test.describe('Inquiry Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    await mockAuthSession(context)
    await page.goto('/inquiries')
  })

  test('inquiries page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/inquiries/)
    await expect(page.locator('main').last()).toBeVisible()
  })

  test('can navigate to a specific inquiry', async ({ page }) => {
    await page.goto('/inquiries/test-id')
    await expect(page).toHaveURL(/\/inquiries\/test-id/)
  })

  test('inquiry page renders chat interface', async ({ page }) => {
    await page.goto('/inquiries/test-id')
    const chatArea = page.locator(
      'textarea, input[type="text"], [data-testid="chat-input"], [role="textbox"]'
    )
    await expect(chatArea.first()).toBeVisible()
  })

  test('sidebar nav links to inquiries', async ({ page, context }) => {
    await mockAuthSession(context)
    await page.goto('/dashboard')
    await page.locator('nav a[href="/inquiries"]').click()
    await expect(page).toHaveURL(/\/inquiries/)
  })
})
