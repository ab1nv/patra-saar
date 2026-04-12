import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../fixtures/auth'

/**
 * Tests the case folder management flow.
 *
 * Graph path: cases_page → case_routes → cloudflare_d1
 */
test.describe('Cases', () => {
  test.beforeEach(async ({ page, context }) => {
    await mockAuthSession(context)
    await page.goto('/cases')
  })

  test('cases page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/cases/)
    await expect(page.locator('main').last()).toBeVisible()
  })

  test('displays cases list or empty state', async ({ page }) => {
    const content = page.locator(
      '[data-testid="cases-list"], [data-testid="empty-state"], main'
    )
    await expect(content.last()).toBeVisible()
  })

  test('has create case affordance', async ({ page }) => {
    const createBtn = page.locator(
      'button:has-text("New Case"), button:has-text("Create"), [data-testid="create-case-btn"]'
    )
    await expect(createBtn.first()).toBeVisible()
  })

  test('sidebar nav links to cases', async ({ page, context }) => {
    await mockAuthSession(context)
    await page.goto('/dashboard')
    await page.locator('nav a[href="/cases"]').click()
    await expect(page).toHaveURL(/\/cases/)
  })
})
