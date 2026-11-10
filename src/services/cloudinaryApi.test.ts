import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CLOUDINARY_MAX_IMAGE_BYTES,
  ImageUploadError,
  describeImageUploadError,
  isCloudinaryConfigured,
  uploadImage,
  validateImageFile,
} from './cloudinaryApi'

function imageFile(
  name = 'foto.jpg',
  type = 'image/jpeg',
  contents = 'imagen',
): File {
  return new File([contents], name, { type })
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const CLOUDINARY_RESPONSE = {
  secure_url:
    'https://res.cloudinary.com/demo/image/upload/v1/sm-xplore/sites/foto.jpg',
  public_id: 'sm-xplore/sites/foto',
  width: 1200,
  height: 800,
}

describe('cloudinaryApi', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'demo')
    vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'sm-xplore-unsigned')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('detecta si faltan las variables públicas de Cloudinary', () => {
    expect(isCloudinaryConfigured()).toBe(true)

    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', '')
    vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', '')

    expect(isCloudinaryConfigured()).toBe(false)
  })

  it('sube la imagen con multipart y devuelve la URL segura', async () => {
    const fetchStub = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        const body = init?.body as FormData
        expect(init?.method).toBe('POST')
        expect(body.get('upload_preset')).toBe('sm-xplore-unsigned')
        expect(body.get('folder')).toBe('sm-xplore/sites')
        expect(body.get('file')).toBeInstanceOf(File)

        return jsonResponse(CLOUDINARY_RESPONSE)
      },
    )
    vi.stubGlobal('fetch', fetchStub)

    const result = await uploadImage(imageFile('playa.jpg'), {
      folder: 'sm-xplore/sites',
    })

    expect(fetchStub).toHaveBeenCalledTimes(1)
    expect(fetchStub.mock.calls[0][0]).toBe(
      'https://api.cloudinary.com/v1_1/demo/image/upload',
    )
    expect(result).toEqual({
      url: CLOUDINARY_RESPONSE.secure_url,
      publicId: CLOUDINARY_RESPONSE.public_id,
      width: 1200,
      height: 800,
    })
  })

  it('rechaza formatos no compatibles sin llamar a Cloudinary', async () => {
    const fetchStub = vi.fn()
    vi.stubGlobal('fetch', fetchStub)

    const error = await uploadImage(
      imageFile('documento.pdf', 'application/pdf'),
    ).catch((cause) => cause)

    expect(error).toBeInstanceOf(ImageUploadError)
    expect((error as ImageUploadError).code).toBe('INVALID_TYPE')
    expect(describeImageUploadError(error)).toContain('JPG, PNG o WebP')
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('rechaza imágenes que superan el tamaño máximo', async () => {
    const tooLarge = {
      name: 'enorme.jpg',
      type: 'image/jpeg',
      size: CLOUDINARY_MAX_IMAGE_BYTES + 1,
    } as File

    expect(validateImageFile(tooLarge)).toContain('supera el máximo')

    const error = await uploadImage(tooLarge).catch((cause) => cause)
    expect((error as ImageUploadError).code).toBe('TOO_LARGE')
  })

  it('traduce el rechazo de Cloudinary sin mostrar el texto crudo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          { error: { message: 'Upload preset not found' } },
          400,
        ),
      ),
    )

    const error = (await uploadImage(imageFile()).catch(
      (cause) => cause,
    )) as ImageUploadError

    expect(error).toBeInstanceOf(ImageUploadError)
    expect(error.code).toBe('REJECTED')
    expect(error.status).toBe(400)
    expect(error.detail).toBe('Upload preset not found')
    expect(describeImageUploadError(error)).not.toContain(
      'Upload preset not found',
    )
  })

  it('avisa cuando no hay conexión con Cloudinary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )

    const error = (await uploadImage(imageFile()).catch(
      (cause) => cause,
    )) as ImageUploadError

    expect(error.code).toBe('NETWORK')
    expect(error.message).toContain('No pudimos conectar con Cloudinary')
  })

  it('valida que Cloudinary devuelva la URL esperada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ public_id: 'sin-url' })),
    )

    const error = (await uploadImage(imageFile()).catch(
      (cause) => cause,
    )) as ImageUploadError

    expect(error.code).toBe('INVALID_RESPONSE')
  })
})
