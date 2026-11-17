import { translate as t } from '@/i18n/language'
import type { UpdateMyProfileRequest } from '@/types'

/**
 * Lógica pura del onboarding de bienvenida. Nada de aquí guarda estado: el
 * progreso se deriva de datos que ya viven en el backend (preferencias y
 * perfil del turista), así que volver a /bienvenida lo reconstruye solo.
 */

export type OnboardingStep = 1 | 2 | 3

export const ONBOARDING_STEP_COUNT = 3

export const ONBOARDING_STEP_LABELS = [
  'Intereses',
  'Perfil',
  'Listo',
] as const

/** Destinos de salida del onboarding (rutas reales del router). */
export const ONBOARDING_PATHS = {
  skip: '/explorar',
  catalog: '/explorar',
  recommendations: '/recomendaciones',
} as const

export interface OnboardingProfile {
  nationality: string | null
  preferredLanguage: string | null
}

export interface OnboardingSignals {
  /** Preferencias que el backend ya confirmó (GET /preferences). */
  preferenceCount: number
  profile: OnboardingProfile | null
}

export interface OnboardingProgress {
  interestsDone: boolean
  profileDone: boolean
  /** El paso 3 solo se cumple cuando los dos datos reales existen. */
  ready: boolean
  completedSteps: number
  suggestedStep: OnboardingStep
}

export interface FinishTargets {
  primary: string
  primaryLabel: string
  secondary: string
  secondaryLabel: string
}

function filled(value: string | null): boolean {
  return value !== null && value.trim() !== ''
}

/** PATCH /users/me exige nacionalidad e idioma para considerar el perfil completo. */
export function isProfileComplete(profile: OnboardingProfile | null): boolean {
  if (profile === null) {
    return false
  }

  return filled(profile.nationality) && filled(profile.preferredLanguage)
}

/**
 * Progreso derivado: dos señales reales (preferencias guardadas y perfil) y el
 * tercer punto, «listo», que solo se enciende con las dos anteriores. No hay
 * flag local ni localStorage que pueda desincronizarse.
 */
export function deriveOnboardingProgress({
  preferenceCount,
  profile,
}: OnboardingSignals): OnboardingProgress {
  const interestsDone = preferenceCount > 0
  const profileDone = isProfileComplete(profile)
  const ready = interestsDone && profileDone

  const completedSteps =
    (interestsDone ? 1 : 0) + (profileDone ? 1 : 0) + (ready ? 1 : 0)

  const suggestedStep: OnboardingStep = !interestsDone
    ? 1
    : !profileDone
      ? 2
      : 3

  return {
    interestsDone,
    profileDone,
    ready,
    completedSteps,
    suggestedStep,
  }
}

/** El paso 3 propone primero lo que sí puede mostrar datos reales. */
export function finishTargets(progress: OnboardingProgress): FinishTargets {
  if (progress.interestsDone) {
    return {
      primary: ONBOARDING_PATHS.recommendations,
      primaryLabel: t("Ver mis recomendaciones"),
      secondary: ONBOARDING_PATHS.catalog,
      secondaryLabel: t("Explorar el catálogo"),
    }
  }

  return {
    primary: ONBOARDING_PATHS.catalog,
    primaryLabel: t("Explorar el catálogo"),
    secondary: ONBOARDING_PATHS.recommendations,
    secondaryLabel: t("Ver mis recomendaciones"),
  }
}

export interface ProfileDraft {
  nationality: string
  preferredLanguage: string
}

/**
 * Arma el cuerpo de PATCH /users/me con los campos que acepta
 * UpdateProfileRequest (nationality hasta 80, preferredLanguage hasta 50) y
 * omite los vacíos: mandar null no está permitido y borraría datos sin querer.
 */
export function describeSavedProfile(patch: UpdateMyProfileRequest): string {
  const hasNationality = patch.nationality !== undefined
  const hasLanguage = patch.preferredLanguage !== undefined

  if (hasNationality && hasLanguage) {
    return t("Perfil completo: guardamos la nacionalidad y el idioma de este paso.")
  }
  if (hasNationality) {
    return t("Perfil completo: guardamos la nacionalidad de este paso.")
  }
  return t("Perfil completo: guardamos el idioma de este paso.")
}

