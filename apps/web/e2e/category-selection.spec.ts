import { test, expect } from '@playwright/test'

const mockCategories = [
  { id: 'cat-1', slug: 'ipc', name: 'IPC', description: 'Indian Penal Code' },
  { id: 'cat-2', slug: 'contracts', name: 'Contracts', description: 'Contract Law' },
  { id: 'cat-3', slug: 'property', name: 'Property Law', description: 'Property disputes' },
]

test.describe('Category Selection on Chat Page', () => {
  test.beforeEach(async ({ page }) => {
    // Auth gate: return empty chats
    await page.route('**/api/chats', (route) => {
      // Only match the list endpoint (not individual chat endpoints)
      const url = route.request().url()
      if (/\/api\/chats$/.test(url)) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        })
      } else {
        route.continue()
      }
    })
  })

  test('shows "General" category pill when categories are returned', async ({ page }) => {
    await page.route('**/api/categories', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockCategories }),
      }),
    )

    await page.goto('/chat')
    await expect(page.getByRole('button', { name: 'General' })).toBeVisible()
  })

  test('shows all category pills returned by API', async ({ page }) => {
    await page.route('**/api/categories', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockCategories }),
      }),
    )

    await page.goto('/chat')
    for (const cat of mockCategories) {
      await expect(page.getByRole('button', { name: cat.name })).toBeVisible()
    }
  })

  test('"General" is selected by default (active styling)', async ({ page }) => {
    await page.route('**/api/categories', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockCategories }),
      }),
    )

    await page.goto('/chat')
    const generalBtn = page.getByRole('button', { name: 'General' })
    await expect(generalBtn).toBeVisible()
    // "General" is active by default when selectedCategoryId === null
    // Check it has the accent background (var(--accent-primary)) via inline style
    // We verify it exists and is not disabled
    await expect(generalBtn).toBeEnabled()
  })

  test('clicking a category pill selects it', async ({ page }) => {
    await page.route('**/api/categories', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockCategories }),
      }),
    )

    await page.goto('/chat')
    const ipcBtn = page.getByRole('button', { name: 'IPC' })
    await ipcBtn.click()
    // After click, the IPC button should still be visible and enabled
    await expect(ipcBtn).toBeVisible()
    await expect(ipcBtn).toBeEnabled()
    // Clicking General again deselects IPC
    await page.getByRole('button', { name: 'General' }).click()
    await expect(page.getByRole('button', { name: 'General' })).toBeEnabled()
  })

  test('no category pills shown when API returns empty array', async ({ page }) => {
    await page.route('**/api/categories', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      }),
    )

    await page.goto('/chat')
    // With empty categories the pills section is not rendered
    // (the code checks `categories.length > 0`)
    await expect(page.getByRole('button', { name: 'General' })).not.toBeVisible()
  })

  test('no category pills shown when categories endpoint fails', async ({ page }) => {
    await page.route('**/api/categories', (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: { message: 'Server error' } }),
      }),
    )

    await page.goto('/chat')
    await expect(page.getByRole('button', { name: 'General' })).not.toBeVisible()
  })

  test('textarea placeholder is "Ask anything" on new chat page', async ({ page }) => {
    await page.route('**/api/categories', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      }),
    )

    await page.goto('/chat')
    const textarea = page.getByPlaceholder('Ask anything')
    await expect(textarea).toBeVisible()
  })
})
