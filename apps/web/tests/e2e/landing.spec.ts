import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('renders title and hero', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/PatraSaar/)
    await expect(page.locator('main')).toBeVisible()
  })

  test('has Google sign-in entry point linking to /auth/login', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('a[href="/auth/login"]')
    await expect(cta).toBeVisible()
  })

  test('/auth/login redirects to Google OAuth', async ({ page }) => {
    // Should redirect to Google — we verify the redirect happens, not the full OAuth flow
    await page.goto('/auth/login')
    await expect(page).toHaveURL(/accounts\.google\.com/)
  })
})
