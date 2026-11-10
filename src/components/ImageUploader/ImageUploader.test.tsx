import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageUploader } from './ImageUploader'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function imageFile(name = 'playa.jpg') {
  return new File(['imagen'], name, { type: 'image/jpeg' })
}

function Harness({
  initial = [],
  onUploadingChange,
}: {
  initial?: string[]
  onUploadingChange?: (uploading: boolean) => void
}) {
  const [urls, setUrls] = useState(initial)

  return (
    <>
      <ImageUploader
        label="Fotos del sitio"
        folder="sm-xplore/sites"
        value={urls}
        onChange={setUrls}
        onUploadingChange={onUploadingChange}
      />
      <output data-testid="urls">{urls.join('|')}</output>
    </>
  )
}

describe('ImageUploader', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'demo')
    vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'sm-xplore-unsigned')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sube la imagen y añade la URL devuelta por Cloudinary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/sm-xplore/sites/playa.jpg',
          public_id: 'sm-xplore/sites/playa',
          width: 1200,
          height: 800,
        }),
      ),
    )
    const onUploadingChange = vi.fn()
    const user = userEvent.setup()

    render(<Harness onUploadingChange={onUploadingChange} />)

    await user.upload(
      screen.getByLabelText('Subir fotos del sitio'),
      imageFile(),
    )

    expect(await screen.findByAltText('Foto 1 de 1')).toBeTruthy()
    expect(screen.getByTestId('urls').textContent).toBe(
      'https://res.cloudinary.com/demo/image/upload/v1/sm-xplore/sites/playa.jpg',
    )
    await waitFor(() => {
      expect(onUploadingChange).toHaveBeenLastCalledWith(false)
    })
    expect(onUploadingChange).toHaveBeenCalledWith(true)
  })

  it('muestra el error si Cloudinary rechaza la carga', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: { message: 'Bad request' } }, 400)),
    )
    const user = userEvent.setup()

    render(<Harness />)

    await user.upload(
      screen.getByLabelText('Subir fotos del sitio'),
      imageFile(),
    )

    expect(
      await screen.findByText(/Cloudinary rechazó la imagen/),
    ).toBeTruthy()
    expect(screen.getByTestId('urls').textContent).toBe('')
  })

  it('quita una foto de la lista', async () => {
    const user = userEvent.setup()
    const url = 'https://res.cloudinary.com/demo/image/upload/v1/foto.jpg'

    render(<Harness initial={[url]} />)

    await user.click(screen.getByRole('button', { name: 'Quitar foto 1' }))

    expect(screen.queryByAltText('Foto 1 de 1')).toBeNull()
    expect(screen.getByTestId('urls').textContent).toBe('')
  })

  it('avisa cuando Cloudinary no está configurado', () => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', '')
    vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', '')

    render(<Harness />)

    expect(
      screen.queryByLabelText('Subir fotos del sitio'),
    ).toBeNull()
    expect(screen.getByText(/falta configurar Cloudinary/)).toBeTruthy()
  })
})
