import { expect, type Page } from '@playwright/test'

/**
 * Navigates and waits until React has hydrated, so tests never race a full
 * page load (the app sets `data-hydrated` once effects run).
 */
export async function gotoHydrated(page: Page, url: string): Promise<void> {
  await page.goto(url)
  await page.waitForSelector('html[data-hydrated="1"]', { timeout: 20_000 })
}

/** Fills the composer and submits via the Send button (which only enables once hydrated). */
export async function sendMessage(page: Page, text: string): Promise<void> {
  await page.locator('textarea').click()
  await page.locator('textarea').fill(text)
  const send = page.getByRole('button', { name: 'Send' })
  await expect(send).toBeEnabled()
  await send.click()
}
