import { z } from 'zod'

/** Valida una respuesta del gateway antes de devolverla: un contrato roto se ve al instante. */
export function parseResponse<T>(
  schema: z.ZodType<T>,
  value: unknown,
  label: string,
): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new Error(`Respuesta inesperada de ${label}: ${result.error.message}`)
  }

  return result.data
}

/**
 * Envoltorio de los listados de ms-03 y ms-04. Si el backend deja de paginar,
 * esto falla en voz alta en vez de devolver `undefined` a la vista.
 */
export function pageSchema<T>(item: z.ZodType<T>) {
  return z.object({
    content: z.array(item),
    page: z.number(),
    size: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
}
