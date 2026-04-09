import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('loads and shows PatraSaar logo in nav', async ({ page }) => {
    await page.goto('/')
    // Use the app nav specifically (not the Next.js dev overlay nav)
    await expect(page.getByRole('navigation').first()).toBeVisible()
    await expect(page.getByText('PatraSaar').first()).toBeVisible()
  })

  test('shows hero headline with "Legal Clarity" text', async ({ page }) => {
    await page.goto('/')
    // The headline splits across two lines but "Legal Clarity" is on the first
    await expect(page.getByText('Legal Clarity,')).toBeVisible()
  })

  test('shows subheadline describing the platform', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByText(/Upload Indian legal documents/i),
    ).toBeVisible()
  })

  test('shows primary CTA "Upload Document" button linking to /login', async ({ page }) => {
    await page.goto('/')
    const uploadCta = page.getByRole('link', { name: /Upload Document/i })
    await expect(uploadCta).toBeVisible()
    await expect(uploadCta).toHaveAttribute('href', '/login')
  })

  test('shows "Sign In" nav link pointing to /login', async ({ page }) => {
    await page.goto('/')
    const signIn = page.getByRole('link', { name: /Sign In/i })
    await expect(signIn).toBeVisible()
    await expect(signIn).toHaveAttribute('href', '/login')
  })

  test('shows "How It Works" navigation anchor in nav', async ({ page }) => {
    await page.goto('/')
    const howItWorks = page.getByRole('link', { name: /How It Works/i })
    await expect(howItWorks).toBeVisible()
  })

  test('"How It Works" section exists with step numbers', async ({ page }) => {
    await page.goto('/')
    // Scroll to the how-it-works section to ensure it's rendered
    await page.evaluate(() => {
      document.getElementById('how-it-works')?.scrollIntoView()
    })
    // Step numbers are in <span class="...stepNum"> elements — use a CSS selector
    // to avoid strict mode collision with the Next.js dev overlay button
    await expect(page.locator('span').filter({ hasText: /^01$/ }).first()).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^02$/ }).first()).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^03$/ }).first()).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^04$/ }).first()).toBeVisible()
  })

  test('page title is set', async ({ page }) => {
    await page.goto('/')
    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('GitHub CTA link is present', async ({ page }) => {
    await page.goto('/')
    const githubLink = page.getByRole('link', { name: /github/i })
    await expect(githubLink).toBeVisible()
    await expect(githubLink).toHaveAttribute('href', /github\.com/)
  })

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/')
    // Allow a moment for any async errors
    await page.waitForTimeout(500)
    expect(errors).toHaveLength(0)
  })
})
