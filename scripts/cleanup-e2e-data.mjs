#!/usr/bin/env node
/**
 * Limpieza única de los datos que dejó la suite E2E en la base real (ola 8).
 *
 * No borra: ms-03 y ms-04 no exponen DELETE de catálogo. Saca del catálogo
 * público con transiciones de estado válidas:
 *   actividades PUBLICADAS cuyo nombre empieza por "Actividad E2E" -> CANCELLED
 *   sitios "Sitio E2E"                                            -> DRAFT
 *   zonas "Zona E2E"                                              -> INACTIVE
 *
 * Uso: node scripts/cleanup-e2e-data.mjs
 * Variables: E2E_API_URL, E2E_ADMIN_EMAIL, E2E_PASSWORD (mismos defaults que e2e/support.ts).
 */
const BASE = process.env.E2E_API_URL ?? 'http://127.0.0.1:8088/api/v1'
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@smxplore.local'
const PASSWORD = process.env.E2E_PASSWORD ?? 'ChangeMe123!'

async function call(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`${method} ${path} -> HTTP ${response.status}`)
  }
  return response.status === 204 ? null : response.json()
}

async function main() {
  const login = await call('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  })
  const token = login.accessToken
  if (!token) {
    throw new Error('El login de admin no devolvio accessToken')
  }

  const activities = await call('/activities?status=PUBLISHED&size=100')
  const e2eActivities = (activities.content ?? []).filter((activity) =>
    /^Actividad E2E/.test(activity.name),
  )
  for (const activity of e2eActivities) {
    await call(`/activities/${activity.id}/status`, {
      method: 'PATCH',
      token,
      body: { status: 'CANCELLED' },
    })
  }

  const sites = await call('/sites?size=100')
  const e2eSites = (sites.content ?? []).filter(
    (site) => site.name === 'Sitio E2E',
  )
  for (const site of e2eSites) {
    await call(`/sites/${site.siteId}/status`, {
      method: 'PATCH',
      token,
      body: { status: 'DRAFT' },
    })
  }

  const zones = await call('/zones')
  const e2eZones = (zones.content ?? []).filter((zone) => zone.name === 'Zona E2E')
  for (const zone of e2eZones) {
    await call(`/zones/${zone.zoneId}/status`, {
      method: 'PATCH',
      token,
      body: { status: 'INACTIVE' },
    })
  }

  console.log(`Actividades canceladas: ${e2eActivities.length}`)
  console.log(`Sitios a DRAFT: ${e2eSites.length}`)
  console.log(`Zonas a INACTIVE: ${e2eZones.length}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
