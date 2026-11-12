import { expect, test } from '@playwright/test'

/**
 * B3 / H3b: el error de blur refluye el formulario entre mousedown y mouseup.
 * Sin `onMouseDown` con `preventDefault` en el botón de envío, el botón se
 * mueve y el primer clic se pierde. Por eso se pulsa con una pausa realista
 * entre `down` y `up`: en jsdom no hay layout y este caso no se puede probar.
 */
test('el primer clic en Crear cuenta bloquea y enfoca el campo con error', async ({
  page,
}) => {
  await page.goto('/registro')
  await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()

  await page.locator('[name="fullName"]').fill('Prueba B3')
  await page.locator('[name="email"]').fill('b3-e2e@example.com')
  await page.locator('[name="phone"]').fill('6061234')
  await page.locator('[name="password"]').fill('ContraseñaSegura1!')
  await page.locator('[name="dniNumber"]').fill('1020304050')

  // El foco se queda en Nacionalidad con un valor inválido: al pulsar el botón,
  // el blur pinta su error y desplaza el formulario hacia abajo.
  const nationality = page.locator('[name="nationality"]')
  await nationality.fill('a'.repeat(81))

  const submit = page.locator('form button[type="submit"]')
  // Sin scroll, el botón puede quedar fuera del viewport y el clic por
  // coordenadas no lo alcanza (fallaría por otro motivo).
  await submit.scrollIntoViewIfNeeded()
  const box = await submit.boundingBox()
  if (box === null) {
    throw new Error('No se encontró el botón de envío.')
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(150)
  await page.mouse.up()

  // Sin el fix, este clic no llega al submit y no hay foco ni error.
  await expect(nationality).toBeFocused()
  await expect(nationality).toHaveAttribute('aria-invalid', 'true')

  // Anuncio sin ruido: un solo alert (el resumen) y el error del campo en
  // aria-live="polite".
  await expect(page.locator('p[role="alert"]')).toHaveCount(1)
  await expect(page.locator('p[role="alert"]')).toContainText('Revisa los datos')
  await expect(page.locator('p[aria-live="polite"]').first()).toContainText(
    '80 caracteres',
  )
})
