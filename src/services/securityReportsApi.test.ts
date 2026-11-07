import { afterEach, describe, expect, it, vi } from 'vitest'
import { securityReportsApi } from './securityReportsApi'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const report = {
  id: 'rep1',
  user: { id: 'u1', name: 'Turista' },
  title: 'Intento de robo',
  description: 'Dos personas en moto',
  location: { latitude: 11.24, longitude: -74.19 },
  photosUrls: [],
  status: 'ONGOING',
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
}

describe('securityReportsApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('list devuelve la página por cursor y manda el estado', async () => {
    const fetchStub = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ content: [report], nextCursor: null, hasNext: false }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const page = await securityReportsApi.list({ status: 'ONGOING' })

    expect(page.hasNext).toBe(false)
    expect(page.content[0].title).toBe('Intento de robo')
    expect(String(fetchStub.mock.calls[0][0])).toContain('status=ONGOING')
  })

  it('rechaza una respuesta que no sea página por cursor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, _init?: RequestInit) =>
        jsonResponse([report]),
      ),
    )

    await expect(
      securityReportsApi.list({ status: 'ONGOING' }),
    ).rejects.toThrow(/Respuesta inesperada de GET \/security-reports/)
  })

  it('listComments desenvuelve la página', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, _init?: RequestInit) =>
        jsonResponse({
          content: [
            {
              id: 'c1',
              reportId: 'rep1',
              user: { id: 'u2', name: 'Gestora' },
              content: 'Atendido',
              createdAt: '2026-11-02T10:00:00Z',
            },
          ],
          nextCursor: null,
          hasNext: false,
        }),
      ),
    )

    const page = await securityReportsApi.listComments('rep1')

    expect(page.content[0].content).toBe('Atendido')
  })
})
