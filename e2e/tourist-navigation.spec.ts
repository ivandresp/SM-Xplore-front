import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const USER = { id: 'tourist-1', fullName: 'Laura Mora', email: 'laura@example.com', phone: '3001234567', role: 'TOURIST', status: 'ACTIVO', profile: null, signedUpAt: '2026-01-01T00:00:00Z', authVersion: 1 }
const PAGE = { content: [], page: 0, size: 12, total: 0, totalPages: 0 }

async function setup(page: Page, language = 'es', authenticated = true) {
  let logouts = 0
  let activityReads = 0
  await page.addInitScript(({ language, authenticated }) => {
    localStorage.setItem('sm-xplore:language', language)
    if (authenticated) sessionStorage.setItem('sm-xplore:session', JSON.stringify({ token: 'tourist-nav-fixture', expiresAt: '2100-01-01T00:00:00Z' }))
  }, { language, authenticated })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/users/me/logout')) {
      logouts += 1
      await route.fulfill({ status: 204 })
    } else if (path.endsWith('/users/me')) await route.fulfill({ json: USER })
    else if (path.endsWith('/auth/login')) await route.fulfill({ json: { accessToken: 'new-token', tokenType: 'Bearer', expiresInSeconds: 3600, expiresAt: '2100-01-01T00:00:00Z', mfaRequired: false, mfaChallengeToken: null } })
    else if (path.endsWith('/recommendations')) await route.fulfill({ json: { touristId: USER.id, generatedAt: '2026-01-01T00:00:00Z', source: 'FALLBACK', items: [] } })
    else if (path.endsWith('/preferences') || path.includes('/reservations/tourists/')) await route.fulfill({ json: [] })
    else if (path.includes('/security-reports/by-user/')) await route.fulfill({ json: { content: [], nextCursor: null, hasNext: false } })
    else {
      if (path.endsWith('/activities')) activityReads += 1
      await route.fulfill({ json: PAGE })
    }
  })
  return { logouts: () => logouts, activityReads: () => activityReads }
}

for (const width of [375, 768, 1280]) {
  for (const language of ['es', 'en']) {
    test(`tourist menus ${width}px ${language}`, async ({ page }) => {
      const es = language === 'es'
      const main = es ? ['Para ti', 'Explorar', 'Reportes de seguridad', 'Mi perfil'] : ['For you', 'Explore', 'Safety reports', 'My profile']
      const catalog = es ? ['Home', 'Atractivos', 'Actividades', 'Eventos', 'Servicios', 'Mis viajes', 'Mis reservas'] : ['Home', 'Attractions', 'Activities', 'Events', 'Services', 'My trips', 'My reservations']
      await page.setViewportSize({ width, height: 950 })
      const api = await setup(page, language)
      async function nav() {
        if (width < 900) {
          const toggle = page.getByRole('button', { name: /^(Abrir menú|Cerrar menú|Open menu|Close menu)$/ })
          if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click()
        }
        return page.getByRole('navigation', { name: width < 900 ? es ? 'Menú principal' : 'Main menu' : es ? 'Navegación principal' : 'Main navigation' })
      }
      async function menu(labels: string[]) {
        const navigation = await nav()
        await expect(navigation.getByRole('link')).toHaveText(labels)
        await expect(page.getByRole('link', { name: /^(Ir al panel|Go to dashboard)$/ })).toHaveCount(0)
        await expect(page.getByRole('complementary')).toHaveCount(0)
      }
      await page.goto('/')
      await expect(page).toHaveURL(/\/recomendaciones$/)
      expect(api.activityReads()).toBe(0)
      await menu(main)
      await (await nav()).getByRole('link', { name: main[2], exact: true }).click()
      await expect(page).toHaveURL(/\/reportes$/)
      await menu(main)
      await (await nav()).getByRole('link', { name: main[3], exact: true }).click()
      await expect(page).toHaveURL(/\/perfil$/)
      await menu(main)
      await (await nav()).getByRole('link', { name: main[1], exact: true }).click()
      await expect(page).toHaveURL(/\/explorar$/)
      await menu(catalog)
      for (const [label, path] of [[catalog[1], '/atractivos'], [catalog[3], '/eventos'], [catalog[4], '/servicios'], [catalog[5], '/itinerario'], [catalog[6], '/mis-reservas']]) {
        await (await nav()).getByRole('link', { name: label, exact: true }).click()
        await expect(page).toHaveURL(new RegExp(`${path}$`))
        await menu(catalog)
      }
      await (await nav()).getByRole('link', { name: 'Home', exact: true }).click()
      await expect(page).toHaveURL(/\/recomendaciones$/)
      await menu(main)
      if (width < 900) await page.keyboard.press('Escape')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.screenshot({ path: `/tmp/tourist-navigation-${width}-${language}.png`, fullPage: true })
      await page.getByRole('button', { name: es ? 'Salir' : 'Sign out', exact: true }).click()
      await expect(page).toHaveURL(/\/login$/)
      expect(api.logouts()).toBe(1)
      expect(await page.evaluate(() => sessionStorage.getItem('sm-xplore:session'))).toBeNull()
    })
  }
}

