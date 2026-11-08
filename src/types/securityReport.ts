import type { LocationDto, UserRefDto } from './common'

export type SecurityReportStatus = 'ONGOING' | 'REPORTED' | 'SOLVED'

export interface SecurityReportResponse {
  id: string
  user: UserRefDto
  title: string
  description: string
  location: LocationDto | null
  photosUrls: string[]
  status: SecurityReportStatus
  createdAt: string
  updatedAt: string
}

/** El autor lo deriva el backend del token: no se envía en el cuerpo. */
export interface SecurityReportRequest {
  title: string
  description?: string
  location?: LocationDto
  photosUrls?: string[]
}

/** El autor lo deriva el backend del token: no se envía en el cuerpo. */
export interface CommentRequest {
  content: string
}

export interface CommentResponse {
  id: string
  reportId: string
  user: UserRefDto
  content: string
  createdAt: string
}

/** ms-02 pagina por cursor: `status` es obligatorio en el listado general. */
export interface SecurityReportListFilters {
  status: SecurityReportStatus
  cursor?: string
  size?: number
}

export interface SecurityReportByUserFilters {
  cursor?: string
  size?: number
}

/** ms-02 usa `{content, nextCursor, hasNext}`, no la página offset de ms-03/ms-04. */
export interface CursorPage<T> {
  content: T[]
  nextCursor: string | null
  hasNext: boolean
}
