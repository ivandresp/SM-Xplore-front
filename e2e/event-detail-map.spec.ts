import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const portraitUrl = 'https://example.com/festival.png'
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMwK+4EAAIVATPVKxUsAAAAAElFTkSuQmCC', 'base64')
const DATE = '2026-11-17T12:00:00Z'
const event = { id: 'e-1', siteId: 's-1', siteName: 'Lugar de prueba', name: 'Evento de prueba', category: 'Cultura', status: 'PUBLISHED',
  price: 10000, maxCapacity: 200, startsAt: '2026-12-01T18:00:00Z', endsAt: '2026-12-01T22:00:00Z', description: 'Descripción de prueba.', portraitUrl, expectedAttendance: 150 }
const site = { siteId: 's-1', managerId: null, name: 'Lugar de prueba', description: null, categoryId: null, categoryName: null,
  zoneId: 'z-1', zoneName: 'Zona de prueba', zoneStatus: 'ACTIVE', latitude: 11.2404, longitude: -74.199, photosUrls: [], status: 'PUBLISHED',
  maxCapacity: 100, availability: null, createdAt: DATE, updatedAt: DATE }

async function setup(page: Page, language: string, siteStatus = 200, offline = false) {
  await page.addInitScript((language) => localStorage.setItem('sm-xplore:language', language), language)
  await page.route(portraitUrl, route => route.fulfill({ body: image, contentType: 'image/png' }))
  await page.route('https://tile.openstreetmap.org/**', route =>
    offline ? route.abort() : route.fulfill({ body: image, contentType: 'image/png' }),
  )
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/events/e-1')) await route.fulfill({ json: event })
    else if (path.endsWith('/sites/s-1')) await route.fulfill({ status: siteStatus, json: siteStatus === 200 ? site : { status: siteStatus, title: 'Error' } })
    else await route.fulfill({ json: { content: [], page: 0, size: 100, total: 0, totalPages: 0 } })
  })
}

for (const width of [375, 768, 1280, 1920]) {
  for (const language of ['es', 'en']) {
    test(`event cover takes priority over the map at ${width}px ${language}`, async ({ page }, testInfo) => {
      const es = language === 'es'
      await page.setViewportSize({ width, height: 950 })
      await page.emulateMedia({ colorScheme: width === 768 ? 'dark' : 'light' })
      await setup(page, language)
      await page.goto('/eventos/e-1')
      await expect(page.getByRole('heading', { level: 1, name: event.name })).toBeVisible()
      const location = page.getByRole('region', { name: es ? 'Ubicación' : 'Location', exact: true })
      const cover = page.getByRole('img', { name: es ? 'Foto de portada' : 'Cover photo', exact: true })
      await expect(cover).toHaveAttribute('src', portraitUrl)
      await expect(cover).toBeVisible()
      await expect.poll(() => cover.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
      const map = location.getByRole('img')
      await expect(map).toBeVisible()
      await expect.poll(async () => (await map.boundingBox())?.width ?? 0).toBeGreaterThan(250)
      const box = await map.boundingBox()
      const column = await location.evaluate((element) => element.parentElement!.getBoundingClientRect().width)
      expect(Math.abs(box!.width - Math.min(1024, column))).toBeLessThan(2)
      expect(Math.abs(box!.height - Math.max(220, Math.min(512, Math.round(box!.width * 9 / 16))))).toBeLessThan(2)
      const booking = page.getByRole('button', { name: es ? 'Inicia sesión para reservar' : 'Sign in to book', exact: true }).locator('..')
      const bookingBox = await booking.boundingBox()
      const coverBox = await cover.boundingBox()
      expect(box!.y).toBeGreaterThan(bookingBox!.y + bookingBox!.height)
      expect(coverBox!.height).toBeGreaterThan(box!.height)
      if (width >= 1000) {
        expect(coverBox!.width).toBeGreaterThan(box!.width)
        expect(Math.abs(coverBox!.y - bookingBox!.y)).toBeLessThan(2)
      }
      await expect(page.getByRole('heading', { name: es ? 'Ubicación' : 'Location', exact: true })).toHaveCount(1)
      await expect(page.getByText(es ? 'Sin fotos disponibles' : 'No photos available', { exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: es ? 'Agregar persona' : 'Add person', exact: true }).click()
      await expect(page.getByRole('button', { name: es ? 'Inicia sesión para reservar' : 'Sign in to book', exact: true })).toBeEnabled()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.evaluate(() => window.scrollTo(0, 0))
      if (es) await page.screenshot({ path: testInfo.outputPath(`event-cover-${width}.png`), fullPage: true })
      if (es && width === 1280) {
        await page.setViewportSize({ width: 375, height: 950 })
        await expect.poll(async () => (await map.boundingBox())?.width ?? 999).toBeLessThan(350)
        await expect.poll(async () => (await map.boundingBox())?.width ?? 0).toBeGreaterThan(300)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      }
    })
  }
}

for (const status of [404, 500]) {
  test(`event cover retains site error ${status}`, async ({ page }) => {
    await setup(page, 'es', status)
    await page.goto('/eventos/e-1')
    const location = page.getByRole('region', { name: 'Ubicación', exact: true })
    await expect(location).toContainText(status === 404 ? 'Este evento no tiene un lugar publicado asociado.' : 'No pudimos cargar la ubicación del evento.')
    await expect(location.getByRole('img')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Descripción', exact: true })).toBeVisible()
  })
}

test('event cover keeps coordinates and OSM link if tiles fail', async ({ page }) => {
  await setup(page, 'es', 200, true)
  await page.goto('/eventos/e-1')
  const location = page.getByRole('region', { name: 'Ubicación', exact: true })
  await expect(location).toContainText('No pudimos cargar el mapa.')
  await expect(location).toContainText('11.24040, -74.19900')
  await expect(location.getByRole('link', { name: 'Abrir en OpenStreetMap (abre en pestaña nueva)', exact: true })).toHaveAttribute('href', /mlat=11.24040&mlon=-74.19900/)
})
