import type { QueryLimit } from './common'

/** ms-03 solo maneja estos tres estados: nace `CONFIRMED`. */
export type ReservationStatus =
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'COMPLETED'

export type PaymentMethod = 'CARD' | 'CASH' | 'TRANSFER'

/** El backend solo reserva actividades y eventos; no hay reserva de servicios. */
export type ReservationItemType = 'ACTIVITY' | 'EVENT'

export interface ReservationResponse {
  id: string
  /** Código legible de la reserva, p. ej. `R-1024`. */
  code: string
  touristId: string
  itemType: ReservationItemType
  itemId: string
  providerId: string | null
  guideId: string | null
  /** Precio unitario tomado del catálogo al crear la reserva. */
  unitPrice: number
  numberOfPeople: number
  total: number
  paymentMethod: PaymentMethod
  status: ReservationStatus
  bookedAt: string
  bookedFor: string
  /** Inicio real del ítem reservado; el servidor sobreescribe `bookedFor` con esto. */
  itemStartsAt: string
  notes: string | null
}

/** Los listados no incluyen `notes`. */
export type ReservationSummaryResponse = Omit<ReservationResponse, 'notes'>

/**
 * Vista del ítem de una reserva. El backend guarda **un** ítem por reserva
 * (no hay endpoint de ítems sueltos), así que se deriva de la propia reserva.
 */
export interface ReservationItemResponse {
  reservationId: string
  itemId: string
  type: ReservationItemType
  price: number
}

/** El precio no se envía: lo toma el backend del catálogo. */
export interface ReservationRequest {
  touristId: string
  itemType: ReservationItemType
  itemId: string
  numberOfPeople: number
  paymentMethod: PaymentMethod
  bookedFor: string
  notes?: string
}

/** Filtros de las reservas recibidas por un guía. */
export interface ReceivedReservationsFilters {
  status?: ReservationStatus
  limit?: QueryLimit
}

export interface ReservationByItemFilters {
  itemType: ReservationItemType
  itemId: string
  limit?: QueryLimit
}
