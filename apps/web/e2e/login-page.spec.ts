import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test('loads at /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/login')
  })

  test('shows PatraSaar heading', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'PatraSaar' })).toBeVisible()
  })

  test('shows tagline "Legal clarity, distilled."', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Legal clarity, distilled.')).toBeVisible()
  })

  test('shows Google Sign In button', async ({ page }) => {
    await page.goto('/login')
    const googleBtn = page.getByRole('button', { name: /Sign in with Google/i })
    await expect(googleBtn).toBeVisible()
    await expect(googleBtn).toBeEnabled()
  })

  test('shows disclaimer text', async ({ page }) => {
    await page.goto('/login')
    await expect(
      page.getByText(/educational purposes only/i),
    ).toBeVisible()
  })

  test('Google button shows loading state when clicked', async ({ page }) => {
    // Intercept the auth API call so we can check the UI state before it responds
    await page.route('**/api/auth/sign-in/social', async (route) => {
      // Delay response to capture the loading state
      await new Promise((r) => setTimeout(r, 1000))
      await route.fulfill({ status: 200, body: JSON.stringify({ url: null }) })
    })

    await page.goto('/login')
    const googleBtn = page.getByRole('button', { name: /Sign in with Google/i })
    await googleBtn.click()

    // After click the button should either show "Redirecting..." or be disabled
    await expect(
      page.getByRole('button', { name: /Redirecting\.\.\./i }).or(
        page.getByRole('button').filter({ hasText: /Sign in with Google/i }).and(
          page.locator('[disabled]'),
        ),
      ),
    ).toBeVisible()
  })

  test('shows error message when API is unreachable', async ({ page }) => {
    // Block the auth endpoint to simulate network failure
    await page.route('**/api/auth/sign-in/social', (route) =>
      route.abort('failed'),
    )
    await page.goto('/login')
    const googleBtn = page.getByRole('button', { name: /Sign in with Google/i })
    await googleBtn.click()

    await expect(
      page.getByText(/Could not connect to the API/i),
    ).toBeVisible({ timeout: 5000 })
  })

  test('navigating from landing page Sign In link reaches login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Sign In/i }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: 'PatraSaar' })).toBeVisible()
  })

  test('navigating from landing Upload Document CTA reaches login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Upload Document/i }).click()
    await expect(page).toHaveURL('/login')
  })
})
