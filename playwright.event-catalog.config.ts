import { defineConfig } from '@playwright/test'
import preview from './playwright.language.config'

export default defineConfig({ ...preview, testMatch: 'event-catalog.spec.ts' })
