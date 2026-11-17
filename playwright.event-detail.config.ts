import { defineConfig } from '@playwright/test'
import preview from './playwright.language.config'

export default defineConfig({ ...preview, testMatch: ['event-detail-map.spec.ts', 'site-detail-gallery.spec.ts'] })
