import { expect, test } from '@playwright/test'

const portraitUrl = 'https://example.com/snorkel.png'
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMwK+4EAAIVATPVKxUsAAAAAElFTkSuQmCC', 'base64')
const activity = {
  id: 'a-1', siteId: 's-1', guideId: null, name: 'Snorkel de prueba', category: 'Aventura',
  status: 'PUBLISHED', price: 10000, maxCapacity: 20, durationMinutes: 120, portraitUrl,
  startsAt: '2026-12-01T18:00:00Z', endsAt: '2026-12-01T20:00:00Z', description: 'Arrecifes.',
}
const site = {
  siteId: 's-1', managerId: null, name: 'Playa Blanca', description: null, categoryId: null, categoryName: null,
  zoneId: 'z-1', zoneName: 'Zona de prueba', zoneStatus: 'ACTIVE', latitude: 11.26, longitude: -74.19,
  photosUrls: [], status: 'PUBLISHED', maxCapacity: 100, availability: null,
  createdAt: activity.startsAt, updatedAt: activity.startsAt,
}

test('activity detail swaps reviews and map on desktop and measures the map after resizing', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sm-xplore:language', 'es'))
  for (const url of [portraitUrl, 'https://tile.openstreetmap.org/**']) {
    await page.route(url, route => route.fulfill({ body: image, contentType: 'image/png' }))
  }
  await page.route('**/api/**', async route => {
    const { pathname } = new URL(route.request().url())
    if (pathname.endsWith('/activities/a-1')) await route.fulfill({ json: activity })
    else if (pathname.endsWith('/sites/s-1')) await route.fulfill({ json: site })
    else await route.fulfill({ json: { content: [], page: 0, size: 100, total: 0, totalPages: 0 } })
  })

  await page.setViewportSize({ width: 1280, height: 950 })
  await page.goto('/actividades/a-1')
  const cover = page.getByRole('img', { name: 'Foto de portada' })
  await expect(cover).toHaveAttribute('src', portraitUrl)
  const reviews = page.getByRole('heading', { name: 'Reseñas' }).locator('..')
  const location = page.getByRole('heading', { name: 'Ubicación y punto de encuentro' }).locator('..')
  const map = location.getByRole('img', { name: /Mapa de Playa Blanca/ })
  const booking = page.getByRole('button', { name: 'Agregar al itinerario' }).locator('..')

  async function expectMapToFillColumn() {
    await expect.poll(async () => {
      const [mapBox, locationBox] = await Promise.all([map.boundingBox(), location.boundingBox()])
      return Math.abs((mapBox?.width ?? 0) - Math.min(locationBox?.width ?? 0, 1024))
    }).toBeLessThan(2)
  }

  await expect(map).toBeVisible()
  await page.getByRole('button', { name: 'Acercar mapa' }).click()
  await expect(map.locator('img').first()).toHaveAttribute('src', /openstreetmap\.org\/15\//)
  await page.getByRole('button', { name: 'Alejar mapa' }).click()
  await expect(map.locator('img').first()).toHaveAttribute('src', /openstreetmap\.org\/14\//)
  await expectMapToFillColumn()
  const reviewBox = (await reviews.boundingBox())!
  const coverBox = (await cover.boundingBox())!
  const bookingBox = (await booking.boundingBox())!
  const mapBox = (await map.boundingBox())!
  expect(Math.abs(reviewBox.x - coverBox.x)).toBeLessThan(2)
  expect(Math.abs(mapBox.x - bookingBox.x)).toBeLessThan(2)
  expect(mapBox.y).toBeGreaterThan(bookingBox.y + bookingBox.height)

  for (const width of [768, 375]) {
    await page.setViewportSize({ width, height: 950 })
    await expectMapToFillColumn()
    expect((await map.boundingBox())!.y).toBeLessThan((await booking.boundingBox())!.y)
    expect((await reviews.boundingBox())!.y).toBeGreaterThan((await booking.boundingBox())!.y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Volver', exact: true }).click()
  await expect(page).toHaveURL(/\/explorar$/)
})
