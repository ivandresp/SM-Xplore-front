import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const SEARCH_DEBOUNCE_MS = 300

/** Valor con retardo: evita una petición por tecla. */
export function useDebouncedValue<T>(value: T, delayMs = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

/**
 * Un valor de filtro guardado en la URL. Al cambiar se vuelve a la primera
 * página; con `replace` para que el historial no guarde cada tecla.
 */
export function useFilterParam(key: string): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? ''

  const setValue = (next: string) => {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current)
        if (next === '') {
          copy.delete(key)
        } else {
          copy.set(key, next)
        }
        copy.delete('pagina')
        return copy
      },
      { replace: true },
    )
  }

  return [value, setValue]
}

/**
 * Campo de texto con debounce y estado en la URL. Mantiene el valor en
 * sintonía con el historial sin pisar lo que el usuario está escribiendo.
 */
export function useSearchParamText(
  key: string,
): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams()
  const urlValue = params.get(key) ?? ''
  const [value, setValue] = useState(urlValue)
  const debounced = useDebouncedValue(value)
  const committed = useRef(urlValue)

  useEffect(() => {
    if (urlValue === committed.current) return
    committed.current = urlValue
    setValue(urlValue)
  }, [urlValue])

  useEffect(() => {
    const next = debounced.trim()
    if (next === committed.current) return

    committed.current = next
    setParams(
      (current) => {
        const copy = new URLSearchParams(current)
        if (next === '') {
          copy.delete(key)
        } else {
          copy.set(key, next)
        }
        copy.delete('pagina')
        return copy
      },
      { replace: true },
    )
  }, [debounced, key, setParams])

  return [value, setValue]
}

/** Atajo del campo de búsqueda principal del catálogo. */
export function useSearchParamTerm(): [string, (value: string) => void] {
  return useSearchParamText('search')
}
