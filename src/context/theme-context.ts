import { createContext } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeContextValue {
  /** Elección del usuario: `system` sigue `prefers-color-scheme`. */
  mode: ThemeMode
  /** Tema que se está pintando ahora mismo. */
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  /** system -> light -> dark -> system. */
  cycle: () => void
}

/**
 * Default seguro: los componentes que usan el tema (p. ej. `TopBar`) se
 * renderizan en tests sin provider y no deben romperse.
 */
export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  resolved: 'light',
  setMode: () => undefined,
  cycle: () => undefined,
})
