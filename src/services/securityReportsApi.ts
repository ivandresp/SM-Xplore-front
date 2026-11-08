import { z } from 'zod'
import { httpClient } from './httpClient'
import { parseResponse } from './validate'
import type {
  CommentRequest,
  CommentResponse,
  CursorPage,
  SecurityReportByUserFilters,
  SecurityReportListFilters,
  SecurityReportRequest,
  SecurityReportResponse,
} from '@/types'

const userRefSchema = z.object({
  id: z.string(),
  name: z.string(),
})

const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
})

const reportSchema = z.object({
  id: z.string(),
  user: userRefSchema,
  title: z.string(),
  description: z.string().nullish(),
  location: locationSchema.nullish(),
  photosUrls: z.array(z.string()).nullish(),
  status: z.enum(['ONGOING', 'REPORTED', 'SOLVED']),
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
})

const commentSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  user: userRefSchema,
  content: z.string(),
  createdAt: z.string().nullish(),
})

/** ms-02 pagina por cursor: no hay `page`/`size`/`total` en la respuesta. */
function cursorPageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    content: z.array(item),
    nextCursor: z.string().nullish(),
    hasNext: z.boolean(),
  })
}

const reportPageSchema = cursorPageSchema(reportSchema)
const commentPageSchema = cursorPageSchema(commentSchema)

function toReport(value: z.infer<typeof reportSchema>): SecurityReportResponse {
  return {
    ...value,
    description: value.description ?? '',
    location: value.location ?? null,
    photosUrls: value.photosUrls ?? [],
    updatedAt: value.updatedAt ?? value.createdAt,
  }
}

function toComment(
  value: z.infer<typeof commentSchema>,
): CommentResponse {
  return { ...value, createdAt: value.createdAt ?? '' }
}

function toCursorPage<T>(
  value: { content: T[]; nextCursor?: string | null; hasNext: boolean },
): CursorPage<T> {
  return {
    content: value.content,
    nextCursor: value.nextCursor ?? null,
    hasNext: value.hasNext,
  }
}

export const securityReportsApi = {
  /** `POST /security-reports` — nace en `ONGOING`. */
  create: async (payload: SecurityReportRequest) => {
    const data = await httpClient.post<unknown>('/security-reports', payload)
    return toReport(
      parseResponse(reportSchema, data, 'POST /security-reports'),
    )
  },

  /** `GET /security-reports/{id}` */
  getById: async (reportId: string) => {
    const data = await httpClient.get<unknown>(`/security-reports/${reportId}`)
    return toReport(
      parseResponse(reportSchema, data, `GET /security-reports/${reportId}`),
    )
  },

  /** `GET /security-reports?status=&cursor=&size=` — `status` obligatorio, paginado por cursor. */
  list: async ({ status, cursor, size = 20 }: SecurityReportListFilters) => {
    const data = await httpClient.get<unknown>('/security-reports', {
      query: { status, cursor, size },
    })
    const page = parseResponse(reportPageSchema, data, 'GET /security-reports')
    return toCursorPage({ ...page, content: page.content.map(toReport) })
  },

  /** `GET /security-reports/by-user/{userId}?cursor=&size=` */
  listByUser: async (
    userId: string,
    { cursor, size = 20 }: SecurityReportByUserFilters = {},
  ) => {
    const data = await httpClient.get<unknown>(
      `/security-reports/by-user/${userId}`,
      { query: { cursor, size } },
    )
    const page = parseResponse(
      reportPageSchema,
      data,
      `GET /security-reports/by-user/${userId}`,
    )
    return toCursorPage({ ...page, content: page.content.map(toReport) })
  },

  /** `GET /security-reports/nearby?latitude=&longitude=&radiusKm=` — devuelve un array. */
  listNearby: async (params: {
    latitude: number
    longitude: number
    radiusKm?: number
    status?: string
    size?: number
  }) => {
    const data = await httpClient.get<unknown>('/security-reports/nearby', {
      query: { ...params, radiusKm: params.radiusKm ?? 5 },
    })
    return parseResponse(
      z.array(reportSchema),
      data,
      'GET /security-reports/nearby',
    ).map(toReport)
  },

  /** `POST /security-reports/{id}/close` — `ONGOING` -> `REPORTED`. */
  close: async (reportId: string) => {
    const data = await httpClient.post<unknown>(
      `/security-reports/${reportId}/close`,
    )
    return toReport(
      parseResponse(
        reportSchema,
        data,
        `POST /security-reports/${reportId}/close`,
      ),
    )
  },

  /** `POST /security-reports/{id}/solve` — `REPORTED` -> `SOLVED`. */
  solve: async (reportId: string) => {
    const data = await httpClient.post<unknown>(
      `/security-reports/${reportId}/solve`,
    )
    return toReport(
      parseResponse(
        reportSchema,
        data,
        `POST /security-reports/${reportId}/solve`,
      ),
    )
  },

  /** `POST /security-reports/{id}/comments` — 201. */
  addComment: async (reportId: string, payload: CommentRequest) => {
    const data = await httpClient.post<unknown>(
      `/security-reports/${reportId}/comments`,
      payload,
    )
    return toComment(
      parseResponse(
        commentSchema,
        data,
        `POST /security-reports/${reportId}/comments`,
      ),
    )
  },

  /** `GET /security-reports/{id}/comments?cursor=&size=` — solo autor o staff. */
  listComments: async (reportId: string, cursor?: string) => {
    const data = await httpClient.get<unknown>(
      `/security-reports/${reportId}/comments`,
      { query: { cursor } },
    )
    const page = parseResponse(
      commentPageSchema,
      data,
      `GET /security-reports/${reportId}/comments`,
    )
    return toCursorPage({ ...page, content: page.content.map(toComment) })
  },
}
