import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const tileBodies = new Map<string, Buffer>()
const DATE = '2026-11-17T12:00:00Z'
const category = { categoryId: 'c-1', name: 'Patrimonio', scope: 'SITE', parentId: null, updatedAt: DATE }
const initialSite = {
  siteId: 's-1', managerId: 'manager-1', name: 'Catedral de prueba', description: null,
  categoryId: 'c-1', categoryName: 'Patrimonio', zoneId: 'z-1', zoneName: 'Centro de prueba',
  zoneStatus: 'ACTIVE', latitude: 11.24, longitude: -74.19, photosUrls: [], status: 'PUBLISHED',
  maxCapacity: 25, availability: null, createdAt: DATE, updatedAt: DATE,
}

function pageOf(content: unknown[]) {
  return { content, page: 0, size: 100, total: content.length, totalPages: content.length === 0 ? 0 : 1 }
}

async function setup(page: Page, language: 'es' | 'en') {
  const posts: Record<string, unknown>[] = []
  const puts: Record<string, unknown>[] = []
  let site = { ...initialSite }
  let tiles = 0
  let offline = false
  let failCreate = true
  await page.addInitScript((language) => {
    localStorage.setItem('sm-xplore:language', language)
    sessionStorage.setItem('sm-xplore:session', JSON.stringify({ token: 'ui-fixture', expiresAt: '2100-01-01T00:00:00Z' }))
  }, language)
  await page.route('https://tile.openstreetmap.org/**', async (route) => {
    tiles += 1
    if (offline) { await route.abort(); return }
    const url = route.request().url()
    try {
      if (!tileBodies.has(url)) {
        const response = await route.fetch({ timeout: 6000 })
        if (!response.ok()) throw new Error('Tile unavailable')
        tileBodies.set(url, await response.body())
      }
      await route.fulfill({ body: tileBodies.get(url), contentType: 'image/png' })
    } catch { await route.abort() }
  })
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    if (req.method() === 'POST' && path.endsWith('/sites')) {
      const body = req.postDataJSON() as Record<string, unknown>
      posts.push(body)
      if (failCreate) {
        failCreate = false
        await route.fulfill({ status: 500, json: { title: 'Error', status: 500, code: 'INTERNAL_ERROR' } })
        return
      }
      site = { ...initialSite, ...body, siteId: 's-new' }
      await route.fulfill({ status: 201, json: site })
      return
    }
    if (req.method() === 'PUT' && path.endsWith('/sites/s-new')) {
      const body = req.postDataJSON() as Record<string, unknown>
      puts.push(body)
      site = { ...site, ...body }
      await route.fulfill({ json: site })
      return
    }
    let json: unknown
    if (path.endsWith('/users/me')) json = {
      id: 'manager-1', fullName: 'Gestora de prueba', email: 'gestora@example.com', phone: '',
      role: 'DESTINATION_MANAGER', status: 'ACTIVO', profile: null, signedUpAt: DATE, authVersion: 1,
    }
    else if (path.endsWith('/zones/z-1')) json = {
      zoneId: 'z-1', managerId: 'manager-1', name: 'Centro de prueba', type: null,
      description: null, status: 'ACTIVE', createdAt: DATE, updatedAt: DATE,
    }
    else if (path.endsWith('/categories')) json = pageOf([category])
    else if (path.endsWith('/sites')) json = pageOf([initialSite])
    else json = pageOf([])
    await route.fulfill({ json })
  })
  return { posts, puts, tileCount: () => tiles, offline: (value: boolean) => { offline = value } }
}

async function ready(surface: Locator) {
  await surface.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
  await expect(surface).toHaveAttribute('aria-disabled', 'false', { timeout: 15000 })
}

async function point(form: Locator): Promise<{ latitude: number; longitude: number }> {
  const text = await form.getByRole('group', { name: /^(Ubicación del sitio|Attraction location)$/ }).getByRole('status').textContent()
  const match = text?.match(/(?:Punto seleccionado|Selected point): (-?[\d.]+), (-?[\d.]+)/)
  expect(match).not.toBeNull()
  return { latitude: Number(match![1]), longitude: Number(match![2]) }
}

