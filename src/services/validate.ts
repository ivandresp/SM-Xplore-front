import type { z } from 'zod'

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
