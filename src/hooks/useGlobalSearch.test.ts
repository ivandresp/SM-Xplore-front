import { describe, expect, it } from 'vitest'
import { filterByName, normalizeSearchTerm } from './useGlobalSearch'

describe('normalizeSearchTerm', () => {
  it('pasa a minúsculas, quita tildes y recorta espacios', () => {
    expect(normalizeSearchTerm('  Playa Blanca ')).toBe('playa blanca')
    expect(normalizeSearchTerm('PARQUE TAYRONA')).toBe('parque tayrona')
    expect(normalizeSearchTerm('Bahía Concha')).toBe('bahia concha')
  })
})

describe('filterByName', () => {
  const sites = [
    { name: 'Bahía Concha' },
    { name: 'Parque Tayrona' },
    { name: 'Quinta de San Pedro' },
  ]

  it('encuentra sin tildes ni mayúsculas', () => {
    expect(filterByName(sites, 'bahia').map((site) => site.name)).toEqual([
      'Bahía Concha',
    ])
  })

  it('devuelve todos con un término vacío', () => {
    expect(filterByName(sites, '').length).toBe(3)
  })

  it('no inventa coincidencias', () => {
    expect(filterByName(sites, 'ciudad perdida').length).toBe(0)
  })
})
