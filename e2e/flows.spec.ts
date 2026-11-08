import { expect, test } from '@playwright/test'
import {
  PASSWORD,
  adminToken,
  createBookableActivity,
  uniqueDni,
  uniqueEmail,
  uniquePhone,
} from './support'

const FUTURE = { timeout: 30_000 }

test.describe.configure({ timeout: 120_000 })

test.describe('flujos de la ola 3', () => {
  test('un turista se registra, reserva, ve su reserva y la cancela', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('turista')

    await page.goto('/registro')
    await page.getByLabel('Nombre completo').fill('Turista E2E')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Teléfono').fill(uniquePhone())
    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.getByLabel('Número de documento').fill(uniqueDni())
    await page.getByLabel('Nacionalidad').fill('Colombiana')
    await page.getByLabel('Fecha de nacimiento').fill('1990-05-20')
    await page
      .locator('form')
      .getByRole('button', { name: 'Crear cuenta' })
      .click()

    await expect(page).toHaveURL(/\/explorar/, FUTURE)

    const activity = await createBookableActivity(request)
    await page.goto(`/actividades/${activity.id}`)
    await page.getByRole('button', { name: 'Reservar', exact: true }).click()

    await expect(page.getByText('¡Reserva creada!')).toBeVisible(FUTURE)
    await page.getByRole('button', { name: 'Ir a mis reservas' }).click()

    await expect(page).toHaveURL(/\/mis-reservas/, FUTURE)
    await expect(page.getByText(activity.name).first()).toBeVisible(FUTURE)

    await page.getByRole('button', { name: 'Ver detalle' }).first().click()
    await expect(page).toHaveURL(/\/mis-reservas\/[0-9a-f-]+/, FUTURE)
    await expect(page.getByText('Confirmada').first()).toBeVisible(FUTURE)

    await page.getByRole('button', { name: 'Cancelar reserva' }).click()
    await expect(page.getByText('Reserva cancelada.')).toBeVisible(FUTURE)
    await expect(page.getByText('Cancelada').first()).toBeVisible(FUTURE)
  })

  test('un reporte se crea, se comenta y la gestion lo resuelve', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('reportes')
    const title = `Reporte E2E ${Date.now()}`

    await page.goto('/registro')
    await page.getByLabel('Nombre completo').fill('Turista E2E')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Teléfono').fill(uniquePhone())
    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.getByLabel('Número de documento').fill(uniqueDni())
    await page
      .locator('form')
      .getByRole('button', { name: 'Crear cuenta' })
      .click()
    await expect(page).toHaveURL(/\/explorar/, FUTURE)

    await page.goto('/reportes/nuevo')
    await page.getByLabel('Título').fill(title)
    await page.getByLabel('¿Qué pasó?').fill('Descripción creada por la suite E2E.')
    await page.getByRole('button', { name: 'Enviar reporte' }).click()

    await expect(page).toHaveURL(/\/reportes$/, FUTURE)
    await expect(page.getByText(title).first()).toBeVisible(FUTURE)

    await page.getByRole('link', { name: 'Ver detalle y responder' }).first().click()
    await expect(page).toHaveURL(/\/reportes\/[0-9a-f-]+/, FUTURE)
    const reportId = page.url().split('/').pop()
    expect(reportId).toBeTruthy()

    await page.getByLabel('Añadir un comentario').fill('Comentario E2E de seguimiento')
    await page.getByRole('button', { name: 'Publicar comentario' }).click()
    await expect(page.getByText('Comentario E2E de seguimiento')).toBeVisible(FUTURE)

    // La gestion cierra y resuelve por API con la cuenta de administracion.
    const token = await adminToken(request)
    const authorization = { Authorization: `Bearer ${token}` }
    const closed = await request.post(
      `/api/v1/security-reports/${reportId}/close`,
      { headers: authorization },
    )
    expect(closed.ok(), 'cierre del reporte').toBeTruthy()
    const solved = await request.post(
      `/api/v1/security-reports/${reportId}/solve`,
      { headers: authorization },
    )
    expect(solved.ok(), 'resolucion del reporte').toBeTruthy()

    await page.reload()
    await expect(page.getByText('Resuelto').first()).toBeVisible(FUTURE)
  })
})
