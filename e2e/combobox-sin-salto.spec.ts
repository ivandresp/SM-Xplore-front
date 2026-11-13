import { test, expect } from '@playwright/test'

test('abrir el combobox no mueve el scroll de la pagina', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 600 })
  await page.goto('/registro')

  const combo = page.getByRole('combobox', { name: 'Idioma preferido' })
  // Deja el disparador pegado al borde inferior: es el peor caso.
  await combo.evaluate((el) => {
    const rect = el.getBoundingClientRect()
    window.scrollTo(0, rect.top + window.scrollY - window.innerHeight + 24)
  })

  const before = await page.evaluate(() => window.scrollY)
  await combo.click()
  await page.getByRole('listbox').waitFor()
  await page.waitForTimeout(250)
  const after = await page.evaluate(() => window.scrollY)

  expect(Math.abs(after - before)).toBeLessThanOrEqual(24)
})
