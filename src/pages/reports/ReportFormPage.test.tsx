import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReportFormPage from './ReportFormPage'

const PHOTO_URL =
  'https://res.cloudinary.com/demo/image/upload/v1/sm-xplore/reports/playa.jpg'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function createdReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r-1',
    user: { id: 'u-1', name: 'Ana Turista' },
    title: 'Robo en la playa',
    description: '',
    location: null,
    photosUrls: [],
    status: 'ONGOING',
    createdAt: '2026-11-12T10:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    ...overrides,
  }
}

/** fetch con dos destinos: Cloudinary y la API de reportes. */
function stubFetch({
  cloudinary = () => jsonResponse({ error: { message: 'no usado' } }, 400),
  create = () => jsonResponse(createdReport(), 201),
}: {
  cloudinary?: () => Response
  create?: () => Response
} = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('api.cloudinary.com')) return cloudinary()
    if (url.includes('/security-reports')) return create()
    return jsonResponse({}, 200)
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function submittedBody(fetchMock: ReturnType<typeof vi.fn>) {
  const call = (fetchMock.mock.calls as unknown as Array<[RequestInfo, RequestInit | undefined]>).find(
    ([url]) => String(url).includes('/security-reports'),
  )

  if (call === undefined) throw new Error('no se envió el reporte')
  return JSON.parse(String(call[1]?.body)) as Record<string, unknown>
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/reportes/nuevo']}>
      <Routes>
        <Route path="/reportes/nuevo" element={<ReportFormPage />} />
        <Route path="/reportes" element={<p>Mis reportes</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const map = vi.hoisted(() => ({ state: 'ready' as 'ready' | 'error' | 'loading' }))
vi.mock('@/components/MapPreview', async () => {
  const { useEffect } = await import('react')
  return { MapPreview: ({ onLoadStateChange, latitude, longitude, zoom }: { latitude: number; longitude: number; zoom: number; onLoadStateChange: (state: 'ready' | 'error' | 'loading') => void }) => {
    useEffect(() => onLoadStateChange(map.state), [onLoadStateChange, latitude, longitude, zoom])
    return <div role="img" aria-label="Mapa de ubicación" />
  } }
})
function chooseCenter() {
  fireEvent.click(screen.getByRole('button', { name: 'Elegir punto en el mapa' }), { detail: 0 })
}

describe('ReportFormPage', () => {
  beforeEach(() => {
    map.state = 'ready'
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'demo')
    vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'sm-xplore-unsigned')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })
  })

  it('no pide latitud ni longitud a mano', () => {
    stubFetch()
    renderForm()

    expect(screen.queryByLabelText(/latitud/i)).toBeNull()
    expect(screen.queryByLabelText(/longitud/i)).toBeNull()
    expect(screen.queryByPlaceholderText('11.2404')).toBeNull()
  })

  it('envía el reporte sin ubicación y lo deja claro en pantalla', async () => {
    const fetchMock = stubFetch()
    const user = userEvent.setup()
    renderForm()

    expect(screen.getByText(/puedes enviar el reporte sin ubicación/i)).toBeTruthy()

    await user.type(screen.getByLabelText('Título'), 'Robo en la playa')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('Mis reportes')).toBeTruthy()
    const body = submittedBody(fetchMock)
    expect(body.title).toBe('Robo en la playa')
    expect(body).not.toHaveProperty('location')
  })







  it('selects a point on the map without requesting current location', async () => {
    const gps = vi.fn()
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: gps } })
    const fetchMock = stubFetch()
    const user = userEvent.setup()
    renderForm()
    expect(screen.queryByRole('button', { name: 'Usar mi ubicación actual' })).toBeNull()
    chooseCenter()
    await user.type(screen.getByLabelText('Título'), 'Incidente en el muelle')
    expect(screen.getByText(/Punto seleccionado:/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    await screen.findByText('Mis reportes')
    expect(submittedBody(fetchMock).location).toEqual({ latitude: 11.2404, longitude: -74.199 })
    expect(gps).not.toHaveBeenCalled()
  })

  it('omits the selected location when the point is removed', async () => {
    const fetchMock = stubFetch()
    const user = userEvent.setup()
    renderForm()
    chooseCenter()
    await user.click(screen.getByRole('button', { name: 'Quitar punto seleccionado' }))
    await user.type(screen.getByLabelText('Título'), 'Incidente')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    await screen.findByText('Mis reportes')
    expect(submittedBody(fetchMock)).not.toHaveProperty('location')
  })

  it('can submit without location when the map is unavailable', async () => {
    map.state = 'error'
    const fetchMock = stubFetch()
    const user = userEvent.setup()
    renderForm()
    expect(screen.getByRole('button', { name: 'Elegir punto en el mapa' }).getAttribute('aria-disabled')).toBe('true')
    await user.type(screen.getByLabelText('Título'), 'Incidente')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    await screen.findByText('Mis reportes')
    expect(submittedBody(fetchMock)).not.toHaveProperty('location')
  })

  it('preserves and edits the selected location after a failed submission', async () => {
    let attempt = 0
    const fetchMock = stubFetch({ create: () => ++attempt === 1 ? jsonResponse({}, 500) : jsonResponse(createdReport(), 201) })
    const user = userEvent.setup()
    renderForm()
    chooseCenter()
    await user.type(screen.getByLabelText('Título'), 'Incidente')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    await screen.findByRole('alert')
    expect(screen.getByText(/Punto seleccionado: 11.240400, -74.199000/)).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Elegir punto en el mapa' }), { key: 'ArrowRight' })
    chooseCenter()
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    await screen.findByText('Mis reportes')
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>
    const body = JSON.parse(String(calls.at(-1)?.[1]?.body))
    expect(body.location.longitude).toBeGreaterThan(-74.199)
    expect(body.title).toBe('Incidente')
  })

  it('sube una foto de archivo, la previsualiza y la envía', async () => {
    const fetchMock = stubFetch({
      cloudinary: () =>
        jsonResponse({
          secure_url: PHOTO_URL,
          public_id: 'sm-xplore/reports/playa',
          width: 1200,
          height: 800,
        }),
    })
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Título'), 'Robo en la playa')
    await user.upload(
      screen.getByLabelText('Subir fotos del reporte'),
      new File(['imagen'], 'playa.jpg', { type: 'image/jpeg' }),
    )

    expect(await screen.findByAltText('Foto 1 de 1')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('Mis reportes')).toBeTruthy()
    expect(submittedBody(fetchMock).photosUrls).toEqual([PHOTO_URL])
  })

  it('conserva lo escrito y muestra el error si la subida falla', async () => {
    const fetchMock = stubFetch({
      cloudinary: () => jsonResponse({ error: { message: 'Bad request' } }, 400),
    })
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Título'), 'Robo en la playa')
    await user.type(screen.getByLabelText('¿Qué pasó?'), 'Me quitaron la mochila.')
    await user.upload(
      screen.getByLabelText('Subir fotos del reporte'),
      new File(['imagen'], 'playa.jpg', { type: 'image/jpeg' }),
    )

    expect(await screen.findByText(/Cloudinary rechazó la imagen/i)).toBeTruthy()
    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe(
      'Robo en la playa',
    )
    expect((screen.getByLabelText('¿Qué pasó?') as HTMLTextAreaElement).value).toBe(
      'Me quitaron la mochila.',
    )

    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('Mis reportes')).toBeTruthy()
    const body = submittedBody(fetchMock)
    expect(body.title).toBe('Robo en la playa')
    expect(body.description).toBe('Me quitaron la mochila.')
    expect(body).not.toHaveProperty('photosUrls')
  })

  it('no envía mientras una foto se está subiendo', async () => {
    // La promesa se resuelve desde el test; el objeto evita el estrechamiento a `null`.
    const upload = { release: null as null | (() => void) }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('api.cloudinary.com')) {
          await new Promise<void>((resolve) => {
            upload.release = resolve
          })
          return jsonResponse({
            secure_url: PHOTO_URL,
            public_id: 'sm-xplore/reports/playa',
            width: 1200,
            height: 800,
          })
        }
        return jsonResponse(createdReport(), 201)
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Título'), 'Robo en la playa')
    await user.upload(
      screen.getByLabelText('Subir fotos del reporte'),
      new File(['imagen'], 'playa.jpg', { type: 'image/jpeg' }),
    )

    expect(
      (screen.getByRole('button', { name: 'Enviar reporte' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    upload.release?.()
    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: 'Enviar reporte' }) as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    })
  })

  it('permite quitar una foto antes de enviar', async () => {
    const fetchMock = stubFetch({
      cloudinary: () =>
        jsonResponse({
          secure_url: PHOTO_URL,
          public_id: 'sm-xplore/reports/playa',
          width: 1200,
          height: 800,
        }),
    })
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Título'), 'Robo en la playa')
    await user.upload(
      screen.getByLabelText('Subir fotos del reporte'),
      new File(['imagen'], 'playa.jpg', { type: 'image/jpeg' }),
    )
    await screen.findByAltText('Foto 1 de 1')

    await user.click(screen.getByRole('button', { name: 'Quitar foto 1' }))
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('Mis reportes')).toBeTruthy()
    expect(submittedBody(fetchMock)).not.toHaveProperty('photosUrls')
  })





  it('lleva el foco al título y muestra el error cuando falta', async () => {
    stubFetch()
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('Escribe un título.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText(/Título/))
    expect(screen.getByLabelText(/Título/).getAttribute('aria-invalid')).toBe(
      'true',
    )
  })


})
