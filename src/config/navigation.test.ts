import { describe, expect, it } from 'vitest'
import { navItemsFor } from './navigation'

const reportsLink = (role: Parameters<typeof navItemsFor>[0]) => navItemsFor(role).find((item) => item.to.endsWith('/reportes'))?.to

describe('navegación de reportes', () => {
  it.each(['GUIDE', 'SERVICE_PROVIDER', 'ADMIN', 'DESTINATION_MANAGER'] as const)('%s conserva reportes dentro del panel', (role) => {
    expect(reportsLink(role)).toBe('/app/reportes')
  })
  it.each(['TOURIST'] as const)('%s conserva la vista pública', (role) => {
    expect(reportsLink(role)).toBe('/reportes')
  })
})


describe('menú principal turista', () => {
  it('solo ofrece Para ti, Explorar, reportes y perfil en ese orden', () => {
    expect(navItemsFor('TOURIST').map(({ to }) => to)).toEqual([
      '/recomendaciones', '/explorar', '/reportes', '/perfil',
    ])
  })
})
