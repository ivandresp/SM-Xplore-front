import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/* 320 px es un iPhone SE de primera generación: si la fila de acciones no
   encoge, aquí se ve el desborde. */
const WIDTHS = [320, 375, 768, 1280] as const

/** Rutas públicas: no dependen de una sesión para montar el layout. */
const PUBLIC_ROUTES = ['/explorar', '/eventos', '/servicios', '/atractivos']

async function scrollWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth)
}

async function clientWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.clientWidth)
}

test.describe('responsive', () => {
  test('ninguna ruta publica desborda en horizontal a 320/375/768/1280', async ({
    page,
  }) => {
    for (const route of PUBLIC_ROUTES) {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        expect(
          await scrollWidth(page),
          `${route} a ${width}px`,
        ).toBe(await clientWidth(page))
      }
    }
  })

  test('el menu movil abre, cierra con Esc y devuelve el foco', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto('/explorar')
    await page.waitForLoadState('networkidle')

    const toggle = page.getByRole('button', { name: 'Abrir menú' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await toggle.click()
    await expect(
      page.getByRole('button', { name: 'Cerrar menú' }),
    ).toHaveAttribute('aria-expanded', 'true')
    await expect(
      page.getByRole('navigation', { name: 'Menú principal' }),
    ).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link').first(),
    ).toBeFocused()
    expect(await scrollWidth(page)).toBe(await clientWidth(page))

    await page.keyboard.press('Escape')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toBeFocused()
    await expect(
      page.getByRole('navigation', { name: 'Menú principal' }),
    ).toHaveCount(0)
  })

  test('el menu movil no aparece en escritorio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/explorar')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeHidden()
    await expect(
      page.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeVisible()
  })
})