for (const [from, to] of [['/app', '/recomendaciones'], ['/app/perfil', '/perfil'], ['/app/reportes', '/reportes'], ['/app/explorar', '/explorar'], ['/app/mis-reservas', '/mis-reservas']]) {
  test(`tourist legacy ${from}`, async ({ page }) => {
    await setup(page)
    await page.goto(`${from}?origen=legacy#datos`)
    await expect(page).toHaveURL(new RegExp(`${to}\\?origen=legacy#datos$`))
    await expect(page.getByRole('complementary')).toHaveCount(0)
  })
}

for (const entry of ['/login', '/reportes/nuevo']) {
  test(`tourist login from ${entry}`, async ({ page }) => {
    await setup(page, 'es', false)
    await page.goto(entry)
    await page.getByLabel('Correo electrónico', { exact: true }).fill(USER.email)
    await page.getByLabel('Contraseña', { exact: true }).fill('ContraseñaSegura1!')
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    await expect(page).toHaveURL(entry === '/login' ? /\/recomendaciones$/ : /\/reportes\/nuevo$/)
  })
}

for (const width of [375, 1280]) {
test(`tourist preferences are edited only in profile and affect Para ti ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 })
  await setup(page)
  async function navigate(label: string) {
    if (width < 900) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
    const nav = page.getByRole('navigation', { name: width < 900 ? 'Menú principal' : 'Navegación principal' })
    await nav.getByRole('link', { name: label, exact: true }).click()
  }
  let preferences: Array<{ touristId: string; categoryId: string; source: string; weight: number; updatedAt: string }> = []
  let preferenceReads = 0
  let categoryReads = 0
  let writes = 0
  let recommendationReads = 0
  await page.route('**/api/v1/categories**', async route => {
    categoryReads += 1
    await route.fulfill({ json: { ...PAGE, total: 1, totalPages: 1, content: [{ categoryId: 'c1', name: 'Playas', scope: 'GENERAL', parentId: null, updatedAt: '2026-01-01T00:00:00Z' }] } })
  })
  await page.route('**/api/v1/preferences**', async route => {
    if (route.request().method() === 'POST') {
      writes += 1
      preferences = [{ touristId: USER.id, categoryId: 'c1', source: 'EXPLICIT', weight: 1, updatedAt: '2026-01-01T00:00:00Z' }]
      await route.fulfill({ status: 201, json: preferences[0] })
    } else if (route.request().method() === 'DELETE') {
      writes += 1
      preferences = []
      await route.fulfill({ status: 204 })
    } else {
      preferenceReads += 1
      await route.fulfill({ json: preferences })
    }
  })
  await page.route('**/api/v1/recommendations**', route => {
    recommendationReads += 1
    return route.fulfill({ json: {
      touristId: USER.id, generatedAt: '2026-01-01T00:00:00Z', source: preferences.length ? 'AFFINITY' : 'FALLBACK',
      items: preferences.length ? [{ itemType: 'ACTIVITY', itemId: 'a-1', name: 'Plan recomendado según perfil', categoryId: 'c1', siteId: 's1', score: 0.8, reason: 'Según tus intereses', signals: { affinity: 1, quality: 0.5, distanceKm: null, novelty: 0.5 } }] : [],
    } })
  })
  await page.goto('/recomendaciones')
  await expect(page.getByText('Aún no hay recomendaciones', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tus intereses', exact: true })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Añadir categoría' })).toHaveCount(0)
  expect(preferenceReads).toBe(0)
  expect(categoryReads).toBe(0)
  await navigate('Mi perfil')
  const dropdown = page.getByRole('combobox', { name: 'Añadir categoría' })
  const addButton = page.getByRole('button', { name: 'Añadir', exact: true })
  if (width < 768) {
    await expect(addButton.locator('svg')).toBeVisible()
    await expect.poll(async () => {
      const [field, button] = await Promise.all([dropdown.boundingBox(), addButton.boundingBox()])
      return !!field && !!button && button.x >= field.x + field.width && Math.abs(button.y + button.height - field.y - field.height) <= 2 && button.width >= 44 && button.height >= 44
    }).toBe(true)
    expect((await addButton.innerText()).trim()).toBe('')
  } else await expect(addButton).toHaveText('Añadir')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `/tmp/profile-add-preference-${width}.png`, fullPage: true })
  await dropdown.click()
  await page.getByRole('option', { name: 'Playas', exact: true }).click()
  await page.getByRole('button', { name: 'Añadir', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Quitar Playas', exact: true })).toBeVisible()
  const readsAfterProfile = [preferenceReads, categoryReads]
  await navigate('Para ti')
  await expect(page.getByRole('heading', { name: 'Plan recomendado según perfil', exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Añadir categoría' })).toHaveCount(0)
  expect([preferenceReads, categoryReads]).toEqual(readsAfterProfile)
  expect(writes).toBe(1)
  await navigate('Mi perfil')
  await page.getByRole('button', { name: 'Quitar Playas', exact: true }).click()
  await expect(page.getByText('Aún no has marcado ninguna categoría.', { exact: true })).toBeVisible()
  await navigate('Para ti')
  await expect(page.getByText('Aún no hay recomendaciones', { exact: true })).toBeVisible()
  expect(writes).toBe(2)
  expect(recommendationReads).toBe(3)
})

}

for (const width of [375, 768, 1280]) {
  test(`tourist site itinerary dates ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 })
    await setup(page)
    await page.addInitScript(() => {
      if (!localStorage.getItem('sm-xplore:itinerary')) localStorage.setItem('sm-xplore:itinerary', JSON.stringify({
        name: 'Viaje', from: '2026-12-01', to: '2026-12-05', entries: [
          { itemId: 's1', type: 'SITE', name: 'Tayrona', startsAt: '2026-12-03T12:00:00', price: 0 },
          { itemId: 'a1', type: 'ACTIVITY', name: 'Paseo', startsAt: '2026-12-02T12:00:00', price: 100 },
        ],
      }))
    })
    let reservationRequests = 0
    await page.route('**/api/v1/reservations', async route => { reservationRequests++; await route.fulfill({ status: 500, json: {} }) })
    await page.goto('/itinerario')
    const visit = page.getByLabel('Fecha de visita a Tayrona')
    await expect(visit).toHaveValue('2026-12-03')
    await expect(page.getByRole('button', { name: 'Reservar', exact: true })).toHaveCount(1)
    await visit.fill('2026-12-01')
    await expect(page.locator('h3').first()).toContainText('1 de dic')
    await page.reload()
    await expect(visit).toHaveValue('2026-12-01')
    await expect(page.getByText('No requiere reserva')).toBeVisible()
    expect(reservationRequests).toBe(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/itinerary-sites-${width}.png`, fullPage: true })
    await page.getByLabel('Desde', { exact: true }).fill('2026-12-02')
    await expect(page.getByText('Revisa las fechas de visita')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar itinerario' })).toBeDisabled()
    await visit.fill('2026-12-04')
    await expect(page.getByText('Revisa las fechas de visita')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Guardar itinerario' })).toBeEnabled()
  })
}

for (const width of [375, 768, 1280]) {
  test(`tourist report response button ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 })
    await setup(page)
    const report = { id: 'r-1', user: { id: USER.id, name: USER.fullName }, title: 'Reporte de prueba',
      description: 'Descripción del incidente. '.repeat(45), location: { latitude: 11.24, longitude: -74.19 },
      photosUrls: [], status: 'ONGOING', createdAt: '2026-11-17T12:00:00Z', updatedAt: null }
    await page.route('**/api/**/security-reports/**', async route => {
      const path = new URL(route.request().url()).pathname
      const comments = [1, 2].map(id => ({ id: `c-${id}`, reportId: report.id, user: report.user, content: `Respuesta ${id}`, createdAt: report.createdAt }))
      await route.fulfill({ json: path.endsWith('/comments') ? { content: comments, nextCursor: null, hasNext: false }
        : path.includes('/by-user/') ? { content: [report], nextCursor: null, hasNext: false } : report })
    })
    await page.goto('/reportes')
    const button = page.getByRole('button', { name: 'Ver 2 respuestas', exact: true })
    await expect(button).toBeVisible()
    await expect(button).toHaveText('2')
    await expect(button.locator('svg')).toBeVisible()
    const filters = page.getByRole('button', { name: 'Filtros', exact: true })
    await expect(filters).toHaveAttribute('aria-expanded', 'false')
    const createReport = page.getByRole('button', { name: 'Nuevo reporte', exact: true })
    const [filterBox, createBox] = await Promise.all([filters.boundingBox(), createReport.boundingBox()])
    expect(filterBox && createBox).toBeTruthy()
    expect(createBox!.x).toBeGreaterThan(filterBox!.x)
    expect(Math.abs(createBox!.y - filterBox!.y)).toBeLessThanOrEqual(1)
    expect(createBox!.width).toBe(createBox!.height)
    expect(createBox!.width).toBeGreaterThanOrEqual(44)
    await expect(createReport.locator('svg')).toBeVisible()
    const filterRegion = page.getByRole('region', { name: 'Filtros del catálogo' })
    const reportCard = page.getByRole('article').filter({ has: button })
    async function checkReportGap() {
      const [bar, card] = await Promise.all([filterRegion.boundingBox(), reportCard.boundingBox()])
      expect(bar && card).toBeTruthy()
      const gap = card!.y - bar!.y - bar!.height
      expect(gap).toBeGreaterThanOrEqual(10)
      expect(gap).toBeLessThanOrEqual(16)
    }
    await checkReportGap()
    await createReport.click()
    await expect(page).toHaveURL(/\/reportes\/nuevo$/)
    await page.goBack()
    await expect(button).toBeVisible()
    await filters.click()
    await checkReportGap()
    await page.getByRole('button', { name: 'Resueltos', exact: true }).click()
    await expect(button).toHaveCount(0)
    await page.getByRole('button', { name: 'Ver todos', exact: true }).first().click()
    await expect(button).toBeVisible()
    const sort = page.getByRole('combobox', { name: 'Ordenar por fecha' })
    await sort.click()
    await page.getByRole('option', { name: 'Más antiguos', exact: true }).click()
    await expect(sort).toContainText('Más antiguos')
    await filters.click()
    await expect(sort).toBeHidden()
    const card = page.getByRole('article').filter({ has: button })
    await expect(card).not.toContainText('11.24')
    await expect(card).not.toContainText('Ver detalle y responder')
    await expect(card.getByText('En curso', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/report-response-${width}.png`, fullPage: true })
    await button.click()
    await expect(page).toHaveURL(/\/reportes\/r-1#comentarios$/)
    const section = page.locator('#comentarios')
    await expect(section).toBeFocused()
    await expect(page.getByRole('heading', { name: 'Comentarios (2)', exact: true })).toBeInViewport()
    const back = page.getByRole('button', { name: 'Volver', exact: true })
    await back.scrollIntoViewIfNeeded()
    await expect(back.locator('svg')).toBeVisible()
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect(await back.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/back-button-${width}.png`, fullPage: true })
    await back.click()
    await expect(page).toHaveURL(/\/reportes$/)

  })
}

