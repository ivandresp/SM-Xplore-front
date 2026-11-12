import { afterEach } from 'vitest'
import { clearCache } from '@/services/cache'

// La caché de httpClient es estado de módulo: sin esto, un test vería la respuesta del anterior.
afterEach(() => {
  clearCache()
})
