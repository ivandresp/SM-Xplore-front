import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DATE = '2026-11-17T12:00:00Z'
const report = { id: 'r-1', user: { id: 'user-1', name: 'Usuario de prueba' }, title: 'Reporte de prueba', description: 'Descripción de prueba',
  location: null, photosUrls: [], status: 'ONGOING', createdAt: DATE, updatedAt: DATE }
const cursor = (content: unknown[]) => ({ content, nextCursor: null, hasNext: false })

async function setup(page: Page, role: string | null, language = 'es') {
  const ownRequests: string[] = []
  const globalRequests: string[] = []
  const posts: Record<string, unknown>[] = []
  let failCreate = true
  let created = false
  await page.addInitScript(({ role, language }) => {
    localStorage.setItem('sm-xplore:language', language)
    if (role) sessionStorage.setItem('sm-xplore:session', JSON.stringify({ token: 'guide-panel-fixture', expiresAt: '2100-01-01T00:00:00Z' }))
  }, { role, language })
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (path.endsWith('/users/me')) {
      await route.fulfill({ json: { id: 'user-1', fullName: 'Usuario de prueba', email: 'test@example.com', phone: '', role,
        status: 'ACTIVO', profile: null, signedUpAt: DATE, authVersion: 1 } })
    } else if (path.endsWith('/security-reports') && request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>
      posts.push(body)
      if (failCreate) {
        failCreate = false
        await route.fulfill({ status: 500, json: { status: 500, title: 'Error' } })
      } else {
        created = true
        await route.fulfill({ status: 201, json: { ...report, id: 'r-2', title: String(body.title) } })
      }
    } else if (path.includes('/security-reports/by-user/')) {
      ownRequests.push(path)
      await route.fulfill({ json: cursor(created ? [report, { ...report, id: 'r-2', title: 'Nuevo reporte de prueba' }] : [report]) })
    } else if (path.endsWith('/security-reports/counts')) {
      globalRequests.push(path)
      await route.fulfill({ json: { ONGOING: 1, REPORTED: 0, SOLVED: 0 } })
    } else if (path.endsWith('/security-reports')) {
      globalRequests.push(path)
      await route.fulfill({ json: cursor([report]) })
    } else if (path.endsWith('/comments')) await route.fulfill({ json: cursor([]) })
    else if (path.endsWith('/security-reports/r-1')) await route.fulfill({ json: report })
    else if (path.includes('/reservations/')) await route.fulfill({ json: [] })
    else await route.fulfill({ json: { content: [], page: 0, size: 100, total: 0, totalPages: 0 } })
  })
  return { ownRequests, globalRequests, posts }
}

