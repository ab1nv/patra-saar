import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test('rejects a bad password', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'abhinav@test.com')
    await page.fill('#password', 'definitely-wrong')
    await page.click('button[type="submit"]')
    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  })

  test('redirects unauthenticated /chat to login', async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveURL(/\/login/)
  })

  test('signs in with the demo credentials and lands on the workspace', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'abhinav@test.com')
    await page.fill('#password', 'abhinav')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/chat/)
    await expect(page.getByText('New inquiry').first()).toBeVisible()
  })
})
