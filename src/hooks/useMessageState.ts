import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useLanguage } from './useLanguage'

/**
 * Keep an application message's pure resolver, rather than the language it had
 * when the action finished. Resolvers must not perform requests or mutate state.
 * This allows existing notices/errors to change language without repeating actions.
 */
export function useMessageState<T>(initial: T): [T, Dispatch<SetStateAction<T>>] {
  useLanguage()
  const [entry, setEntry] = useState(() => ({ resolve: () => initial }))
  const setMessage: Dispatch<SetStateAction<T>> = useCallback((next) => {
    if (typeof next !== 'function') {
      setEntry({ resolve: () => next })
    } else if (next.length === 0) {
      setEntry({ resolve: next as () => T })
    } else {
      setEntry((previous) => ({
        resolve: () => (next as (previous: T) => T)(previous.resolve()),
      }))
    }
  }, [])
  return [entry.resolve(), setMessage]
}
