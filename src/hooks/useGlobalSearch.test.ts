import { describe, expect, it } from 'vitest'
import { groupHref, normalizeSearchTerm } from './useGlobalSearch'

describe('normalizeSearchTerm', () => {
  it('pasa a minúsculas, quita tildes y recorta espacios', () => {
    expect(normalizeSearchTerm('  Playa Blanca ')).toBe('playa blanca')
    expect(normalizeSearchTerm('PARQUE TAYRONA')).toBe('parque tayrona')
    expect(normalizeSearchTerm('Bahía Concha')).toBe('bahia concha')
  })
})

describe('groupHref', () => {
  it('lleva cada grupo a su catálogo con el término codificado', () => {
    expect(groupHref('activities', 'bahía')).toBe(
      '/explorar?search=bah%C3%ADa',
    )
    expect(groupHref('events', '  kayak ')).toBe('/eventos?search=kayak')
    expect(groupHref('sites', 'playa')).toBe('/atractivos?search=playa')
    expect(groupHref('services', 'hotel')).toBe('/servicios?search=hotel')
  })
})