export function buildProfilePatch(draft: ProfileDraft): UpdateMyProfileRequest {
  const patch: UpdateMyProfileRequest = {}
  const nationality = draft.nationality.trim()
  const preferredLanguage = draft.preferredLanguage.trim()

  if (nationality !== '') {
    patch.nationality = nationality
  }
  if (preferredLanguage !== '') {
    patch.preferredLanguage = preferredLanguage
  }

  return patch
}

/** Idiomas del alta (RegisterPage) más los del perfil. */
export const LANGUAGE_OPTIONS = [
  { value: 'es', get label() { return t("Español") } },
  { value: 'en', get label() { return t("Inglés") } },
  { value: 'fr', get label() { return t("Francés") } },
] as const

interface EmojiRule {
  emoji: string
  keywords: string[]
}

/**
 * Emoji por palabra clave del nombre de la categoría. GET /categories no trae
 * icono, así que el emoji es presentación y nunca decide nada.
 */
const EMOJI_RULES: EmojiRule[] = [
  { emoji: '🏖️', keywords: ['playa', 'mar', 'costa', 'isla', 'bahia'] },
  {
    emoji: '🍲',
    keywords: [
      'gastronom',
      'comida',
      'cocina',
      'sabor',
      'bebida',
      'restaurante',
    ],
  },
  {
    emoji: '🥾',
    keywords: [
      'aventura',
      'sender',
      'trekking',
      'montan',
      'naturaleza',
      'ecotur',
      'parque',
      'caminat',
      'selva',
      'rio',
    ],
  },
  {
    emoji: '🏛️',
    keywords: [
      'cultura',
      'museo',
      'historia',
      'historic',
      'patrimon',
      'religio',
      'iglesia',
      'monumento',
    ],
  },
  {
    emoji: '🎶',
    keywords: ['music', 'fiesta', 'festival', 'concierto', 'rumba', 'danza'],
  },
  {
    emoji: '🎨',
    keywords: ['arte', 'artesan', 'pintura', 'teatro', 'fotograf'],
  },
  {
    emoji: '🧘',
    keywords: ['bienestar', 'spa', 'relax', 'yoga', 'salud', 'descanso'],
  },
  {
    emoji: '🛍️',
    keywords: ['compra', 'souvenir', 'tienda', 'artesania'],
  },
  {
    emoji: '🌙',
    keywords: ['noche', 'nocturn', 'bar', 'discoteca'],
  },
  {
    emoji: '👨‍👩‍👧',
    keywords: ['familia', 'ninos', 'infantil', 'pareja', 'grupo'],
  },
  {
    emoji: '🤿',
    keywords: ['buceo', 'snorkel', 'surf', 'kayak', 'deporte', 'acuatic'],
  },
  {
    emoji: '🛏️',
    keywords: ['hotel', 'hostal', 'alojamiento', 'hospedaje', 'finca'],
  },
  {
    emoji: '🚌',
    keywords: ['tour', 'recorrido', 'guia', 'transporte', 'traslado'],
  },
]

/** Rotación determinista para categorías que no tienen palabra clave. */
const FALLBACK_EMOJIS = ['✨', '🌴', '🧭', '🌊', '🦜', '🍹', '🏝️', '🎯']

/** Normaliza para comparar: sin tildes, sin mayúsculas y sin espacios extra. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function categoryEmoji(name: string, index = 0): string {
  const normalized = normalize(name)
  const rule = EMOJI_RULES.find((candidate) =>
    candidate.keywords.some((keyword) => normalized.includes(keyword)),
  )

  if (rule !== undefined) {
    return rule.emoji
  }

  const position = Math.abs(Math.trunc(index)) % FALLBACK_EMOJIS.length
  return FALLBACK_EMOJIS[position]
}
