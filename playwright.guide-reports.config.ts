import { defineConfig } from '@playwright/test'
import preview from './playwright.language.config'

export default defineConfig({ ...preview, testMatch: 'guide-reports.spec.ts' })
