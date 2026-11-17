import messages from './en.json'

export type Language = 'es' | 'en'
export const LANGUAGE_STORAGE_KEY = 'sm-xplore:language'
const english: Readonly<Record<string, string>> = messages
const listeners = new Set<() => void>()

function readLanguage(): Language {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'es'
  } catch {
    return 'es'
  }
}

let language = readLanguage()

export function getLanguage(): Language {
  return language
}

export function getLocale(): string {
  return language === 'en' ? 'en-US' : 'es-CO'
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function setLanguage(next: Language): void {
  if (next !== 'es' && next !== 'en') return
  if (typeof document !== 'undefined') document.documentElement.lang = next
  if (language === next) return
  language = next
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
  } catch {
    // The current tab remains usable when storage is blocked.
  }
  listeners.forEach((listener) => listener())
}

if (typeof document !== 'undefined') document.documentElement.lang = language
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null) return
    const next = readLanguage()
    if (next === language) return
    language = next
    document.documentElement.lang = next
    listeners.forEach((listener) => listener())
  })
}

/** Explicit application messages only; API/user content must never pass through this function. */
export function translate(message: string, values?: readonly unknown[]): string
export function translate(message: string | undefined, values?: readonly unknown[]): string | undefined
export function translate(message: string | null, values?: readonly unknown[]): string | null
export function translate(message: string | null | undefined, values?: readonly unknown[]): string | null | undefined {
  if (message == null) return message
  const text = language === 'en' ? english[message] ?? message : message
  return values === undefined ? text : text.replace(/\{(\d+)\}/g, (match, index: string) =>
    Number(index) < values.length ? String(values[Number(index)] ?? '') : match,
  )
}
