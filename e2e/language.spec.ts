import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function languageButton(page: Page, width: number) {
  if (width < 900) {
    await page.getByRole('button', { name: /^(Abrir menú|Open menu)$/ }).click()
  }
  return page.getByRole('button', { name: /^(Cambiar idioma a inglés|Switch language to Spanish)$/ })
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => document.documentElement.clientWidth),
  )
}

for (const width of [375, 768, 1280]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`language controls and draft at ${width}px, ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme })
      await page.goto('/login')
      await page.getByLabel('Correo electrónico', { exact: true }).fill('viajero@example.com')
      const toggle = await languageButton(page, width)
      const theme = page.getByRole('button', { name: /Cambiar tema/ })
      const toggleBox = await toggle.boundingBox()
      const themeBox = await theme.boundingBox()
      expect(toggleBox).not.toBeNull()
      expect(themeBox).not.toBeNull()
      expect(toggleBox!.width).toBeGreaterThanOrEqual(44)
      expect(toggleBox!.height).toBeGreaterThanOrEqual(44)
      expect(Math.abs(toggleBox!.y - themeBox!.y)).toBeLessThan(2)
      expect(Math.abs(toggleBox!.x - themeBox!.x)).toBeLessThan(70)
      await toggle.click()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
      await expect(page.getByLabel('Email address', { exact: true })).toHaveValue('viajero@example.com')
      await page.screenshot({ path: `docs/diseno/018-language-${width}-${colorScheme}-en.png`, fullPage: true, animations: 'disabled' })
      if (width < 900) {
        await page.keyboard.press('Escape')
        await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused()
      }
      await noOverflow(page)
      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      const englishButton = await languageButton(page, width)
      await englishButton.click()
      await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', 'es')
      await noOverflow(page)
    })
  }
}

test('public routes keep translated navigation without horizontal overflow', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sm-xplore:language', 'en'))
  await page.route('**/api/**', (route) => route.fulfill({
    json: { content: [], page: 0, size: 10, total: 0, totalPages: 0 },
  }))
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/registro', '/registro/guia', '/reset-password', '/explorar', '/eventos', '/servicios', '/atractivos']) {
      await page.goto(path)
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await noOverflow(page)
      await expect(page.getByRole('link', { name: 'SM-Xplore, go to home page' })).toBeVisible()
      if (path === '/registro' || path === '/registro/guia') {
        const general = page.getByRole('tab', { name: 'General Information' })
        await expect(general).toHaveAttribute('aria-selected', 'true')
        const submit = page.locator('form').getByRole('button', { name: 'Create account', exact: true })
        await expect(submit).toHaveCount(0)
        const generalPanel = page.getByRole('tabpanel', { name: 'General Information' })
        await generalPanel.getByLabel('Password', { exact: true }).fill('ContraseñaSegura1!')
        const generalHeight = (await generalPanel.boundingBox())!.height
        const details = page.getByRole('tab', { name: 'Account Details' })
        await details.click()
        await expect(details).toHaveAttribute('aria-selected', 'true')
        await expect(submit).toBeVisible()
        const detailsPanel = page.getByRole('tabpanel', { name: 'Account Details' })
        const panelBox = (await detailsPanel.boundingBox())!
        const submitBox = (await submit.boundingBox())!
        expect(panelBox.height).toBeGreaterThanOrEqual(generalHeight)
        expect(Math.abs(panelBox.y + panelBox.height - submitBox.y - submitBox.height)).toBeLessThan(1)
        await noOverflow(page)
      }
    }
  }
})

for (const role of ['TOURIST', 'GUIDE', 'SERVICE_PROVIDER', 'DESTINATION_MANAGER', 'ADMIN']) {
  test(`authenticated navigation remains responsive and translated for ${role}`, async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sm-xplore:session', JSON.stringify({ token: 'local-ui-fixture', expiresAt: '2100-01-01T00:00:00Z' }))
      localStorage.setItem('sm-xplore:language', 'en')
    })
    await page.route('**/api/**', async (route) => {
      if (new URL(route.request().url()).pathname.endsWith('/users/me')) {
        await route.fulfill({ json: {
          id: 'ui-fixture', fullName: 'Ana Santa Marta', email: 'ana@example.com', phone: '',
          role, status: 'ACTIVO', profile: null, signedUpAt: '2026-11-01T10:00:00Z', authVersion: 1,
        } })
      } else {
        await route.fulfill({ json: { content: [], page: 0, size: 10, total: 0, totalPages: 0 } })
      }
    })
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/app')
      await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
      await noOverflow(page)
      if (width < 900) {
        await page.getByRole('button', { name: 'Open menu' }).click()
        await expect(page.getByRole('button', { name: 'Switch language to Spanish' })).toBeVisible()
        await page.keyboard.press('Escape')
      } else {
        await expect(page.getByRole('button', { name: 'Switch language to Spanish' })).toBeVisible()
      }
    }
  })
}
