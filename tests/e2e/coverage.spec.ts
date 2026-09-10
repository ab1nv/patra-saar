import { test, expect } from '@playwright/test'

test.describe('Coverage ledger', () => {
  test('is public and lists the indexed acts', async ({ page }) => {
    await page.goto('/coverage')
    await expect(page.getByRole('heading', { name: 'What is indexed' })).toBeVisible()
    await expect(page.getByText('Indian Penal Code, 1860', { exact: true })).toBeVisible()
    await expect(page.getByText('Bharatiya Nyaya Sanhita, 2023', { exact: true })).toBeVisible()
    await expect(page.getByText('What is not covered')).toBeVisible()
  })
})
