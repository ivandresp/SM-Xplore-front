import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// El catálogo consulta el gateway real: bajo carga paralela 5 s no bastan.
const READY = { timeout: 15_000 }

/**
 * Lee el número del resumen de resultados (`p[role="status"]`).
 * Cada catálogo lo redacta con su sustantivo: «12 atractivos», «1 evento».
 */
async function countOf(page: Page, singular: string, plural: string) {
  const status = page.locator('p[role="status"]').first()
  await expect(status).toContainText(new RegExp(`${singular}|${plural}`), READY)
  const text = (await status.textContent()) ?? ''
  const match = text.match(/(\d+)/)
  expect(match, `sin número en «${text}»`).not.toBeNull()
  return Number(match?.[1] ?? -1)
}

test.describe('catálogo con filtros', () => {
  test('los filtros viven en la URL y el chip los quita', async ({ page }) => {
    await page.goto('/explorar?categoria=acuaticos')

    await expect(page.locator('p[role="status"]')).toContainText('resultados', READY)

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
    await expect(page.locator('p[role="status"]')).toContainText('resultados', READY)
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
    await expect(page.locator('p[role="status"]')).toContainText('resultado', READY)
  })
})

test.describe('servicios con filtro de precio', () => {
  test('el precio máximo vive en la URL y el chip lo quita', async ({
    page,
  }) => {
    await page.goto('/servicios?precioMax=100000')

    await expect(page.locator('p[role="status"]')).toContainText('resultado', READY)

    const chip = page.getByRole('button', { name: /Quitar filtro Precio/ })
    await expect(chip).toBeVisible()

    await chip.click()

    await expect(page).not.toHaveURL(/precioMax=/)
    await expect(chip).toHaveCount(0)
  })
})

test.describe('atractivos con filtros (B9)', () => {
  test('la búsqueda vive en la URL y acota los atractivos', async ({ page }) => {
    await page.goto('/atractivos')
    const total = await countOf(page, 'atractivo', 'atractivos')
    expect(total, 'el stack necesita atractivos sembrados').toBeGreaterThan(1)

    const name = (await page.locator('h3').first().textContent())?.trim() ?? ''
    const term = name.split(/\s+/).find((word) => word.length >= 4) ?? name
    await page.getByLabel('Buscar atractivos por nombre').fill(term)

    await expect(page).toHaveURL(
      new RegExp(`search=${encodeURIComponent(term)}`),
      { timeout: 5000 },
    )
    const filtered = await countOf(page, 'atractivo', 'atractivos')
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThanOrEqual(total)
  })

  test('la zona vive en la URL y acota los atractivos', async ({ page }) => {
    await page.goto('/atractivos')
    const total = await countOf(page, 'atractivo', 'atractivos')

    await page.getByRole('combobox', { name: 'Zona' }).click()
    // La opción 0 es el placeholder («Todas las zonas»), que limpia el filtro.
    await page.getByRole('option').nth(1).click()

    await expect(page).toHaveURL(/zona=/, { timeout: 5000 })
    const filtered = await countOf(page, 'atractivo', 'atractivos')
    expect(filtered).toBeLessThanOrEqual(total)
    await expect(
      page.getByRole('button', { name: /Quitar filtro Zona/ }),
    ).toBeVisible()
  })
})

test.describe('eventos con filtros (B9)', () => {
  test('la búsqueda vive en la URL y acota los eventos', async ({ page }) => {
    await page.goto('/eventos')
    const total = await countOf(page, 'evento', 'eventos')
    expect(total, 'el stack necesita eventos sembrados').toBeGreaterThan(0)

    const name =
      (await page.locator('article h2').first().textContent())?.trim() ?? ''
    const term = name.split(/\s+/).find((word) => word.length >= 4) ?? name
    await page.getByLabel('Buscar eventos por nombre').fill(term)

    await expect(page).toHaveURL(
      new RegExp(`search=${encodeURIComponent(term)}`),
      { timeout: 5000 },
    )
    const filtered = await countOf(page, 'evento', 'eventos')
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThanOrEqual(total)
  })

  test('el precio máximo vive en la URL y acota los eventos', async ({ page }) => {
    await page.goto('/eventos')
    const total = await countOf(page, 'evento', 'eventos')

    await page.getByRole('combobox', { name: 'Precio' }).click()
    // La opción 0 es el placeholder («Cualquier precio»).
    await page.getByRole('option').nth(1).click()

    await expect(page).toHaveURL(/precioMax=/, { timeout: 5000 })
    const filtered = await countOf(page, 'evento', 'eventos')
    expect(filtered).toBeLessThanOrEqual(total)
  })
})

test.describe('catálogo responsive', () => {
  for (const width of [375, 768, 1280]) {
    test(`sin desbordes horizontales a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/explorar?categoria=acuaticos')

      await expect(page.locator('p[role="status"]')).toContainText(
        'resultados',
        READY,
      )

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)

      if (process.env.CAPTURAS === '1') {
        await page.screenshot({
          path: `docs/diseno/catalogo-${width}.png`,
          fullPage: true,
        })
      }
    })
  }

  test('captura en claro a 1280 px', async ({ page }) => {
    test.skip(
      process.env.CAPTURAS !== '1',
      'Capturas de evidencia: se activan con CAPTURAS=1.',
    )
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/explorar?categoria=acuaticos')
    await expect(page.locator('p[role="status"]')).toContainText('resultados', READY)

    await page.screenshot({
      path: 'docs/diseno/catalogo-1280-claro.png',
      fullPage: true,
    })
  })
})
