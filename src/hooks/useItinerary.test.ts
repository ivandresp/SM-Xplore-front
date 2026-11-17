import { afterEach, describe, expect, it } from 'vitest'
import { setLanguage } from '@/i18n/language'
import { itineraryEntryMeta, isReservableEntry } from './useItinerary'
import type { ItineraryEntry } from './useItinerary'

afterEach(() => setLanguage('es'))

const entry: ItineraryEntry = {
  itemId: 'a-1', type: 'ACTIVITY', name: 'Paseo en Santa Marta',
  durationMinutes: 240, startsAt: '2026-12-01T18:00:00Z', price: 10000,
}

describe('itineraryEntryMeta', () => {
  it('renders metadata in the current language from stored data', () => {
    expect(itineraryEntryMeta(entry)).toBe('Actividad · 4 horas')
    setLanguage('en')
    expect(itineraryEntryMeta(entry)).toBe('Activity · 4 hours')
    expect(entry.name).toBe('Paseo en Santa Marta')
    setLanguage('es')
    expect(itineraryEntryMeta(entry)).toBe('Actividad · 4 horas')
  })

  it('ignores stale translated metadata from older saved itineraries', () => {
    const legacy = { ...entry, type: 'EVENT' as const, meta: 'Evento · fecha en español' }
    setLanguage('en')
    expect(itineraryEntryMeta(legacy)).toContain('Event · ')
    expect(itineraryEntryMeta(legacy)).not.toContain('Evento')
  })
})


describe('reservable itinerary entries', () => {
  it('excludes sites and legacy services, including entries with reservation ids', () => {
    expect(isReservableEntry(entry)).toBe(true)
    expect(isReservableEntry({ ...entry, type: 'EVENT' })).toBe(true)
    expect(isReservableEntry({ ...entry, type: 'SITE' })).toBe(false)
    expect(isReservableEntry({ ...entry, type: 'SERVICE' } as unknown as ItineraryEntry)).toBe(false)
  })
  it('labels a site visit instead of an event', () => {
    expect(itineraryEntryMeta({ ...entry, type: 'SITE', startsAt: '2026-12-02T12:00:00' })).toContain('Atractivo')
  })
})
