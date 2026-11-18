import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { describeApiError } from '@/utils/errors'
import { useMessageState } from './useMessageState'

/** Conserva la causa HTTP para escoger la acción sin comparar mensajes traducidos. */
export function useApiErrorState() {
  const [message, setMessage] = useMessageState<string | null>(null)
  const [cause, setCause] = useState<unknown>(null)
  const setError: Dispatch<SetStateAction<string | null>> = useCallback(next => {
    setCause(null)
    setMessage(next)
  }, [setMessage])
  const setApiError = useCallback((error: unknown) => {
    setCause(() => error)
    setMessage(() => describeApiError(error))
  }, [setMessage])
  return [message, setError, cause, setApiError] as const
}
