import { useSyncExternalStore } from 'react'
import { getLanguage, setLanguage, subscribeLanguage, translate } from '@/i18n/language'

export function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, () => 'es' as const)
  return { language, setLanguage, t: translate }
}
