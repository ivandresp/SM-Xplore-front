import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  ADMIN_EMAIL,
  createBookableActivity,
  loginUi,
  provisionGuide,
  provisionProvider,
  registerTouristApi,
  uniqueEmail,
} from './support'

const OUT = 'docs/diseno/ola3'
const WIDTHS = [375, 768, 1280]
const THEMES = ['light', 'dark'] as const

test.describe.configure({ timeout: 180_000 })

async function capture(page: Page, name: string): Promise<void> {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme: theme })
      await page.screenshot({
        path: `${OUT}/${name}-${width}-${theme}.png`,
        fullPage: true,
      })
    }
  }
}

async function open(page: Page, path: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main')).toBeVisible()
}

test.describe('capturas por rol', () => {
  test('catalogo publico y ficha de actividad', async ({ page, request }) => {
    const activity = await createBookableActivity(request)

    for (const [name, path] of [
      ['explorar', '/explorar'],
      ['eventos', '/eventos'],
      ['servicios', '/servicios'],
      ['atractivos', '/atractivos'],
    ] as const) {
      await open(page, path)
      await capture(page, name)
    }

    await open(page, `/actividades/${activity.id}`)
    await capture(page, 'actividad')
  })

  test('paneles de administracion', async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL)

    for (const [name, path] of [
      ['app', '/app'],
      ['usuarios', '/app/usuarios'],
      ['reportes', '/app/reportes'],
      ['zonas', '/app/zonas'],
    ] as const) {
      await open(page, path)
      await capture(page, name)
    }
  })

  test('panel del turista', async ({ page, request }) => {
    const email = uniqueEmail('capturas-turista')
    await registerTouristApi(request, email)
    await loginUi(page, email)

    for (const [name, path] of [
      ['mis-reservas', '/mis-reservas'],
      ['mis-reportes', '/reportes'],
    ] as const) {
      await open(page, path)
      await capture(page, name)
    }
  })

  test('panel del guia', async ({ page, request }) => {
    const email = uniqueEmail('capturas-guia')
    const provisioned = await provisionGuide(request, email)
    if (provisioned === null) {
      test.skip(
        true,
        'No fue posible provisionar una cuenta de guia por la invitacion de Mailpit.',
      )
    }

    const signedIn = await loginUi(page, email).then(
      () => true,
      () => false,
    )
    if (!signedIn) {
      test.skip(true, 'La cuenta de guia se creo pero no pudo iniciar sesion.')
    }

    await open(page, '/app/mis-actividades')
    await capture(page, 'guia-actividades')
  })

  test('panel de la prestadora', async ({ page, request }) => {
    const email = uniqueEmail('capturas-prestadora')
    const provisioned = await provisionProvider(request, email)
    if (provisioned === null) {
      test.skip(
        true,
        'No fue posible registrar y aprobar una cuenta de prestadora.',
      )
    }

    const signedIn = await loginUi(page, email).then(
      () => true,
      () => false,
    )
    if (!signedIn) {
      test.skip(
        true,
        'La cuenta de prestadora se creo pero no pudo iniciar sesion.',
      )
    }

    await open(page, '/app/mis-servicios')
    await capture(page, 'prestadora-servicios')
  })
})
