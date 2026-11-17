import { defineConfig } from '@playwright/test'
import base from './playwright.config'

const port = Number(process.env.E2E_PORT ?? 5187)
const executablePath = process.env.E2E_BROWSER_EXECUTABLE

/** Language/layout tests against the production build; API responses are local fixtures. */
export default defineConfig({
  ...base,
  testMatch: 'language.spec.ts',
  use: {
    ...base.use,
    baseURL: `http://localhost:${port}`,
    channel: executablePath === undefined ? 'chrome' : undefined,
    launchOptions: { chromiumSandbox: true, executablePath },
  },
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: false,
  },
})
