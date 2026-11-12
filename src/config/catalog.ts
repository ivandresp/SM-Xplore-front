/** Topes de precio que ofrece el catálogo; el servidor acepta cualquier valor. */
export const MAX_PRICE_OPTIONS = [50000, 100000, 200000, 500000]

/**
 * Bloques del esqueleto del catálogo: una fila de tarjetas en 1280 px.
 * El total real no se conoce hasta que responde el servidor; con 0-4 resultados
 * casi no hay salto y con 12 se acepta el residuo de la primera carga.
 */
export const CATALOG_SKELETON_COUNT = 4
