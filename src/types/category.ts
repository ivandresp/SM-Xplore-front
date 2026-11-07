export type CategoryScope = 'GENERAL' | 'SITE' | 'ACTIVITY' | 'EVENT'

export interface CategoryResponse {
  id: string
  name: string
  scope: CategoryScope
  parentId: string | null
}
