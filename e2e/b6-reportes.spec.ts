import { expect, test } from '@playwright/test'
import {
  PASSWORD,
  loginApi,
  loginUi,
  registerTouristApi,
  uniqueEmail,
} from './support'

/**
 * B6-13: la tabla de /reportes se midio sin filas. Este spec siembra un
 * turista y tres reportes por API y mide la lista con datos a 375 y 1280.
 */
test.describe('reportes con datos (B6-13)', () => {
  const email = uniqueEmail('b6-reportes')
  const titles = ['Reporte B6 uno', 'Reporte B6 dos', 'Reporte B6 tres']

  test.beforeAll(async ({ request }) => {
    await registerTouristApi(request, email)
    const token = await loginApi(request, email, PASSWORD)

    for (const title of titles) {
      const response = await request.post('/api/v1/security-reports', {
        headers: { Authorization: `Bearer ${token}` },
        data: { title, description: 'Datos de prueba de B6-13' },
      })
      expect(response.status()).toBe(201)
    }
  })

  test('la lista se mide con filas a 375 y 1280 sin desbordar', async ({ page }) => {
    await loginUi(page, email)

    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/reportes')

      for (const title of titles) {
        await expect(page.getByText(title).first()).toBeVisible()
      }

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    }
  })
})
