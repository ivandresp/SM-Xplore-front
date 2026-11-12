import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProviderApprovalPage from './ProviderApprovalPage'

const PROVIDER = {
  id: 'p-1',
  fullName: 'Kayaks del Mar',
  email: 'kayak@correo.com',
  phone: '3001234567',
  role: 'SERVICE_PROVIDER',
  status: 'ACTIVO',
  profile: {
    nit: '900123456-7',
    businessType: 'Hotel',
    registrationStatus: 'PENDIENTE',
    websiteUrl: null,
    latitude: null,
    longitude: null,
    startOperationDate: null,
  },
  signedUpAt: '2026-11-02T10:00:00Z',
  authVersion: 1,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/usuarios/prestadoras/p-1']}>
      <Routes>
        <Route
          path="/app/usuarios/prestadoras/:providerId"
          element={<ProviderApprovalPage />}
        />
        <Route path="/app/usuarios" element={<p>Usuarios</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProviderApprovalPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exige motivo para rechazar y no deja enviar vacio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(PROVIDER)))

    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Kayaks del Mar' })
    expect(screen.getByText('Motivo (obligatorio al rechazar)')).toBeTruthy()

    const reject = screen.getByRole('button', { name: 'Rechazar' })
    expect((reject as HTMLButtonElement).disabled).toBe(true)

    await user.type(
      screen.getByLabelText('Motivo (obligatorio al rechazar)'),
      'NIT no coincide',
    )
    expect((reject as HTMLButtonElement).disabled).toBe(false)

    const approve = screen.getByRole('button', { name: 'Aprobar' })
    expect((approve as HTMLButtonElement).disabled).toBe(false)
  })
})
