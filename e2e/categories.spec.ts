import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DATE = '2026-11-17T12:00:00Z'
const roles = ['ADMIN', 'DESTINATION_MANAGER'] as const

async function setup(page: Page, role: string | null, language: string) {
  const posts: Record<string, unknown>[] = []
  const queries: URL[] = []
  let failCreate = true
  let failList = false
  const records = Array.from({ length: 21 }, (_, index) => ({
    categoryId: `c-${index}`, name: `Categoría de prueba ${index}`, scope: 'SITE', parentId: null, updatedAt: DATE,
  }))
  records.push({ categoryId: 'service', name: 'Servicio de prueba', scope: 'SERVICE', parentId: null, updatedAt: DATE })
  await page.addInitScript(({ role, language }) => {
    localStorage.setItem('sm-xplore:language', language)
    if (role) sessionStorage.setItem('sm-xplore:session', JSON.stringify({ token: 'category-fixture', expiresAt: '2100-01-01T00:00:00Z' }))
  }, { role, language })
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/users/me')) {
      await route.fulfill({ json: { id: 'user-1', fullName: 'Usuario de prueba', email: 'test@example.com', phone: '', role,
        status: 'ACTIVO', profile: null, signedUpAt: DATE, authVersion: 1 } })
    } else if (url.pathname.endsWith('/categories') && request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>
      posts.push(body)
      if (failCreate) {
        failCreate = false
        await route.fulfill({ status: 500, json: { status: 500, title: 'Error' } })
      } else {
        const record = { categoryId: `new-${posts.length}`, name: String(body.name), scope: String(body.scope), parentId: null, updatedAt: DATE }
        records.unshift(record)
        await route.fulfill({ status: 201, json: record })
      }
    } else if (url.pathname.endsWith('/categories')) {
      queries.push(url)
      if (failList) {
        failList = false
        await route.fulfill({ status: 503, json: { status: 503, title: 'Unavailable' } })
        return
      }
      const scope = url.searchParams.get('scope')
      const filtered = records.filter((item) => !scope || item.scope === scope)
      const pageNumber = Number(url.searchParams.get('page') ?? 0)
      const size = Number(url.searchParams.get('size') ?? 20)
      await route.fulfill({ json: { content: filtered.slice(pageNumber * size, (pageNumber + 1) * size), page: pageNumber, size,
        total: filtered.length, totalPages: Math.ceil(filtered.length / size) } })
    } else await route.fulfill({ json: { content: [], page: 0, size: 20, total: 0, totalPages: 0 } })
  })
  return { posts, queries, failNextList: () => { failList = true } }
}

for (const role of roles) {
  for (const width of [375, 768, 1280]) {
    test(`${role} registers all scopes at ${width}px`, async ({ page }) => {
      const es = role === 'DESTINATION_MANAGER'
      await page.setViewportSize({ width, height: 950 })
      await page.emulateMedia({ colorScheme: width === 768 ? 'dark' : 'light' })
      const api = await setup(page, role, es ? 'es' : 'en')
      await page.goto('/app/categorias')
      await expect(page.getByRole('heading', { level: 1, name: es ? 'Categorías' : 'Categories' })).toBeVisible()
      await expect(page.getByText('Categoría de prueba 0', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: es ? 'Página siguiente' : 'Next page' }).click()
      await expect(page.getByText('Servicio de prueba', { exact: true })).toBeVisible()
      expect(api.queries.at(-1)?.searchParams.get('page')).toBe('1')
      const form = page.getByRole('form', { name: es ? 'Nueva categoría' : 'New category' })
      const input = form.getByLabel(es ? 'Nombre de la categoría' : 'Category name')
      const submit = form.getByRole('button', { name: es ? 'Crear categoría' : 'Create category' })
      for (const [scope, label] of [
        ['SITE', es ? 'Sitio turístico' : 'Tourist attraction'], ['EVENT', es ? 'Evento' : 'Event'],
        ['ACTIVITY', es ? 'Actividad' : 'Activity'], ['GENERAL', 'General'],
      ]) {
        await input.fill(`  Prueba ${scope}  `)
        await form.getByRole('combobox').click()
        await page.getByRole('option', { name: label, exact: true }).click()
        await submit.click()
        if (scope === 'SITE') {
          await expect(form.getByRole('alert')).toBeVisible()
          await expect(input).toHaveValue(`  Prueba ${scope}  `)
          await submit.click()
        }
        await expect(form.getByRole('status')).toHaveText(es ? 'Categoría registrada.' : 'Category registered.')
        await expect(input).toHaveValue('')
        await expect(page.getByText(`Prueba ${scope}`, { exact: true })).toBeVisible()
        expect(api.posts.at(-1)).toEqual({ name: `Prueba ${scope}`, scope, parentId: null })
      }
      await page.getByRole('combobox', { name: es ? 'Filtrar por tipo' : 'Filter by type' }).click()
      await page.getByRole('option', { name: es ? 'Sitio turístico' : 'Tourist attraction', exact: true }).click()
      await expect(page.getByText('Categoría de prueba 0', { exact: true })).toBeVisible()
      api.failNextList()
      await page.getByRole('button', { name: es ? 'Página siguiente' : 'Next page' }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      await page.getByRole('button', { name: es ? 'Reintentar' : 'Try again', exact: true }).click()
      await expect(page.getByText('Categoría de prueba 20', { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.evaluate(() => window.scrollTo(0, 0))
      if (es) await page.screenshot({ path: `docs/diseno/025-categories-${width}.png`, fullPage: true })
    })
  }
}

for (const role of ['GUIDE', 'TOURIST', null]) {
  test(`category route rejects ${role ?? 'anonymous'}`, async ({ page }) => {
    const api = await setup(page, role, 'es')
    await page.goto('/app/categorias')
    await expect(page).toHaveURL(role === 'TOURIST' ? /\/recomendaciones$/ : role ? /\/app$/ : /\/login$/)
    expect(api.posts).toHaveLength(0)
    await expect(page.getByRole('link', { name: 'Categorías', exact: true })).toHaveCount(0)
  })
}
