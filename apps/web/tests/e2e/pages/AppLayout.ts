import { Page, Locator } from '@playwright/test'

/**
 * Page object for the authenticated app shell.
 * Mirrors the sidebar nav in apps/web/src/routes/(app)/+layout.svelte.
 */
export class AppLayout {
  readonly page: Page
  readonly sidebar: Locator
  readonly navDashboard: Locator
  readonly navInquiries: Locator
  readonly navLibrary: Locator
  readonly navCases: Locator
  readonly mainContent: Locator

  constructor(page: Page) {
    this.page = page
    this.sidebar = page.locator('aside')
    this.navDashboard = page.locator('nav a[href="/dashboard"]')
    this.navInquiries = page.locator('nav a[href="/inquiries"]')
    this.navLibrary = page.locator('nav a[href="/library"]')
    this.navCases = page.locator('nav a[href="/cases"]')
    this.mainContent = page.locator('main').last()
  }

  async navigateTo(section: 'dashboard' | 'inquiries' | 'library' | 'cases') {
    const navMap = {
      dashboard: this.navDashboard,
      inquiries: this.navInquiries,
      library: this.navLibrary,
      cases: this.navCases,
    }
    await navMap[section].click()
    await this.page.waitForLoadState('networkidle')
  }
}
