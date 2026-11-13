import { defineConfig } from '@playwright/test'

/*
 * E2E con el Chrome instalado en el sistema, no con el Chromium que descarga
 * Playwright: ese binario envejece (arrastra CVEs de Chromium ya parcheados)
 * y se lanza sin sandbox por defecto.
 */
// 5173 por defecto: el gateway de dev solo permite ese Origin (CORS).
// Con `reuseExistingServer: false` y `--strictPort`, si esta ocupado falla a proposito;
// `E2E_PORT` permite otro puerto para los specs que no tocan el backend.
const PORT = Number(process.env.E2E_PORT ?? 5173)

export default defineConfig({
  testDir: './e2e',
  // Los e2e comparten backend y datos: en serie evitan carreras y rate-limit.
  workers: 1,
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