for (const width of [320, 375, 768, 1280]) {
  for (const language of ['es', 'en'] as const) {
    test(`site point selection and numeric payload at ${width}px (${language})`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 950 })
      await page.emulateMedia({ colorScheme: width === 768 ? 'dark' : 'light' })
      const api = await setup(page, language)
      const es = language === 'es'
      const selectName = es ? 'Elegir punto en el mapa' : 'Choose a point on the map'
      const addName = es ? '+ Añadir sitio' : '+ Add site'
      await page.goto('/app/zonas/z-1')
      const submit = page.getByRole('button', { name: addName, exact: true })
      const form = submit.locator('..').locator('..')
      const surface = form.getByRole('button', { name: selectName })
      await ready(surface)
      await expect(page.getByLabel(es ? 'Latitud' : 'Latitude', { exact: true })).toHaveCount(0)
      await expect(page.getByLabel(es ? 'Longitud' : 'Longitude', { exact: true })).toHaveCount(0)
      const name = form.getByLabel(es ? 'Nombre del sitio o atractivo' : 'Site or attraction name')
      await name.fill('Museo de prueba')
      await form.getByRole('combobox', { name: es ? /^Categoría/ : /^Category/ }).click()
      await page.getByRole('option', { name: 'Patrimonio', exact: true }).click()
      await submit.click()
      await expect(form.getByRole('alert')).toContainText(es ? 'Selecciona la ubicación' : 'Select the attraction location')
      expect(api.posts).toHaveLength(0)

      await ready(surface)
      const box = await surface.boundingBox()
      await page.mouse.click(box!.x + box!.width / 2 + 40, box!.y + box!.height / 2 - 30)
      await expect(form.getByRole('group', { name: /^(Ubicación del sitio|Attraction location)$/ }).getByRole('status')).toContainText(/(?:Punto seleccionado|Selected point):/)
      const selected = await point(form)
      await expect(form.getByRole('alert')).toHaveCount(0)
      expect(selected.latitude).toBeCloseTo(11.242526, 4)
      expect(selected.longitude).toBeCloseTo(-74.186567, 4)
      expect(api.posts).toHaveLength(0)

      await form.getByRole('button', { name: es ? 'Acercar mapa' : 'Zoom in on map' }).click()
      await ready(surface)
      expect(await point(form)).toEqual(selected)
      const pan = await surface.boundingBox()
      await page.mouse.move(pan!.x + pan!.width / 2, pan!.y + pan!.height / 2)
      await page.mouse.down()
      const beforeDrag = api.tileCount()
      await page.mouse.move(pan!.x + pan!.width / 2 + 32, pan!.y + pan!.height / 2 + 16, { steps: 8 })
      expect(api.tileCount()).toBe(beforeDrag)
      await page.mouse.up()
      await ready(surface)
      expect(await point(form)).toEqual(selected)
      expect(api.posts).toHaveLength(0)
      if (es && width !== 320) {
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.screenshot({ path: `docs/diseno/023-site-picker-${width}.png`, fullPage: true, animations: 'disabled' })
      }
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        outside: [...document.querySelectorAll('body *')].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map((element) => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right, text: element.textContent?.slice(0, 60) })),
      }))
      expect(layout.overflow, JSON.stringify(layout.outside)).toBe(0)

      await submit.click()
      await expect.poll(() => api.posts.length).toBe(1)
      await expect(form.getByRole('alert')).toBeVisible()
      await expect(name).toHaveValue('Museo de prueba')
      expect(await point(form)).toEqual(selected)
      await submit.click()
      await expect.poll(() => api.posts.length).toBe(2)
      expect(api.posts[0]).toEqual(api.posts[1])
      expect(api.posts[1]).toMatchObject({ ...selected, name: 'Museo de prueba', categoryId: 'c-1', zoneId: 'z-1', maxCapacity: 10, photosUrls: [] })
      await expect(name).toHaveValue('')
      await expect(form.getByRole('group', { name: /^(Ubicación del sitio|Attraction location)$/ }).getByRole('status')).toContainText(es ? 'Todavía no has elegido' : 'You have not chosen')

      const newSite = page.getByRole('listitem').filter({ has: page.getByText('Museo de prueba', { exact: true }) })
      await newSite.getByRole('button', { name: es ? 'Editar' : 'Edit', exact: true }).click()
      const save = page.getByRole('button', { name: es ? 'Guardar sitio' : 'Save site', exact: true })
      const edit = save.locator('..').locator('..')
      const editSurface = edit.getByRole('button', { name: selectName })
      await ready(editSurface)
      expect(await point(edit)).toEqual(selected)
      await editSurface.focus()
      await page.keyboard.press('ArrowRight')
      await ready(editSurface)
      await expect(editSurface).toBeFocused()
      expect(await point(edit)).toEqual(selected)
      await page.keyboard.press('Enter')
      const edited = await point(edit)
      expect(edited.longitude).toBeGreaterThan(selected.longitude)
      expect(api.puts).toHaveLength(0)
      await save.click()
      await expect.poll(() => api.puts.length).toBe(1)
      expect(api.puts[0]).toMatchObject({ ...edited, name: 'Museo de prueba', categoryId: 'c-1', zoneId: 'z-1', maxCapacity: 10, photosUrls: [] })
      await expect(save).toHaveCount(0)
      await testInfo.attach('selected-coordinates', { body: JSON.stringify({ width, language, selected, edited, dragTileRequests: 0 }), contentType: 'application/json' })
    })
  }
}

test.describe('touch interaction', () => {
  test.use({ viewport: { width: 375, height: 950 }, hasTouch: true, isMobile: true })
  test('touch selection, offline retry and keyboard keep the existing draft', async ({ page }) => {
  const api = await setup(page, 'es')
  await page.goto('/app/zonas/z-1')
  const form = page.getByRole('button', { name: '+ Añadir sitio', exact: true }).locator('..').locator('..')
  const surface = form.getByRole('button', { name: 'Elegir punto en el mapa' })
  await ready(surface)
  const box = await surface.boundingBox()
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2)
  const chosen = await point(form)
  expect(chosen.latitude).toBeCloseTo(11.24, 4)
  expect(chosen.longitude).toBeCloseTo(-74.19, 4)
  api.offline(true)
  await form.getByRole('button', { name: 'Acercar mapa' }).click()
  await expect(form.getByRole('button', { name: 'Reintentar mapa' })).toBeVisible({ timeout: 15000 })
  await expect(surface).toHaveAttribute('aria-disabled', 'true')
  expect(api.posts).toHaveLength(0)
  api.offline(false)
  await form.getByRole('button', { name: 'Reintentar mapa' }).click()
  await ready(surface)
  expect(await point(form)).toEqual(chosen)
  })
})
