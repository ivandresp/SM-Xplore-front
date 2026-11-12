import { z } from 'zod'
import { httpClient } from './httpClient'
import { pageSchema, parseResponse } from './validate'
import type {
  RegistrationQueueParams,
  RegistrationReviewRequest,
} from '@/types'

const nullableString = z
  .string()
  .nullish()
  .transform((value) => value ?? null)

/** `RegistrationSummaryView` de ms-01. */
const registrationSummarySchema = z.object({
  id: z.string(),
  role: z.enum(['GUIDE', 'SERVICE_PROVIDER']),
  fullName: z.string(),
  email: z.string(),
  license: nullableString,
  nit: nullableString,
  signedUpAt: z.string(),
  registrationStatus: z.enum(['PENDIENTE', 'APROBADO', 'RECHAZADO']),
})

const registrationPageSchema = pageSchema(registrationSummarySchema)

export const registrationsApi = {
  /**
   * `GET /api/v1/registrations` — cola de altas para gestora y admin.
   * `200` con la página; `400` si el rol no se revisa o el estado es
   * `APROBADO`; `403` para el resto de roles.
   */
  list: (params: RegistrationQueueParams) =>
    httpClient
      .get<unknown>('/registrations', { query: { ...params } })
      .then((response) =>
        parseResponse(registrationPageSchema, response, 'GET /registrations'),
      ),

  /**
   * `POST /api/v1/registrations/{id}/review` — `204`.
   * `404` `REGISTRATION_NOT_FOUND` y `409` `INVALID_STATUS_TRANSITION`.
   */
  review: (id: string, payload: RegistrationReviewRequest) =>
    httpClient.post<void>(`/registrations/${id}/review`, payload),
}
