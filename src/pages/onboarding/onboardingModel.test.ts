import { describe, expect, it } from 'vitest'
import {
  buildProfilePatch,
  categoryEmoji,
  deriveOnboardingProgress,
  finishTargets,
  isProfileComplete,
} from './onboardingModel'

const EMPTY_PROFILE = { nationality: null, preferredLanguage: null }

describe('isProfileComplete', () => {
  it('exige nacionalidad e idioma: con uno solo no está completo', () => {
    expect(isProfileComplete(null)).toBe(false)
    expect(isProfileComplete(EMPTY_PROFILE)).toBe(false)
    expect(
      isProfileComplete({ nationality: 'Colombia', preferredLanguage: null }),
    ).toBe(false)
    expect(
      isProfileComplete({ nationality: null, preferredLanguage: 'es' }),
    ).toBe(false)
    expect(
      isProfileComplete({ nationality: 'Colombia', preferredLanguage: 'es' }),
    ).toBe(true)
  })
})

describe('deriveOnboardingProgress', () => {
  it('sin preferencias ni perfil arranca en el paso 1 con 0 de 3', () => {
    const progress = deriveOnboardingProgress({
      preferenceCount: 0,
      profile: EMPTY_PROFILE,
    })

    expect(progress.interestsDone).toBe(false)
    expect(progress.profileDone).toBe(false)
    expect(progress.ready).toBe(false)
    expect(progress.completedSteps).toBe(0)
    expect(progress.suggestedStep).toBe(1)
  })

  it('una preferencia guardada cumple el punto 1 y sugiere el paso 2', () => {
    const progress = deriveOnboardingProgress({
      preferenceCount: 1,
      profile: EMPTY_PROFILE,
    })

    expect(progress.interestsDone).toBe(true)
    expect(progress.profileDone).toBe(false)
    expect(progress.completedSteps).toBe(1)
    expect(progress.suggestedStep).toBe(2)
  })

  it('el perfil completo sin intereses cumple un punto y sugiere el paso 1', () => {
    const progress = deriveOnboardingProgress({
      preferenceCount: 0,
      profile: { nationality: 'Colombia', preferredLanguage: 'es' },
    })

    expect(progress.interestsDone).toBe(false)
    expect(progress.profileDone).toBe(true)
    expect(progress.completedSteps).toBe(1)
    expect(progress.suggestedStep).toBe(1)
  })

  it('con intereses y perfil reales completa los 3 puntos y sugiere el paso 3', () => {
    const progress = deriveOnboardingProgress({
      preferenceCount: 3,
      profile: { nationality: 'Colombia', preferredLanguage: 'en' },
    })

    expect(progress.ready).toBe(true)
    expect(progress.completedSteps).toBe(3)
    expect(progress.suggestedStep).toBe(3)
  })

  it('no cuenta negativos como preferencias', () => {
    const progress = deriveOnboardingProgress({
      preferenceCount: -2,
      profile: EMPTY_PROFILE,
    })

    expect(progress.interestsDone).toBe(false)
    expect(progress.completedSteps).toBe(0)
  })
})

describe('finishTargets', () => {
  it('con intereses guardados propone recomendaciones primero y deja el catálogo', () => {
    const targets = finishTargets(
      deriveOnboardingProgress({
        preferenceCount: 2,
        profile: EMPTY_PROFILE,
      }),
    )

    expect(targets.primary).toBe('/recomendaciones')
    expect(targets.primaryLabel).toBe('Ver mis recomendaciones')
    expect(targets.secondary).toBe('/explorar')
    expect(targets.secondaryLabel).toBe('Explorar el catálogo')
  })

  it('sin intereses propone el catálogo primero y no oculta recomendaciones', () => {
    const targets = finishTargets(
      deriveOnboardingProgress({
        preferenceCount: 0,
        profile: EMPTY_PROFILE,
      }),
    )

    expect(targets.primary).toBe('/explorar')
    expect(targets.primaryLabel).toBe('Explorar el catálogo')
    expect(targets.secondary).toBe('/recomendaciones')
    expect(targets.secondaryLabel).toBe('Ver mis recomendaciones')
  })
})

describe('buildProfilePatch', () => {
  it('quita espacios y omite los campos vacíos', () => {
    expect(
      buildProfilePatch({ nationality: '  Colombia ', preferredLanguage: '' }),
    ).toEqual({ nationality: 'Colombia' })
    expect(
      buildProfilePatch({ nationality: '', preferredLanguage: 'es' }),
    ).toEqual({ preferredLanguage: 'es' })
    expect(buildProfilePatch({ nationality: ' ', preferredLanguage: ' ' })).toEqual(
      {},
    )
  })
})

describe('categoryEmoji', () => {
  it('asigna un emoji por palabra clave sin importar tildes ni mayúsculas', () => {
    expect(categoryEmoji('Playa', 0)).toBe('🏖️')
    expect(categoryEmoji('GASTRONOMÍA', 1)).toBe('🍲')
    expect(categoryEmoji('gastronomia', 2)).toBe('🍲')
    expect(categoryEmoji('Aventura', 3)).toBe('🥾')
    expect(categoryEmoji('Música', 4)).toBe('🎶')
  })

  it('devuelve un emoji estable y rotativo para nombres desconocidos', () => {
    const first = categoryEmoji('Categoría rara', 0)
    const again = categoryEmoji('Categoría rara', 0)
    const other = categoryEmoji('Otra categoría', 1)

    expect(first).toBe(again)
    expect(first.length).toBeGreaterThan(0)
    expect(other.length).toBeGreaterThan(0)
    expect(categoryEmoji('', 0).length).toBeGreaterThan(0)
  })
})
