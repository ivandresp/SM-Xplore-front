import { afterEach, describe, expect, it, vi } from 'vitest'
import { categoriesApi } from './categoriesApi'

const category = { categoryId: 'c1', name: 'Patrimonio', scope: 'SITE', parentId: null, updatedAt: '2026-11-17T12:00:00Z' }
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('categoriesApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('registra el contrato name/scope/parentId y mapea la respuesta', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) => response(category, 201))
    vi.stubGlobal('fetch', fetchStub)
    const result = await categoriesApi.create({ name: 'Patrimonio', scope: 'SITE', parentId: null })
    expect(result).toEqual({ id: 'c1', name: 'Patrimonio', scope: 'SITE', parentId: null })
    expect(fetchStub.mock.calls[0][1]?.method).toBe('POST')
    expect(JSON.parse(fetchStub.mock.calls[0][1]?.body as string)).toEqual({ name: 'Patrimonio', scope: 'SITE', parentId: null })
  })

  it('conserva metadatos de página y envía scope/page/size', async () => {
    const fetchStub = vi.fn(async (_url: string) => response({ content: [category], page: 2, size: 20, total: 41, totalPages: 3 }))
    vi.stubGlobal('fetch', fetchStub)
    const result = await categoriesApi.listPage({ scope: 'SITE', page: 2, size: 20 })
    expect(result).toMatchObject({ page: 2, total: 41, totalPages: 3, content: [{ id: 'c1' }] })
    const url = fetchStub.mock.calls[0][0]
    expect(url).toContain('scope=SITE')
    expect(url).toContain('page=2')
    expect(url).toContain('size=20')
  })

  it('rechaza respuestas de creación incompatibles', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ ...category, scope: 'OTHER' }, 201)))
    await expect(categoriesApi.create({ name: 'Patrimonio', scope: 'SITE', parentId: null })).rejects.toThrow()
  })

  it('acepta el scope SERVICE existente en el backend al listar todos los tipos', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ content: [{ ...category, scope: 'SERVICE' }], page: 0, size: 20, total: 1, totalPages: 1 })))
    expect((await categoriesApi.listPage({ page: 0, size: 20 })).content[0].scope).toBe('SERVICE')
  })

  it('mantiene la API de listas usada por los selectores existentes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ content: [category], page: 0, size: 100, total: 1, totalPages: 1 })))
    expect(await categoriesApi.list('SITE')).toEqual([{ id: 'c1', name: 'Patrimonio', scope: 'SITE', parentId: null }])
  })
})
