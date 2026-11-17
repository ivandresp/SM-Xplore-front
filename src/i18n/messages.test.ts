import { describe, expect, it } from 'vitest'
import messages from './en.json'

describe('English messages', () => {
  it('preserves every interpolation placeholder in the translated catalog', () => {
    for (const [source, english] of Object.entries(messages)) {
      expect(english.trim().length, source).toBeGreaterThan(0)
      expect(english.match(/\{\d+\}/g)?.sort() ?? [], source).toEqual(source.match(/\{\d+\}/g)?.sort() ?? [])
    }
  })
})
