import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { ADMIN_EMAIL, loginUi } from './support'

async function documentWidths(page: Page) {
  return page.evaluate(() => {
    const aside = document.querySelector('aside')
    const main = document.querySelector('main')
    return {
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      aside: aside === null ? 0 : aside.getBoundingClientRect().width,
      main: main === null ? 0 : main.getBoundingClientRect().width,
    }
  })
}

async function menuPanels(page: Page): Promise<number> {
  return page.locator('nav').evaluateAll((nodes) =>
    nodes.filter((node) => node.getAttribute('aria-label') === 'Menú principal')
      .length,
  )
}

/*
 * El panel es donde vive la navegación real: por debajo de 900 px en el menú
 * de la barra, desde 900 px en la barra lateral. Se mide el ancho de las dos
 * columnas porque un display:none silencioso deja el contenido en 240 px sin
 * desbordar la página: scrollWidth === clientWidth no lo detecta.
 */
test.describe('panel responsive', () => {
  test('barra lateral desde 900px y menú móvil por debajo', async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL)

    for (const width of [900, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/app')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('aside').first(), 'aside a ' + width).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Abrir menú' }),
        'botón de menú a ' + width,
      ).toBeHidden()

      const boxes = await documentWidths(page)
      expect(boxes.aside, 'ancho de la barra lateral a ' + width).toBeGreaterThan(200)
      expect(boxes.main, 'ancho del contenido a ' + width).toBeGreaterThan(width * 0.6)
      expect(boxes.scroll, 'desborde a ' + width).toBe(boxes.client)
    }

    await page.setViewportSize({ width: 768, height: 900 })
    await page.goto('/app')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('aside').first()).toBeHidden()
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible()

    const narrow = await documentWidths(page)
    expect(narrow.scroll, 'desborde a 768').toBe(narrow.client)
  })

  test('cruzar a escritorio con el menú abierto lo cierra', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 })
    await loginUi(page, ADMIN_EMAIL)
    await page.goto('/app')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await expect(
      page.getByRole('navigation', { name: 'Menú principal' }),
    ).toBeVisible()

    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(page.locator('aside').first()).toBeVisible()
    expect(await menuPanels(page), 'paneles abiertos a 1280').toBe(0)

    /* Al volver a móvil el botón tiene que estar cerrado, no a medias. */
    await page.setViewportSize({ width: 768, height: 900 })
    const toggle = page.getByRole('button', { name: 'Abrir menú' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(await menuPanels(page)).toBe(0)
  })
})
