import { expect, test } from '@playwright/test'

test.describe('catálogo con filtros', () => {
  test('los filtros viven en la URL y el chip los quita', async ({ page }) => {
    await page.goto('/explorar?categoria=acuaticos')

    await expect(page.getByRole('status').first()).toContainText('resultados')

    const chip = page.getByRole('button', {
      name: /Quitar filtro Categoría/,
    })
    await expect(chip).toBeVisible()

    await chip.click()

    await expect(page).not.toHaveURL(/categoria=/)
    await expect(chip).toHaveCount(0)
  })

  test('el texto de búsqueda se escribe en la URL tras el debounce', async ({
    page,
  }) => {
    await page.goto('/explorar')

    await page
      .getByLabel('Buscar actividades por nombre')
      .fill('snorkel')

    await expect(page).toHaveURL(/search=snorkel/, { timeout: 5000 })
    await expect(page.getByRole('status').first()).toContainText('resultados')
  })

  test('el buscador global cierra el círculo al catálogo filtrado', async ({
    page,
  }) => {
    await page.goto('/explorar')

    await page
      .getByRole('combobox', { name: 'Buscar en el catálogo' })
      .fill('kayak')

    const seeAll = page
      .getByRole('link', { name: /Ver (los \d+ resultados|todos)/ })
      .first()
    await expect(seeAll).toBeVisible()

    await seeAll.click()

    await expect(page).toHaveURL(/search=kayak/)
    await expect(page.getByRole('status').first()).toContainText('resultado')
  })
})

test.describe('servicios con filtro de precio', () => {
  test('el precio máximo vive en la URL y el chip lo quita', async ({
    page,
  }) => {
    await page.goto('/servicios?precioMax=100000')

    await expect(page.getByRole('status').first()).toContainText('resultado')

    const chip = page.getByRole('button', { name: /Quitar filtro Precio/ })
    await expect(chip).toBeVisible()

    await chip.click()

    await expect(page).not.toHaveURL(/precioMax=/)
    await expect(chip).toHaveCount(0)
  })
})

test.describe('catálogo responsive', () => {
  for (const width of [375, 768, 1280]) {
    test(`sin desbordes horizontales a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/explorar?categoria=acuaticos')

      await expect(page.getByRole('status').first()).toContainText(
        'resultados',
      )

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)

      await page.screenshot({
        path: `docs/diseno/catalogo-${width}.png`,
        fullPage: true,
      })
    })
  }

  test('captura en claro a 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/explorar?categoria=acuaticos')
    await expect(page.getByRole('status').first()).toContainText('resultados')

    await page.screenshot({
      path: 'docs/diseno/catalogo-1280-claro.png',
      fullPage: true,
    })
  })
})
