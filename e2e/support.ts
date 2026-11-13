import { expect } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

/** Credenciales del stack de pruebas. Se pueden pisar por entorno (OLA5-B6-04). */
export const PASSWORD = process.env.E2E_PASSWORD ?? 'ChangeMe123!'
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@smxplore.local'
export const MAILPIT = 'http://127.0.0.1:8025'

/**
 * El Mailpit del stack local pide basic auth (`MP_UI_AUTH`). Se puede pisar por
 * entorno; si el Mailpit no la exige, la cabecera se ignora.
 */
export const MAILPIT_AUTH = process.env.E2E_MAILPIT_AUTH ?? 'mailpit:mailpit-dev'

export const MAILPIT_HEADERS = {
  Authorization: `Basic ${Buffer.from(MAILPIT_AUTH).toString('base64')}`,
}

export interface ActivityDto {
  id: string
  name: string
  status: string
  startsAt: string
  maxCapacity: number
  price: number
}

export function uniqueEmail(prefix: string): string {
  return `e2e.${prefix}.${Date.now()}@smxplore.local`
}

/** El backend no admite dos cuentas con el mismo documento. */
export function uniqueDni(): string {
  return String(Math.floor(Math.random() * 900_000_000) + 100_000_000)
}

/** `users.phone` es único, con o sin guiones. */
export function uniquePhone(): string {
  return `30${Math.floor(Math.random() * 90_000_000) + 10_000_000}`
}

export function uniqueNit(): string {
  return `900${Math.floor(Math.random() * 9_000_000) + 1_000_000}-1`
}

/** Login por API: devuelve el access token del gateway. */
export async function loginApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const response = await request.post('/api/v1/auth/login', {
    data: { email, password },
  })
  expect(response.ok(), `login de ${email}`).toBeTruthy()
  const body = (await response.json()) as { accessToken?: string | null }
  expect(body.accessToken, `token de ${email}`).toBeTruthy()
  return body.accessToken as string
}

export function adminToken(request: APIRequestContext): Promise<string> {
  return loginApi(request, ADMIN_EMAIL, PASSWORD)
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

/**
 * Una actividad publicada y futura con cupo: se crea con la cuenta de admin
 * para que el flujo no dependa de datos sembrados a mano.
 */
export async function createBookableActivity(
  request: APIRequestContext,
): Promise<ActivityDto> {
  const token = await adminToken(request)
  const sitesResponse = await request.get('/api/v1/sites?size=1')
  expect(sitesResponse.ok()).toBeTruthy()
  const sites = (await sitesResponse.json()) as {
    content: Array<{ siteId: string }>
  }
  expect(sites.content.length, 'hace falta un atractivo').toBeGreaterThan(0)

  const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)
  const created = await request.post('/api/v1/activities', {
    headers: authHeader(token),
    data: {
      siteId: sites.content[0].siteId,
      name: `Actividad E2E ${Date.now()}`,
      category: 'Aventura',
      price: 50000,
      maxCapacity: 20,
      durationMinutes: 60,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      description: 'Actividad creada por la suite E2E.',
    },
  })
  expect(created.status(), 'alta de actividad').toBe(201)
  const activity = (await created.json()) as ActivityDto

  const published = await request.patch(
    `/api/v1/activities/${activity.id}/status`,
    { headers: authHeader(token), data: { status: 'PUBLISHED' } },
  )
  expect(published.ok(), 'publicar la actividad').toBeTruthy()
  return (await published.json()) as ActivityDto
}

export async function registerTouristApi(
  request: APIRequestContext,
  email: string,
): Promise<void> {
  const response = await request.post('/api/v1/auth/register/turista', {
    data: {
      fullName: 'Turista E2E',
      email,
      phone: uniquePhone(),
      password: PASSWORD,
      dniType: 'CC',
      dniNumber: uniqueDni(),
      nationality: 'Colombiana',
      preferredLanguage: 'es',
      birthDate: '1990-05-20',
    },
  })
  expect(response.status(), 'registro de turista').toBe(201)
}

/** Login por la UI, que es el camino que usa una persona. */
export async function loginUi(
  page: Page,
  email: string,
  password = PASSWORD,
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

function invitationTokenFrom(text: string): string | null {
  const match = text.match(/reset-password\?token=([A-Za-z0-9._~-]+)/)
  return match === null ? null : match[1]
}

/** Busca en Mailpit el enlace de invitacion y devuelve su token. */
async function waitForInvitationToken(
  request: APIRequestContext,
  email: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const list = await request.get(`${MAILPIT}/api/v1/messages?limit=50`, {
      headers: MAILPIT_HEADERS,
    })
    if (list.ok()) {
      const messages = (await list.json()) as {
        messages: Array<{
          ID: string
          To: Array<{ Address: string }>
        }>
      }
      const message = messages.messages.find((candidate) =>
        candidate.To.some(
          (to) => to.Address.toLowerCase() === email.toLowerCase(),
        ),
      )
      if (message !== undefined) {
        const detail = await request.get(
          `${MAILPIT}/api/v1/message/${message.ID}`,
          { headers: MAILPIT_HEADERS },
        )
        if (detail.ok()) {
          const body = (await detail.json()) as {
            Text?: string
            HTML?: string
          }
          const token = invitationTokenFrom(
            `${body.Text ?? ''}\n${body.HTML ?? ''}`,
          )
          if (token !== null) return token
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return null
}

/**
 * Crea una guia con `POST /admin/users`, lee la invitacion en Mailpit y
 * completa la contrasena. Devuelve `null` si el entorno no permite el ciclo.
 */
export async function provisionGuide(
  request: APIRequestContext,
  email: string,
): Promise<string | null> {
  const token = await adminToken(request)
  const created = await request.post('/api/v1/admin/users', {
    headers: authHeader(token),
    data: {
      role: 'GUIDE',
      fullName: 'Guia E2E',
      email,
      phone: uniquePhone(),
      dniType: 'CC',
      dniNumber: uniqueDni(),
      license: `LIC-E2E-${Date.now()}`,
    },
  })
  if (!created.ok()) return null
  const user = (await created.json()) as { id: string }

  const reset = await request.post(`/api/v1/admin/users/${user.id}/password-reset`, {
    headers: authHeader(token),
  })
  if (!reset.ok()) return null

  const invitation = await waitForInvitationToken(request, email)
  if (invitation === null) return null

  const completed = await request.post('/api/v1/auth/reset-password', {
    data: { token: invitation, newPassword: PASSWORD },
  })
  return completed.ok() ? email : null
}

/**
 * El admin no puede crear prestadoras: se registran ellas y luego se aprueban.
 * Devuelve el correo listo para iniciar sesion, o `null` si algo falla.
 */
export async function provisionProvider(
  request: APIRequestContext,
  email: string,
): Promise<string | null> {
  const registered = await request.post('/api/v1/auth/register/prestadora', {
    data: {
      fullName: 'Prestadora E2E',
      email,
      phone: uniquePhone(),
      password: PASSWORD,
      nit: uniqueNit(),
      businessType: 'Alojamiento',
    },
  })
  if (registered.status() !== 201) return null
  const user = (await registered.json()) as { id: string }

  const token = await adminToken(request)
  const review = await request.post(
    `/api/v1/admin/users/${user.id}/provider-review`,
    {
      headers: authHeader(token),
      data: { decision: 'APROBADO', reason: 'Suite E2E' },
    },
  )
  return review.status() === 204 ? email : null
}
