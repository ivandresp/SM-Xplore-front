import { defineConfig } from '@playwright/test'
import preview from './playwright.language.config'

export default defineConfig({ ...preview, testMatch: 'service-detail-responsive.spec.ts' })
