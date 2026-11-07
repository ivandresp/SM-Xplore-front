import { z } from 'zod'
import { httpClient } from './httpClient'
import { pageSchema, parseResponse } from './validate'
import { MAX_PAGE_SIZE } from '@/types/common'
import type { CategoryResponse, CategoryScope } from '@/types'

const categorySchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  scope: z.enum(['GENERAL', 'SITE', 'ACTIVITY', 'EVENT']),
  parentId: z.string().nullable(),
  updatedAt: z.string(),
})

const categoryPageSchema = pageSchema(categorySchema)

function toCategory(response: z.infer<typeof categorySchema>): CategoryResponse {
  return {
    id: response.categoryId,
    name: response.name,
    scope: response.scope,
    parentId: response.parentId,
  }
}

/** Categorías del catálogo (ms-04). Requiere sesión. */
export const categoriesApi = {
  /** `GET /api/v1/categories?scope=` */
  list: async (scope?: CategoryScope): Promise<CategoryResponse[]> => {
    const response = await httpClient.get<unknown>('/categories', {
      query: { scope, page: 0, size: MAX_PAGE_SIZE },
    })

    return parseResponse(categoryPageSchema, response, 'GET /categories').content.map(
      toCategory,
    )
  },
}
