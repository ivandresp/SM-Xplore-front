import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const photos = [1, 2, 3].map((index) => `https://images.example.test/photo-${index}.svg`)
const tileBodies = new Map<string, Buffer>()
const DATE = '2026-11-17T12:00:00Z'
const site = {
  siteId: 's-1', managerId: null, name: 'Atractivo de prueba', description: null, categoryId: null,
  categoryName: null, zoneId: 'z-1', zoneName: 'Zona de prueba', zoneStatus: 'ACTIVE', latitude: 11.26, longitude: -74.19,
  photosUrls: photos, status: 'PUBLISHED', maxCapacity: 100, availability: null, createdAt: DATE, updatedAt: DATE,
}

async function setup(page: Page, language: string, count = 3) {
  await page.addInitScript((language) => localStorage.setItem('sm-xplore:language', language), language)
  await page.route('https://images.example.test/**', async (route) => {
    const number = route.request().url().match(/photo-(\d)/)?.[1] ?? '1'
    await route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="1200" height="675" fill="${number === '2' ? '#37766f' : '#345574'}"/><text x="100" y="350" fill="white" font-size="70">Foto de prueba ${number}</text></svg>` })
  })
  await page.route('https://tile.openstreetmap.org/**', async (route) => {
    const url = route.request().url()
    try {
      if (!tileBodies.has(url)) {
        const response = await route.fetch({ timeout: 6000 })
        if (!response.ok()) throw new Error('No tile')
        tileBodies.set(url, await response.body())
      }
      await route.fulfill({ contentType: 'image/png', body: tileBodies.get(url) })
    } catch { await route.abort() }
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let json: unknown = { content: [], page: 0, size: 100, total: 0, totalPages: 0 }
    if (path.includes('/sites/s-')) json = { ...site, siteId: path.endsWith('s-2') ? 's-2' : 's-1', photosUrls: photos.slice(0, count) }
    else if (path.endsWith('/sites')) json = { content: [site], page: 0, size: 12, total: 1, totalPages: 1 }
    else if (path.endsWith('/zones')) json = { content: [{ zoneId: 'z-1', managerId: null, name: 'Zona de prueba', type: null, description: null,
      status: 'ACTIVE', createdAt: DATE, updatedAt: DATE }], page: 0, size: 100, total: 1, totalPages: 1 }
    await route.fulfill({ json })
  })
}

for (const width of [375, 768, 1280]) {
  for (const language of ['es', 'en']) {
    test(`site gallery and location at ${width}px ${language}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 })
      await page.emulateMedia({ colorScheme: width === 768 ? 'dark' : 'light' })
      await setup(page, language)
      const es = language === 'es'
      await page.goto('/atractivos/s-1')
      const gallery = page.getByRole('region', { name: es ? 'Fotos de Atractivo de prueba' : 'Photos of Atractivo de prueba' })
      const location = page.getByRole('region', { name: es ? 'Ubicación' : 'Location', exact: true })
      await expect(gallery.getByRole('img', { name: 'Atractivo de prueba', exact: true })).toHaveAttribute('src', photos[0])
      const galleryBox = await gallery.boundingBox()
      const mapBox = await location.boundingBox()
      expect(width >= 1000 ? mapBox!.x >= galleryBox!.x + galleryBox!.width : mapBox!.y >= galleryBox!.y + galleryBox!.height).toBe(true)
      await expect(location).toBeVisible()
      const directions = page.getByRole('heading', { name: es ? '¿Cómo llegar?' : 'How to get there?' }).locator('..')
      const directionsBox = await directions.boundingBox()
      const eventsBox = await page.getByRole('heading', { name: es ? 'Eventos en este atractivo' : 'Events at this attraction' }).locator('..').boundingBox()
      expect(directionsBox!.y).toBeGreaterThanOrEqual(mapBox!.y + mapBox!.height)
      expect(eventsBox!.y).toBeGreaterThanOrEqual(directionsBox!.y + directionsBox!.height)
      const viewport = location.getByRole('img').first()
      await expect.poll(async () => (await viewport.boundingBox())?.width ?? 0).toBeGreaterThan(300)
      await expect(directions.getByText('11.26000', { exact: true })).toBeVisible()
      await expect(directions.getByText('-74.19000', { exact: true })).toBeVisible()
      await expect(page.getByText(es ? 'Latitud' : 'Latitude', { exact: true })).toHaveCount(1)
      await expect(page.getByText(es ? 'Longitud' : 'Longitude', { exact: true })).toHaveCount(1)
      await expect(gallery.locator('details')).toHaveCount(0)
      await expect(gallery.getByRole('button')).toHaveCount(3)
      await expect(gallery.getByRole('button').first()).toBeVisible()
      const second = gallery.getByRole('button', { name: es ? 'Ver foto 2 de 3' : 'View photo 2 of 3' })
      await second.focus()
      await page.keyboard.press('Space')
      await expect(second).toHaveAttribute('aria-pressed', 'true')
      await expect(gallery.getByRole('img', { name: 'Atractivo de prueba', exact: true })).toHaveAttribute('src', photos[1])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.evaluate(() => window.scrollTo(0, 0))
      if (es) await page.screenshot({ path: `docs/diseno/026-site-detail-${width}.png`, fullPage: true })
      if (es && width === 1280) {
        await page.setViewportSize({ width: 375, height: 950 })
        await expect.poll(async () => (await viewport.boundingBox())?.width ?? 999).toBeLessThan(350)
        await expect.poll(async () => (await viewport.boundingBox())?.width ?? 0).toBeGreaterThan(300)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      }
    })
  }
}

for (const count of [0, 1]) {
  test(`site with ${count} photos has no accordion`, async ({ page }) => {
    await setup(page, 'es', count)
    await page.goto('/atractivos/s-1')
    const gallery = page.getByRole('region', { name: 'Fotos de Atractivo de prueba' })
    await expect(gallery).toBeVisible()
    await expect(gallery.locator('details')).toHaveCount(0)
    if (count === 0) await expect(gallery).toContainText('Sin fotos: la gestora no cargó imágenes')
    else await expect(gallery.getByRole('img')).toHaveAttribute('src', photos[0])
  })
}

for (const width of [375, 768, 1280]) {
  test(`catalog card opens detail from its entire surface at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 })
    await setup(page, 'es')
    await page.goto('/atractivos')
    const card = page.getByRole('link', { name: 'Atractivo de prueba', exact: true })
    await expect(card).toBeVisible()
    await expect(card).toHaveAttribute('href', '/atractivos/s-1')
    await expect(card).not.toContainText('11.2600')
    await expect(card).not.toContainText('-74.1900')
    await expect(card.getByRole('button')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ver detalle', exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/diseno/028-site-catalog-${width}.png`, fullPage: true })
    if (width === 375) {
      await card.focus()
      await page.keyboard.press('Enter')
    } else if (width === 768) await card.locator('img').click()
    else await card.getByText('Zona de prueba', { exact: true }).click()
    await expect(page).toHaveURL(/\/atractivos\/s-1$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Atractivo de prueba' })).toBeVisible()
  })
}
