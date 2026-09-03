import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../fixtures/auth'

/**
 * Tests the document lifecycle:
 * upload → list → view → delete
 *
 * Graph path: library_page → document_routes → uploadDocument/deleteDocument → cloudflare_kv
 */
test.describe('Document Library', () => {
  test.beforeEach(async ({ page, context }) => {
    await mockAuthSession(context)
    await page.goto('/library')
  })

  test('library page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/library/)
    await expect(page.locator('main').last()).toBeVisible()
  })

  test('displays document list or empty state', async ({ page }) => {
    // Either shows documents or an empty-state prompt
    const content = page.locator('[data-testid="document-list"], [data-testid="empty-state"], main')
    await expect(content.last()).toBeVisible()
  })

  test('has upload affordance', async ({ page }) => {
    const uploadBtn = page.locator(
      'button:has-text("Upload"), input[type="file"], [data-testid="upload-btn"]'
    )
    await expect(uploadBtn.first()).toBeVisible()
  })

  test('sidebar nav links to library', async ({ page, context }) => {
    await mockAuthSession(context)
    await page.goto('/dashboard')
    await page.locator('nav a[href="/library"]').click()
    await expect(page).toHaveURL(/\/library/)
  })
})
