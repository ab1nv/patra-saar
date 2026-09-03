import { test, expect } from '@playwright/test'
import { mockAuthSession } from '../fixtures/auth'

test.describe('Auth Guard', () => {
  test('redirects unauthenticated user away from protected routes', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).not.toHaveURL(/\/dashboard/)
  })

  test('redirects unauthenticated user away from library', async ({ page }) => {
    await page.goto('/library')
    await expect(page).not.toHaveURL(/\/library/)
  })

  test('authenticated user can access dashboard', async ({ page, context }) => {
    await mockAuthSession(context)
    await page.goto('/dashboard')
    await expect(page.locator('aside')).toBeVisible()
    await expect(page.locator('nav a[href="/dashboard"]')).toBeVisible()
  })

  test('authenticated user sees sidebar navigation', async ({ page, context }) => {
    await mockAuthSession(context)
    await page.goto('/dashboard')
    await expect(page.locator('nav a[href="/inquiries"]')).toBeVisible()
    await expect(page.locator('nav a[href="/library"]')).toBeVisible()
    await expect(page.locator('nav a[href="/cases"]')).toBeVisible()
  })
})
