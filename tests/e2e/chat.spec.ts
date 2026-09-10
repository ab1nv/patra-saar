import { test, expect } from '@playwright/test'
import { sse, CHAT_ANSWER, ABSTAIN_ANSWER } from './fixtures'

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Real login (needs the seeded demo user), then stub the LLM stream.
    await page.goto('/login')
    await page.fill('#email', 'abhinav@test.com')
    await page.fill('#password', 'abhinav')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/chat/)
  })

  test('streams an answer and renders a verified citation for an in-corpus question', async ({
    page,
  }) => {
    await page.route('**/api/chat', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: sse([
          CHAT_ANSWER.meta,
          { type: 'token', value: 'Murder is punishable under the BNS. ' },
          { type: 'token', value: '[[BNS s.103 | "Whoever commits murder"]]' },
          CHAT_ANSWER.citations,
          CHAT_ANSWER.title,
          CHAT_ANSWER.done,
        ]),
      }),
    )

    await page.fill('textarea', 'What is the punishment for murder under the BNS?')
    await page.keyboard.press('Enter')

    await expect(page.getByText('Murder is punishable under the BNS.')).toBeVisible()
    await expect(page.getByText('✓ 1 verified')).toBeVisible()
    await expect(page.getByRole('button', { name: /Section 103/ })).toBeVisible()
  })

  test('abstains on an out-of-corpus question and shows no citations', async ({ page }) => {
    await page.route('**/api/chat', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: sse([
          ABSTAIN_ANSWER.meta,
          { type: 'token', value: "I don't have the relevant provision in my indexed corpus." },
          ABSTAIN_ANSWER.citations,
          ABSTAIN_ANSWER.title,
          ABSTAIN_ANSWER.done,
        ]),
      }),
    )

    await page.fill('textarea', 'What are the current GST rates on textiles?')
    await page.keyboard.press('Enter')

    await expect(page.getByText(/don't have the relevant provision/i)).toBeVisible()
    await expect(page.getByText('✓ 1 verified')).toHaveCount(0)
  })
})