for (const width of [375, 768, 1280]) {
  test(`tourist bounded collapsible comments ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 })
    await setup(page)
    const report = { id: 'r-1', user: { id: USER.id, name: USER.fullName }, title: 'Reporte de prueba', description: 'Descripción que se retira.', location: null, photosUrls: [], status: 'ONGOING', createdAt: '2026-11-17T12:00:00Z', updatedAt: null }
    const comments = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, reportId: report.id, user: report.user, content: `Comentario ${i}: ` + 'Texto del comentario. '.repeat(4), createdAt: report.createdAt }))
    let posted = false
    await page.route('**/api/**/security-reports/**', async route => {
      const url = new URL(route.request().url())
      if (!url.pathname.endsWith('/comments')) { await route.fulfill({ json: report }); return }
      if (route.request().method() === 'POST') { posted = true; await route.fulfill({ json: { ...comments[0], id: 'new', content: route.request().postDataJSON().content } }); return }
      await route.fulfill({ json: { content: url.searchParams.has('cursor') ? comments.slice(10) : comments.slice(0, 10), nextCursor: url.searchParams.has('cursor') ? null : 'next', hasNext: !url.searchParams.has('cursor') } })
    })
    await page.goto('/reportes/r-1#comentarios')
    const panel = page.locator('#comentarios')
    const scroll = page.getByRole('region', { name: 'Lista de comentarios' })
    const input = page.getByLabel('Añadir un comentario')
    await expect(scroll).toBeVisible()
    await expect(page.getByText('Descripción que se retira.')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Ficha del reporte' })).toBeVisible()
    const sheet = page.getByRole('heading', { name: 'Ficha del reporte' }).locator('..')
    const [sheetBox, commentsBox] = await Promise.all([sheet.boundingBox(), panel.boundingBox()])
    expect(sheetBox).toBeTruthy()
    expect(commentsBox).toBeTruthy()
    if (width < 1000) expect(sheetBox!.y).toBeGreaterThanOrEqual(commentsBox!.y + commentsBox!.height)
    else expect(sheetBox!.x + sheetBox!.width).toBeLessThanOrEqual(commentsBox!.x)
    const height = await scroll.evaluate(el => el.clientHeight)
    expect(await scroll.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
    expect(await scroll.evaluate(el => el.contains(document.querySelector('textarea')))).toBe(false)
    await scroll.evaluate(el => { el.scrollTop = el.scrollHeight })
    await page.getByRole('button', { name: 'Ver más comentarios' }).click()
    await expect(panel.getByRole('listitem')).toHaveCount(20)
    expect(await scroll.evaluate(el => el.clientHeight)).toBe(height)
    expect(await panel.locator('li').first().evaluate(el => getComputedStyle(el).borderBottomWidth)).toBe('0px')
    const initialHeight = await input.evaluate(el => el.clientHeight)
    await input.fill('Comentario de varias líneas. '.repeat(20))
    expect(await input.evaluate(el => el.clientHeight)).toBeGreaterThan(initialHeight)
    expect(await input.evaluate(el => el.getBoundingClientRect().height)).toBeLessThanOrEqual(162)
    await panel.locator('summary').click()
    await expect(input).toBeHidden()
    await page.setViewportSize({ width: width + 1, height: 950 })
    await page.setViewportSize({ width, height: 950 })
    await panel.locator('summary').click()
    await expect(input).toBeVisible()
    expect(await input.evaluate(el => el.clientHeight)).toBeGreaterThan(initialHeight)
    const send = page.getByRole('button', { name: 'Publicar comentario', exact: true })
    await expect(send.locator('svg')).toBeVisible()
    await send.click()
    await expect(input).toHaveValue('')
    expect(posted).toBe(true)
    expect(await input.evaluate(el => el.clientHeight)).toBe(initialHeight)
    await panel.locator('summary').click()
    await expect(scroll).toBeHidden()
    await expect(input).toBeHidden()
    await panel.locator('summary').click()
    await expect(scroll).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/comments-panel-${width}.png`, fullPage: true })
  })
}