for (const role of ['GUIDE', 'SERVICE_PROVIDER']) {
for (const width of [1280, 1920]) {
  for (const language of ['es', 'en']) {
    test(`${role} report flow stays in panel ${width}px ${language}`, async ({ page }) => {
      const es = language === 'es'
      await page.setViewportSize({ width, height: 950 })
      await page.emulateMedia({ colorScheme: width === 1920 ? 'dark' : 'light' })
      const api = await setup(page, role, language)
      await page.goto('/app')
      const sidebar = page.getByRole('complementary')
      await expect(sidebar).toBeVisible()
      const nav = sidebar.getByRole('link', { name: es ? 'Reportes de seguridad' : 'Safety reports', exact: true })
      await expect(nav).toHaveAttribute('href', '/app/reportes')
      await nav.click()
      await expect(page).toHaveURL(/\/app\/reportes$/)
      await expect(page.getByRole('heading', { level: 1, name: es ? 'Mis reportes de seguridad' : 'My safety reports' })).toBeVisible()
      await expect(sidebar).toBeVisible()
      await expect(nav).toHaveAttribute('aria-current', 'page')
      await page.getByRole('link', { name: es ? 'Ver detalle y responder' : 'View details and respond' }).click()
      await expect(page).toHaveURL(/\/app\/reportes\/r-1$/)
      await expect(page.getByRole('heading', { name: report.title, exact: true })).toBeVisible()
      await expect(sidebar).toBeVisible()
      await expect(page.getByRole('button', { name: /Marcar como|Mark as/ })).toHaveCount(0)
      await page.getByRole('link', { name: es ? /Volver a mis reportes/ : /Back to my reports/ }).click()
      await expect(page).toHaveURL(/\/app\/reportes$/)
      const create = page.getByRole('link', { name: es ? 'Nuevo reporte' : 'New report', exact: true })
      await create.click()
      await expect(page).toHaveURL(/\/app\/reportes\/nuevo$/)
      await expect(sidebar).toBeVisible()
      await page.getByRole('link', { name: es ? 'Cancelar' : 'Cancel', exact: true }).click()
      await expect(page).toHaveURL(/\/app\/reportes$/)
      await create.click()
      const title = page.getByLabel(es ? 'Título' : 'Title', { exact: true })
      await title.fill('Nuevo reporte de prueba')
      const submit = page.getByRole('button', { name: es ? 'Enviar reporte' : 'Submit report', exact: true })
      await submit.click()
      await expect(page.getByRole('alert')).toBeVisible()
      await expect(sidebar).toBeVisible()
      await expect(title).toHaveValue('Nuevo reporte de prueba')
      await submit.click()
      await expect(page).toHaveURL(/\/app\/reportes$/)
      await expect(page.getByText('Nuevo reporte de prueba', { exact: true })).toBeVisible()
      await expect(sidebar).toBeVisible()
      expect(api.posts).toHaveLength(2)
      expect(api.ownRequests.every((path) => path.endsWith('/by-user/user-1'))).toBe(true)
      expect(api.globalRequests).toHaveLength(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      if (es) await page.screenshot({ path: `/tmp/${role.toLowerCase()}-reports-${width}.png`, fullPage: true })
    })
  }
}

for (const path of ['/reportes', '/reportes/r-1', '/reportes/nuevo']) {
  test(`${role} legacy ${path} preserves query and hash`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 950 })
    await setup(page, role)
    await page.goto(`${path}?origen=legacy#contenido`)
    await expect(page).toHaveURL(new RegExp(`/app${path}\\?origen=legacy#contenido$`))
    await expect(page.getByRole('complementary')).toBeVisible()
  })
}

}

for (const role of ['ADMIN', 'DESTINATION_MANAGER']) {
  test(`${role} keeps management panel`, async ({ page }) => {
    const api = await setup(page, role)
    await page.goto('/app/reportes')
    await expect(page.getByRole('complementary')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Reportes de seguridad' })).toBeVisible()
    expect(api.ownRequests).toHaveLength(0)
    expect(api.globalRequests.length).toBeGreaterThan(0)
  })
}

for (const role of ['TOURIST']) {
  test(`${role} keeps public report screen and cannot enter guide reports`, async ({ page }) => {
    await setup(page, role)
    await page.goto('/reportes')
    await expect(page.getByRole('heading', { level: 1, name: 'Mis reportes de seguridad' })).toBeVisible()
    await expect(page).toHaveURL(/\/reportes$/)
    await page.goto('/app/reportes')
    await expect(page).toHaveURL(/\/reportes$/)
    await expect(page.getByRole('complementary')).toHaveCount(0)
  })
}

test('guide report routes still require a session', async ({ page }) => {
  await setup(page, null)
  await page.goto('/app/reportes')
  await expect(page).toHaveURL(/\/login$/)
})

for (const role of ['GUIDE', 'SERVICE_PROVIDER']) {
test(`${role} mobile retains responsive panel navigation`, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 950 })
  await setup(page, role)
  await page.goto('/app/reportes')
  await expect(page.getByRole('heading', { level: 1, name: 'Mis reportes de seguridad' })).toBeVisible()
  await expect(page.getByRole('complementary')).not.toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

}
