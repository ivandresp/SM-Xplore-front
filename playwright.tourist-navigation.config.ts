import { defineConfig } from '@playwright/test'
import preview from './playwright.language.config'

export default defineConfig({ ...preview, testMatch: ['tourist-navigation.spec.ts', 'guide-reports.spec.ts'] })
