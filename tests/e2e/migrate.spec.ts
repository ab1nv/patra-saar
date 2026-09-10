import { test, expect } from '@playwright/test'

test.describe('IPC ↔ BNS mapper', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'abhinav@test.com')
    await page.fill('#password', 'abhinav')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/chat/)
    await page.goto('/migrate')
  })

  test('maps IPC 302 to BNS 103 with both texts shown', async ({ page }) => {
    await page.fill('input[placeholder="Section number, e.g. 420"]', '302')
    await page.getByRole('button', { name: /map section/i }).click()

    await expect(page.getByText('✓ Verified mapping')).toBeVisible()
    await expect(page.getByText('BNS 103')).toBeVisible()
    await expect(page.getByText('Punishment for murder').first()).toBeVisible()
  })

  test('maps IPC 420 to BNS 318', async ({ page }) => {
    await page.fill('input[placeholder="Section number, e.g. 420"]', '420')
    await page.getByRole('button', { name: /map section/i }).click()
    await expect(page.getByText('BNS 318')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Cheating', exact: true })).toBeVisible()
  })
})
