export type CategoryScope = 'GENERAL' | 'SITE' | 'ACTIVITY' | 'EVENT' | 'SERVICE'

export interface CategoryResponse {
  id: string
  name: string
  scope: CategoryScope
  parentId: string | null
}

/** POST /categories; no jerarquía si parentId es null. */
export interface CategoryInput {
  name: string
  scope: CategoryScope
  parentId: string | null
}
