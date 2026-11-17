import { defineConfig } from '@playwright/test'
import preview from './playwright.language.config'

/** Selector de sitios con fixtures de API y build de producción. */
export default defineConfig({
  ...preview,
  testMatch: 'site-location-picker.spec.ts',
})
