#!/usr/bin/env node
// Cuenta peticiones /api/v1 por pantalla: montar, abrir detalle y volver.
// Uso: MEASURE_EMAIL=... MEASURE_PASSWORD=... node scripts/measure-requests.mjs
// Requiere el dev server en http://localhost:5173 y el gateway en http://127.0.0.1:8088.
import { chromium } from 'playwright'

const BASE = process.env.MEASURE_BASE ?? 'http://localhost:5173'
const API = process.env.MEASURE_API ?? 'http://127.0.0.1:8088/api/v1'
const EMAIL = process.env.MEASURE_EMAIL
const PASSWORD = process.env.MEASURE_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('Faltan MEASURE_EMAIL y MEASURE_PASSWORD')
  process.exit(1)
}

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
})
const session = await login.json()
if (!session.accessToken) {
  console.error('Login fallido', session)
  process.exit(1)
}

const ROUTES = [
  { route: '/explorar', detail: 'a[href^="/actividades/"]' },
  { route: '/eventos', detail: 'a[href^="/eventos/"]:not([href="/eventos/planificados"])' },
  { route: '/atractivos', detail: 'a[href^="/atractivos/"]' },
  { route: '/servicios', detail: 'a[href^="/servicios/"]' },
  { route: '/recomendaciones', detail: 'a[href="/explorar"]' },
  // Con credenciales de ADMIN mide /app; con un turista da 404 y no cuenta.
  { route: '/app', detail: 'a[href="/app/usuarios"]' },
]

const browser = await chromium.launch({ channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await context.addInitScript(({ token, expiresAt }) => {
  try {
    sessionStorage.setItem('sm-xplore:session', JSON.stringify({ token, expiresAt }))
  } catch {}
}, { token: session.accessToken, expiresAt: session.expiresAt })

const page = await context.newPage()
let bucket = []
page.on('request', (request) => {
  const url = request.url()
  if (!url.includes('/api/v1/')) return
  bucket.push(request.method() + ' ' + url.replace(/^https?:\/\/[^/]+/, ''))
})

const summarize = (items) => {
  const counts = new Map()
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1)
  return [...counts.entries()].map(([url, n]) => ({ url, n }))
}

const results = []
for (const item of ROUTES) {
  bucket = []
  await page.goto(BASE + item.route, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(700)
  const mount = summarize(bucket)

  const link = page.locator(item.detail).first()
  let detail = []
  let detailHref = null
  if ((await link.count()) > 0) {
    detailHref = await link.getAttribute('href')
    bucket = []
    await link.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700)
    detail = summarize(bucket)
  }

  bucket = []
  if (detailHref) {
    await page.goBack()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700)
  }
  const back = summarize(bucket)

  results.push({ route: item.route, detailHref, mount, detail, back })
}

console.log(JSON.stringify(results, null, 2))
await browser.close()
