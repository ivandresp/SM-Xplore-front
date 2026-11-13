import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import {
  MAILPIT,
  MAILPIT_HEADERS,
  PASSWORD,
  adminToken,
  loginUi,
  uniqueDni,
  uniqueEmail,
  uniqueNit,
  uniquePhone,
} from './support'

const email = uniqueEmail('b8a10-dm')
const phone = uniquePhone()
const nit = uniqueNit()

/** OLA5-B6-03: una solicitud pendiente de verdad, para no pasar con la cola vacia. */
const guideName = 'Guia pendiente E2E'
const guideEmail = uniqueEmail('b8a10-guia')

async function activationToken(request: APIRequestContext): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const list = await request.get(`${MAILPIT}/api/v1/messages`, {
      headers: MAILPIT_HEADERS,
    })
    const body = (await list.json()) as {
      messages: Array<{ ID: string; To: Array<{ Address: string }> }>
    }
    const message = body.messages.find((item) =>
      item.To.some((to) => to.Address === email),
    )
    if (message !== undefined) {
      const full = await request.get(`${MAILPIT}/api/v1/message/${message.ID}`, {
        headers: MAILPIT_HEADERS,
      })
      const text = JSON.stringify(await full.json())
      const match = text.match(/reset-password\?token=([A-Za-z0-9_-]+)/)
      if (match !== null) return match[1]
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error('No llego el correo de activacion de la gestora')
}

test.describe('cola con DESTINATION_MANAGER real (B8a-10)', () => {
  test.beforeAll(async ({ request }) => {
    const token = await adminToken(request)
    const created = await request.post('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        role: 'DESTINATION_MANAGER',
        fullName: 'Gestora DM E2E',
        email,
        phone,
        nit,
        startOperationDate: '2024-01-01',
      },
    })
    expect(created.status()).toBe(201)

    const activation = await activationToken(request)
    const reset = await request.post('/api/v1/auth/reset-password', {
      data: { token: activation, newPassword: PASSWORD },
    })
    expect(reset.ok()).toBeTruthy()

    // El alta publica de guia nace PENDIENTE y es la que alimenta la cola:
    // crear la cuenta con POST /admin/users la deja ACTIVA y no aparece.
    const guide = await request.post('/api/v1/auth/register/guia', {
      data: {
        fullName: guideName,
        email: guideEmail,
        phone: uniquePhone(),
        password: PASSWORD,
        dniType: 'CC',
        dniNumber: uniqueDni(),
        license: `LIC-E2E-${Date.now()}`,
        startOperationDate: '2024-01-01',
      },
    })
    expect(guide.status(), 'alta publica de guia pendiente').toBe(201)
  })

  test('la gestora entra al panel y ve la cola de solicitudes', async ({ page }) => {
    await loginUi(page, email)
    await page.goto('/app/solicitudes')
    await expect(
      page.getByRole('heading', { name: 'Solicitudes de alta' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guías' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)

    // La cola tiene que traer la solicitud sembrada, no solo la cabecera.
    const fila = page.getByRole('row').filter({ hasText: guideName })
    await expect(fila).toBeVisible()
    await expect(fila.getByRole('button', { name: 'Aprobar' })).toBeVisible()
  })
})
