import { describe, expect, it } from 'vitest'
import { navItemsFor } from './navigation'

const reportsLink = (role: Parameters<typeof navItemsFor>[0]) => navItemsFor(role).find((item) => item.to.endsWith('/reportes'))?.to

describe('navegación de reportes', () => {
  it.each(['GUIDE', 'ADMIN', 'DESTINATION_MANAGER'] as const)('%s conserva reportes dentro del panel', (role) => {
    expect(reportsLink(role)).toBe('/app/reportes')
  })
  it.each(['TOURIST', 'SERVICE_PROVIDER'] as const)('%s conserva la vista pública', (role) => {
    expect(reportsLink(role)).toBe('/reportes')
  })
})
