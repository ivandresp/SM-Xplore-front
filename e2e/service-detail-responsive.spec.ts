import { expect, test } from '@playwright/test'

const service = {
  serviceId: 'sv-1', providerId: 'p-1', providerName: 'Hotel Marina',
  siteId: 's-1', siteName: 'Playa Blanca', zoneId: 'z-1', zoneName: 'Taganga',
  categoryId: 'c-1', categoryName: 'Hospedaje', name: 'Habitación doble',
  description: 'Vista al mar.', type: 'LODGING', latitude: 11.2404, longitude: -74.199,
  price: 250000, status: 'PUBLISHED', maxCapacity: 4, photosUrls: ['https://fixtures.test/cover.svg'],
  cancellationPolicy: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}

for (const width of [375, 768, 1280, 1920]) {
  test(`service detail layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.route('**/api/**', async route => {
      if (new URL(route.request().url()).pathname.endsWith('/services/sv-1')) await route.fulfill({ json: service })
      else await route.fulfill({ status: 204 })
    })
    await page.route('https://fixtures.test/cover.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="1200" height="675" fill="#8daabc"/></svg>' }))
    await page.route('**/tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#d6e4d0"/></svg>' }))
    await page.goto('/servicios/sv-1')
    const hero = page.getByRole('img', { name: service.name, exact: true }).locator('..')
    const contact = page.getByRole('article', { name: 'Contratar servicio' })
    const location = page.getByRole('region', { name: 'Ubicación', exact: true })
    const reviews = page.getByRole('heading', { name: 'Reseñas', exact: true }).locator('..')
    await expect(contact).toBeVisible()
    await expect(page.getByText('Alojamiento · Hotel Marina')).toHaveCount(0)
    await expect(contact.getByText('Los servicios se contratan directamente con la prestadora.')).toBeVisible()
    await expect(contact.getByRole('link', { name: 'Contactar a la prestadora' })).toHaveAttribute('href', '/prestadoras/p-1')
    await expect(page.getByRole('link', { name: /© OpenStreetMap contributors/ })).toBeVisible()
    await expect.poll(async () => {
      const [h, c, m, r] = await Promise.all([hero.boundingBox(), contact.boundingBox(), location.boundingBox(), reviews.boundingBox()])
      if (!h || !c || !m || !r) return false
      if (width >= 1000) return c.x > h.x && m.y >= c.y + c.height && Math.abs(m.y + m.height - h.y - h.height) <= 2 && r.y >= m.y + m.height
      if (width >= 768) return c.x < m.x && Math.abs(c.y - m.y) <= 2 && r.y >= m.y + m.height
      return m.y >= h.y + h.height && c.y >= m.y + m.height && r.y >= c.y + c.height
    }).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/service-detail-${width}.png`, fullPage: true })
    if (width >= 768) {
      if (width >= 1000) await page.setViewportSize({ width: width - 60, height: 1000 })
      await expect.poll(async () => {
        const map = await location.boundingBox()
        const attribution = await page.getByRole('link', { name: /© OpenStreetMap contributors/ }).boundingBox()
        const viewport = await page.getByRole('img', { name: /Mapa de Habitación doble/ }).boundingBox()
        return !!map && !!attribution && !!viewport && attribution.y + attribution.height <= map.y + map.height + 2 && viewport.x + viewport.width <= map.x + map.width + 2
      }).toBe(true)
    }

  })
}
