import { test, expect } from '@playwright/test'

test.use({ hasTouch: true, viewport: { width: 375, height: 667 } })

const ADMIN = {
  id: 'u-1',
  fullName: 'Admin Prueba',
  email: 'admin@smxplore.local',
  phone: '3001234567',
  role: 'ADMIN',
  status: 'ACTIVO',
  profile: null,
  signedUpAt: '2026-11-01T10:00:00Z',
  authVersion: 1,
}

const GUIDE = {
  id: 'reg-1',
  role: 'GUIDE',
  fullName: 'Ana Guia',
  email: 'ana@correo.com',
  license: 'LIC-1',
  nit: null,
  signedUpAt: '2026-11-01T10:00:00Z',
  registrationStatus: 'PENDIENTE',
}

test('objetivos tactiles de 44 px y cabecera sticky en el panel', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'sm-xplore:session',
      JSON.stringify({
        token: 'jwt-test',
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      }),
    )
  })
  await page.route('**/api/v1/users/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ADMIN) }),
  )
  await page.route('**/api/v1/registrations**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: [GUIDE], page: 0, size: 10, total: 1, totalPages: 1 }),
    }),
  )

  await page.goto('/app/solicitudes')
  await page.getByRole('heading', { name: 'Solicitudes de alta' }).waitFor()

  const chip = page.getByRole('button', { name: 'Guías' })
  const chipBox = await chip.boundingBox()
  expect(chipBox).not.toBeNull()
  expect(chipBox?.height ?? 0).toBeGreaterThanOrEqual(44)

  const combo = page.getByRole('combobox', { name: 'Estado' })
  const comboBox = await combo.boundingBox()
  expect(comboBox).not.toBeNull()
  expect(comboBox?.height ?? 0).toBeGreaterThanOrEqual(44)

  const header = page.locator('header').first()
  expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
})
