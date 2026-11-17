import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DATE = '2026-11-17T12:00:00Z'
const event = { id: 'e-1', siteId: 's-1', siteName: 'Lugar de prueba', name: 'Festival de prueba', category: 'Cultura', status: 'PUBLISHED',
  price: 10000, maxCapacity: 200, startsAt: '2026-12-01T18:00:00Z', endsAt: '2026-12-01T22:00:00Z', description: 'Descripción de prueba.', expectedAttendance: 150 }
const records = Array.from({ length: 6 }, (_, index) => ({ ...event, id: `e-${index + 1}`, name: index === 0 ? event.name : `Evento de prueba ${index + 1} con un nombre largo para verificar el diseño`, price: index === 1 ? 0 : 10000 }))
const site = { siteId: 's-1', managerId: null, name: 'Lugar de prueba', description: null, categoryId: null, categoryName: null,
  zoneId: 'z-1', zoneName: null, zoneStatus: 'ACTIVE', latitude: 11.2404, longitude: -74.199, photosUrls: [], status: 'PUBLISHED',
  maxCapacity: 100, availability: null, createdAt: DATE, updatedAt: DATE }

async function setup(page: Page, language: string) {
  await page.addInitScript((language) => localStorage.setItem('sm-xplore:language', language), language)
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort())
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let json: unknown = { content: [], page: 0, size: 10, total: 0, totalPages: 0 }
    if (path.endsWith('/events')) json = { content: records, page: 0, size: 10, total: records.length, totalPages: 1 }
    else if (path.endsWith('/events/e-1')) json = event
    else if (path.endsWith('/sites/s-1')) json = site
    await route.fulfill({ json })
  })
}

for (const width of [375, 768, 1280, 1920]) {
  for (const language of ['es', 'en']) {
    test(`event catalog cards ${width}px ${language}`, async ({ page }) => {
      const es = language === 'es'
      await page.setViewportSize({ width, height: 950 })
      await page.emulateMedia({ colorScheme: width === 768 ? 'dark' : 'light' })
      await setup(page, language)
      await page.goto('/eventos')
      const card = page.getByRole('link', { name: event.name, exact: true })
      await expect(card).toBeVisible()
      await expect(card).toHaveAttribute('href', '/eventos/e-1')
      await expect(card.locator('time')).toHaveAttribute('datetime', event.startsAt)
      await expect(card.locator('time')).toContainText(es ? /dic/i : /dec/i)
      const badgePlacement = await card.evaluate((element) => {
        const badge = element.querySelector('time')!.getBoundingClientRect()
        const image = element.firstElementChild!.getBoundingClientRect()
        const card = element.getBoundingClientRect()
        const css = getComputedStyle(element)
        const category = element.querySelector('p')!.getBoundingClientRect()
        const price = element.querySelectorAll('p')[1].getBoundingClientRect()
        return { belowImage: badge.top >= image.bottom,
          rightError: Math.abs(card.right - badge.right - parseFloat(css.paddingRight) - parseFloat(css.borderRightWidth)),
          categoryTopError: Math.abs(category.top - badge.top),
          compactPrice: price.top < badge.bottom && price.left < badge.left }
      })
      expect(badgePlacement.belowImage).toBe(true)
      expect(badgePlacement.rightError).toBeLessThan(2)
      expect(badgePlacement.categoryTopError).toBeLessThan(2)
      expect(badgePlacement.compactPrice).toBe(true)
      await expect(card.getByText('Cultura', { exact: true })).toBeVisible()
      await expect(card.getByText(es ? 'Sin foto' : 'No photo', { exact: true })).toBeVisible()
      await expect(card).not.toContainText(event.siteName)
      await expect(card).not.toContainText(event.description)
      await expect(card.getByRole('button')).toHaveCount(0)
      await expect(card.locator('a')).toHaveCount(0)
      await expect(page.getByRole('button', { name: es ? 'Ver detalle' : 'View details', exact: true })).toHaveCount(0)
      const second = page.getByRole('link', { name: records[1].name, exact: true })
      await expect(second).toContainText(es ? 'Gratis' : 'Free')
      const firstBox = await card.boundingBox()
      const secondBox = await second.boundingBox()
      expect(width >= 768 ? Math.abs(firstBox!.y - secondBox!.y) < 2 : secondBox!.y > firstBox!.y).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      if (es) await page.screenshot({ path: `docs/diseno/032-event-catalog-${width}.png`, fullPage: true })
      if (width === 375) { await card.focus(); await page.keyboard.press('Enter') }
      else if (width === 768) await card.getByText(es ? 'Sin foto' : 'No photo', { exact: true }).click()
      else await card.getByText('Cultura', { exact: true }).click()
      await expect(page).toHaveURL(/\/eventos\/e-1$/)
      await expect(page.getByRole('heading', { level: 1, name: event.name })).toBeVisible()
    })
  }
}
