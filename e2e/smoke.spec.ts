import { expect, test } from '@playwright/test'

test('el formulario de acceso se renderiza con sus campos', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  await expect(page.getByLabel('Correo electrónico')).toBeVisible()
  await expect(page.getByLabel('Contraseña')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
})

test('sin sesión, el panel redirige al acceso', async ({ page }) => {
  await page.goto('/app/usuarios')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
})