for (const width of [375, 1280]) {
  for (const target of ['recommendations', 'reports', 'catalog']) {
    test(`tourist expired session action ${target} ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 })
      await page.clock.install({ time: new Date('2099-01-01T12:00:00Z') })
      await setup(page)
      let failures = 0
      let logouts = 0
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname
        if (path.endsWith('/users/me/logout')) {
          logouts++
          await route.fulfill({ status: 401, json: { status: 401 } })
          return
        }
        if (path.endsWith('/recommendations')) {
          if (!route.request().headers()['authorization']) {
            failures++; await route.fulfill({ status: 401, json: { status: 401 } }); return
          }
          await route.fulfill({ json: { touristId: USER.id, generatedAt: '2099-01-01T12:00:00Z', source: 'AFFINITY', items: Array.from({ length: 20 }, (_, i) => ({ itemType: 'ACTIVITY', itemId: `item${i}`, name: `Plan ${i}`, categoryId: 'c1', siteId: 's1', score: 0.8, reason: 'Por tus intereses', signals: { affinity: 0.5, quality: 0.8, distanceKm: null, novelty: 0.4 } })) } })
          return
        }
        if ((target === 'reports' && path.includes('/security-reports/by-user/')) || (target === 'catalog' && path.endsWith('/activities'))) {
          failures++; await route.fulfill({ status: 401, json: { status: 401 } }); return
        }
        await route.fallback()
      })
      await page.goto('/recomendaciones')
      await expect(page.getByText('Plan 0', { exact: true })).toBeVisible()
      await page.clock.setSystemTime(new Date('2101-01-01T12:00:00Z'))
      if (target === 'recommendations') {
        await page.getByRole('button', { name: 'Ver más sugerencias' }).click()
        await expect(page.getByText('Plan 0', { exact: true })).toBeVisible()
      } else {
        if (width < 900) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
        const nav = page.getByRole('navigation', { name: width < 900 ? 'Menú principal' : 'Navegación principal' })
        await nav.getByRole('link', { name: target === 'reports' ? 'Reportes de seguridad' : 'Explorar', exact: true }).click()
      }
      const exit = page.getByRole('button', { name: 'Cerrar sesión', exact: true })
      await expect(exit).toBeVisible()
      await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toHaveCount(0)
      expect(failures).toBe(1)
      await page.screenshot({ path: `/tmp/session-expired-${target}-${width}.png`, fullPage: true })
      await exit.click()
      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
      expect(logouts).toBe(1)
      expect(failures).toBe(1)
      expect(await page.evaluate(() => sessionStorage.getItem('sm-xplore:session'))).toBeNull()
    })
  }
}

for (const width of [320, 360, 375, 414, 768, 1280]) {
  test(`tourist report map location ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 950 })
    await setup(page)
    await page.addInitScript(() => {
      const testWindow = window as Window & { reportGpsCalls?: number }
      testWindow.reportGpsCalls = 0
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: () => { testWindow.reportGpsCalls!++ } } })
    })
    await page.route('**/tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#d6e4d0"/></svg>' }))
    const posts: Array<Record<string, unknown>> = []
    await page.route('**/api/**/security-reports', async route => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      posts.push(body)
      if (width === 375 && posts.length === 1) {
        await route.fulfill({ status: 500, json: { status: 500 } }); return
      }
      await route.fulfill({ status: 201, json: { ...body, id: 'r-new', user: { id: USER.id, name: USER.fullName }, status: 'ONGOING', createdAt: '2026-11-17T12:00:00Z', updatedAt: null, photosUrls: [] } })
    })
    await page.goto('/reportes/nuevo')
    await expect(page.getByRole('heading', { name: 'Nuevo reporte de seguridad' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Elegir punto en el mapa' })).toHaveAttribute('aria-disabled', 'false')
    await page.setViewportSize({ width, height: 950 })
    const layout = await page.evaluate(() => ({
      viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll('main, form, section, input, textarea, button, img')).flatMap(el => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) ? [{ tag: el.tagName, class: el.className, left: r.left, right: r.right, width: r.width }] : []
      }).slice(0, 12),
    }))
    expect(layout.documentWidth, JSON.stringify(layout)).toBeLessThanOrEqual(width)
    await expect(page.getByRole('button', { name: 'Usar mi ubicación actual' })).toHaveCount(0)
    const surface = page.getByRole('button', { name: 'Elegir punto en el mapa' })
    await expect(surface).toHaveAttribute('aria-disabled', 'false')
    await surface.press('Enter')
    await expect(page.getByText('Punto seleccionado: 11.240400, -74.199000', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Quitar punto seleccionado' }).click()
    await expect(page.getByText('Todavía no has elegido una ubicación.', { exact: true })).toBeVisible()
    await surface.press('ArrowRight')
    await expect(surface).toHaveAttribute('aria-disabled', 'false')
    await surface.press('Enter')
    await expect(page.getByText(/Punto seleccionado:/)).toBeVisible()
    await page.setViewportSize({ width: 1024, height: 950 })
    await page.setViewportSize({ width, height: 950 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await expect(page.getByText(/Punto seleccionado:/)).toBeVisible()
    await page.getByLabel('Título', { exact: true }).fill('Incidente con ubicación elegida')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/report-location-map-${width}.png`, fullPage: true })
    const submit = page.getByRole('button', { name: 'Enviar reporte', exact: true })
    await submit.click()
    if (width === 375) {
      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page.getByText(/Punto seleccionado:/)).toBeVisible()
      await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Incidente con ubicación elegida')
      await submit.click()
    }
    await expect(page).toHaveURL(/\/reportes$/)
    const point = posts.at(-1)!.location as { latitude: number; longitude: number }
    expect(point.latitude).toBeCloseTo(11.2404, 5)
    expect(point.longitude).toBeGreaterThan(-74.199)
    expect(await page.evaluate(() => (window as Window & { reportGpsCalls?: number }).reportGpsCalls)).toBe(0)
  })
}
