import { act, render, screen, waitFor } from '@testing-library/react'
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

interface PendingLocation {
  success: (position: GeolocationPosition) => void
  failure: (error: GeolocationPositionError) => void
}

function stubGeolocation(): PendingLocation[] {
  const calls: PendingLocation[] = []

  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (
        success: (position: GeolocationPosition) => void,
        failure: (error: GeolocationPositionError) => void,
      ) => {
        calls.push({ success, failure })
      },
    },
  })

  return calls
}

/** El callback del navegador llega fuera de un evento: se envuelve en `act`. */
function denyLocation(calls: PendingLocation[]) {
  act(() => {
    calls.at(-1)?.failure({
      code: 1,
      message: 'denied',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    })
  })
}

function acceptLocation(calls: PendingLocation[], latitude = 11.2404, longitude = -74.199) {
  act(() => {
    calls.at(-1)?.success({
      coords: { latitude, longitude },
      timestamp: 0,
    } as GeolocationPosition)
  })
}

describe('ReportFormPage', () => {
  beforeEach(() => {
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

  it('adjunta la ubicación actual cuando la persona la acepta', async () => {
    const calls = stubGeolocation()
    const fetchMock = stubFetch()
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Título'), 'Incidente en el muelle')
    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación actual' }))
    expect(screen.getByText(/consultando ubicación/i)).toBeTruthy()

    acceptLocation(calls)

    expect(await screen.findByText(/11\.240400, -74\.199000/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('Mis reportes')).toBeTruthy()
    expect(submittedBody(fetchMock).location).toEqual({
      latitude: 11.2404,
      longitude: -74.199,
    })
  })

  it('explica el permiso denegado y permite reintentar sin bloquear el envío', async () => {
    const calls = stubGeolocation()
    stubFetch()
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación actual' }))
    denyLocation(calls)

    expect(await screen.findByText(/no diste permiso de ubicación/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enviar reporte' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(calls).toHaveLength(2)
  })

  it('avisa cuando el navegador no expone la ubicación', async () => {
    stubFetch()
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación actual' }))

    expect(await screen.findByText(/no expone la ubicación/i)).toBeTruthy()
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

  it('no deja enviar mientras se está consultando la ubicación', async () => {
    const calls = stubGeolocation()
    stubFetch()
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Título'), 'Incidente')
    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación actual' }))

    const submit = screen.getByRole('button', {
      name: 'Enviar reporte',
    }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    acceptLocation(calls)
    await screen.findByText(/11\.240400, -74\.199000/)

    expect(submit.disabled).toBe(false)
  })

  it('conserva la ubicación anterior si la nueva consulta falla', async () => {
    const calls = stubGeolocation()
    const fetchMock = stubFetch()
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Título'), 'Incidente')
    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación actual' }))
    acceptLocation(calls)
    await screen.findByText(/11\.240400, -74\.199000/)

    await user.click(screen.getByRole('button', { name: 'Volver a consultar' }))
    denyLocation(calls)

    expect(
      await screen.findByText(/mantendremos la ubicación anterior/i),
    ).toBeTruthy()
    expect(screen.getByText(/11\.240400, -74\.199000/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    await screen.findByText('Mis reportes')
    expect(submittedBody(fetchMock).location).toEqual({
      latitude: 11.2404,
      longitude: -74.199,
    })
  })

  it('lleva el foco al mensaje de error cuando falta el título', async () => {
    stubFetch()
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    const alert = await screen.findByRole('alert')
    expect(document.activeElement?.contains(alert)).toBe(true)
  })

  it('mantiene la ubicación elegida aunque el texto cambie', async () => {
    const calls = stubGeolocation()
    const fetchMock = stubFetch()
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación actual' }))
    acceptLocation(calls)
    await screen.findByText(/11\.240400, -74\.199000/)

    await user.type(screen.getByLabelText('Título'), 'Incidente')

    expect(screen.getByText(/11\.240400, -74\.199000/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    await screen.findByText('Mis reportes')
    expect(submittedBody(fetchMock).location).toEqual({
      latitude: 11.2404,
      longitude: -74.199,
    })
  })
})
