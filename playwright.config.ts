import { defineConfig } from '@playwright/test'

/*
 * E2E con el Chrome instalado en el sistema, no con el Chromium que descarga
 * Playwright: ese binario envejece (arrastra CVEs de Chromium ya parcheados)
 * y se lanza sin sandbox por defecto.
 */
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    launchOptions: { chromiumSandbox: true },
    trace: 'retain-on-failure',
  },
  // Reutiliza el `npm run dev` que ya esté corriendo.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/login',
    reuseExistingServer: true,
  },
})
