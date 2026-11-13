import { defineConfig } from '@playwright/test'

/*
 * E2E con el Chrome instalado en el sistema, no con el Chromium que descarga
 * Playwright: ese binario envejece (arrastra CVEs de Chromium ya parcheados)
 * y se lanza sin sandbox por defecto.
 */
const PORT = Number(process.env.E2E_PORT ?? 5174)

export default defineConfig({
  testDir: './e2e',
  use: {
    // Puerto propio del arnes: nunca reutiliza el 5173 de un dev server ajeno.
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    launchOptions: { chromiumSandbox: true },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/login`,
    // B3-10: si el puerto esta ocupado, falla en voz alta; no mide otro arbol.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
