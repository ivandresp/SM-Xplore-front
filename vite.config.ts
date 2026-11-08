import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
/** Gateway nginx del backend SM-Xplore (`../SM-Xplore`). */
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8088'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // En desarrollo se llama al gateway desde el mismo origen del frontend,
    // así que el navegador no aplica CORS aunque el servicio no lo permita.
    proxy: {
      '/api': { target: BACKEND_URL, changeOrigin: true },
      '/actuator': { target: BACKEND_URL, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Los `*.spec.ts` de `e2e/` son de Playwright, no de vitest.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
