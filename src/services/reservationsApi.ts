import { z } from 'zod'
import { httpClient } from './httpClient'
import { parseResponse, pageSchema } from './validate'
import type {
  ReservationItemResponse,
  ReservationRequest,
  ReservationResponse,
  ReservationStatus,
  ReservationSummaryResponse,
} from '@/types'

const reservationSchema = z.object({
  id: z.string(),
  code: z.string(),
  touristId: z.string(),
  itemType: z.enum(['ACTIVITY', 'EVENT']),
  itemId: z.string(),
  providerId: z.string().nullish(),
  guideId: z.string().nullish(),
  unitPrice: z.number(),
  numberOfPeople: z.number(),
  total: z.number(),
  paymentMethod: z.enum(['CARD', 'CASH', 'TRANSFER']),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED']),
  bookedAt: z.string(),
  bookedFor: z.string(),
  itemStartsAt: z.string(),
  notes: z.string().nullish(),
})

const reservationPageSchema = pageSchema(reservationSchema)

function toReservation(
  value: z.infer<typeof reservationSchema>,
): ReservationResponse {
  return {
    ...value,
    providerId: value.providerId ?? null,
    guideId: value.guideId ?? null,
    notes: value.notes ?? null,
  }
}

function toSummary(
  value: z.infer<typeof reservationSchema>,
): ReservationSummaryResponse {
  const { notes: _notes, ...summary } = toReservation(value)
  return summary
}

/** El backend no expone ítems sueltos: cada reserva trae el suyo. */
export function itemOf(
  reservation: ReservationResponse | ReservationSummaryResponse,
): ReservationItemResponse {
  return {
    reservationId: reservation.id,
    itemId: reservation.itemId,
    type: reservation.itemType,
    price: reservation.unitPrice,
  }
}

export const reservationsApi = {
  /** `POST /reservations` — 201. Nace `CONFIRMED`; el precio sale del catálogo. */
  create: async (payload: ReservationRequest) => {
    const data = await httpClient.post<unknown>('/reservations', payload)
    return toReservation(parseResponse(reservationSchema, data, 'POST /reservations'))
  },

  /** `GET /reservations/{id}` */
  getById: async (reservationId: string) => {
    const data = await httpClient.get<unknown>(`/reservations/${reservationId}`)
    return toReservation(
      parseResponse(reservationSchema, data, `GET /reservations/${reservationId}`),
    )
  },

  /** `GET /reservations/tourists/{touristId}?limit=` — devuelve un array. */
  listByTourist: async (touristId: string, limit = 50) => {
    const data = await httpClient.get<unknown>(
      `/reservations/tourists/${touristId}`,
      { query: { limit } },
    )
    return parseResponse(
      z.array(reservationSchema),
      data,
      `GET /reservations/tourists/${touristId}`,
    ).map(toSummary)
  },

  /** `GET /reservations/guides/{guideId}?status=&limit=` — devuelve un array. */
  listByGuide: async (
    guideId: string,
    { status, limit = 50 }: { status?: ReservationStatus; limit?: number } = {},
  ) => {
    const data = await httpClient.get<unknown>(
      `/reservations/guides/${guideId}`,
      { query: { status, limit } },
    )
    return parseResponse(
      z.array(reservationSchema),
      data,
      `GET /reservations/guides/${guideId}`,
    ).map(toSummary)
  },

  /** `GET /reservations/providers/{providerId}?status=&limit=` — devuelve un array. */
  listByProvider: async (
    providerId: string,
    { status, limit = 50 }: { status?: ReservationStatus; limit?: number } = {},
  ) => {
    const data = await httpClient.get<unknown>(
      `/reservations/providers/${providerId}`,
      { query: { status, limit } },
    )
    return parseResponse(
      z.array(reservationSchema),
      data,
      `GET /reservations/providers/${providerId}`,
    ).map(toSummary)
  },

  /** `GET /reservations/by-item?itemType=&itemId=&limit=` — devuelve un array. */
  listByItem: async ({
    itemType,
    itemId,
    limit = 50,
  }: {
    itemType: 'ACTIVITY' | 'EVENT'
    itemId: string
    limit?: number
  }) => {
    const data = await httpClient.get<unknown>('/reservations/by-item', {
      query: { itemType, itemId, limit },
    })
    return parseResponse(
      z.array(reservationSchema),
      data,
      'GET /reservations/by-item',
    ).map(toSummary)
  },

  /**
   * `GET /reservations?status=&page=` — página offset; `status` es obligatorio
   * y solo lo puede llamar ADMIN o DESTINATION_MANAGER.
   */
  listByStatus: async ({ status, page = 0, size = 20 }: {
    status: ReservationStatus
    page?: number
    size?: number
  }) => {
    const data = await httpClient.get<unknown>('/reservations', {
      query: { status, page, size },
    })
    return parseResponse(
      reservationPageSchema,
      data,
      'GET /reservations',
    ).content.map(toSummary)
  },

  /** `PATCH /reservations/{id}/cancel` — el turista dueño hasta 24 h antes. */
  cancel: async (reservationId: string) => {
    const data = await httpClient.patch<unknown>(
      `/reservations/${reservationId}/cancel`,
    )
    return toReservation(
      parseResponse(
        reservationSchema,
        data,
        `PATCH /reservations/${reservationId}/cancel`,
      ),
    )
  },

  /** `PATCH /reservations/{id}/attendance` — solo staff del ítem o ADMIN. */
  markAttendance: async (reservationId: string) => {
    const data = await httpClient.patch<unknown>(
      `/reservations/${reservationId}/attendance`,
    )
    return toReservation(
      parseResponse(
        reservationSchema,
        data,
        `PATCH /reservations/${reservationId}/attendance`,
      ),
    )
  },

  /** `PATCH /reservations/{id}/no-show` — solo staff del ítem o ADMIN. */
  markNoShow: async (reservationId: string) => {
    const data = await httpClient.patch<unknown>(
      `/reservations/${reservationId}/no-show`,
    )
    return toReservation(
      parseResponse(
        reservationSchema,
        data,
        `PATCH /reservations/${reservationId}/no-show`,
      ),
    )
  },
}
