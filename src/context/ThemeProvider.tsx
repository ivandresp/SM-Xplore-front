import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext } from './theme-context'
import type { ResolvedTheme, ThemeMode } from './theme-context'

export const THEME_STORAGE_KEY = 'sm-xplore:theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function loadMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    // Almacenamiento bloqueado (modo privado): se queda en sistema.
    return 'system'
  }
}

function systemTheme(): ResolvedTheme {
  if (typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/**
 * Aplica el tema en `<html data-theme="…">` (o sin atributo en modo sistema)
 * y lo persiste. El primer pintado no depende de React: `index.html` fija el
 * atributo antes de cargar la app.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(loadMode)
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const query = window.matchMedia(DARK_QUERY)

    if (typeof query.addEventListener !== 'function') {
      return
    }

    function handleChange(event: MediaQueryListEvent) {
      setSystem(event.matches ? 'dark' : 'light')
    }

    query.addEventListener('change', handleChange)

    return () => query.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement

    try {
      if (mode === 'system') {
        root.removeAttribute('data-theme')
        window.localStorage.removeItem(THEME_STORAGE_KEY)
      } else {
        root.dataset.theme = mode
        window.localStorage.setItem(THEME_STORAGE_KEY, mode)
      }
    } catch {
      // Sin almacenamiento el tema sigue aplicado en esta pestaña.
      if (mode === 'system') {
        root.removeAttribute('data-theme')
      } else {
        root.dataset.theme = mode
      }
    }
  }, [mode])

  const resolved: ResolvedTheme = mode === 'system' ? system : mode

  function setModeValue(next: ThemeMode) {
    setMode(next)
  }

  function cycle() {
    setMode((current) =>
      current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system',
    )
  }

  return (
    <ThemeContext.Provider
      value={{ mode, resolved, setMode: setModeValue, cycle }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
