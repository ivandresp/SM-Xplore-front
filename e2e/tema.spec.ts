import { expect, test } from '@playwright/test'

const THEME_KEY = 'sm-xplore:theme'

test.describe('tema claro / oscuro / sistema', () => {
  test('cicla, persiste y el modo sistema sigue a prefers-color-scheme', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/login')

    const toggle = page.getByRole('button', { name: /^Tema/ }).first()
    await expect(toggle).toHaveAttribute('aria-label', /sistema/)

    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect
      .poll(() =>
        page.evaluate((key) => window.localStorage.getItem(key), THEME_KEY),
      )
      .toBe('light')

    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    // Recarga: el script inline aplica el tema antes de montar React.
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-bg')
          .trim(),
      ),
    ).resolves.toBe('#0d1519')

    // Vuelta a sistema: sin atributo y sigue la media query.
    await page.getByRole('button', { name: /^Tema/ }).first().click()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/)

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-bg')
          .trim(),
      ),
    ).resolves.toBe('#0d1519')
  })

  test('sin parpadeo: el tema guardado ya está aplicado en el primer pintado', async ({
    page,
  }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'dark')
    }, THEME_KEY)

    await page.goto('/login')

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-bg')
          .trim(),
      ),
    ).resolves.toBe('#0d1519')
  })
})
