import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { ADMIN_EMAIL, loginUi } from './support'
import { mkdirSync } from 'node:fs'

/*
 * Evidencia de la ola 4 (responsive). Se guarda en JPEG y no en PNG porque
 * el set completo en PNG pesaba 19,4 MB; aquí son 16 ficheros de estados
 * clave. Reproducible: npx playwright test e2e/ola4-capturas.spec.ts
 */
const OUT = 'docs/diseno/ola4'
const WIDTHS = [375, 1280]

test.describe.configure({ timeout: 180_000 })

async function capture(page: Page, name: string, dark = false): Promise<void> {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
    await page.screenshot({
      path: `${OUT}/${name}-${width}-${dark ? 'dark' : 'light'}.jpg`,
      type: 'jpeg',
      quality: 72,
      fullPage: true,
    })
  }
}

async function open(page: Page, path: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main')).toBeVisible()
}

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true })
})

test('catalogo publico', async ({ page }) => {
  for (const [name, path] of [
    ['explorar', '/explorar'],
    ['eventos', '/eventos'],
    ['atractivos', '/atractivos'],
    ['servicios', '/servicios'],
  ] as const) {
    await open(page, path)
    await capture(page, name)
  }
})

test('panel de administracion', async ({ page }) => {
  await loginUi(page, ADMIN_EMAIL)

  for (const [name, path] of [
    ['app', '/app'],
    ['usuarios', '/app/usuarios'],
  ] as const) {
    await open(page, path)
    await capture(page, name, true)
  }
})
