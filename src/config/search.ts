/** Longitud del texto de búsqueda, excluidos los espacios de los extremos. */
export const MIN_SEARCH_LENGTH = 3

/** Vacío restablece el listado; texto incompleto no debe enviarse al servidor. */
export function isSearchReady(value: string | null | undefined): boolean {
  const length = value?.trim().length ?? 0
  return length === 0 || length >= MIN_SEARCH_LENGTH
}
