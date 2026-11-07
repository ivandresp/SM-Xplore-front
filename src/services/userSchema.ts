import { z } from 'zod'
import type { AuthUser } from '@/types'

/** `UserView` de ms-01. */
export const userViewSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  role: z.enum([
    'ADMIN',
    'GUIDE',
    'SERVICE_PROVIDER',
    'DESTINATION_MANAGER',
    'TOURIST',
  ]),
  status: z.enum(['ACTIVO', 'BLOQUEADO', 'SUSPENDIDO', 'ELIMINADO']),
  profile: z
    .record(z.string(), z.unknown())
    .nullish()
    .transform((value) => value ?? null),
  signedUpAt: z.string(),
  authVersion: z.number(),
})

export type UserView = z.infer<typeof userViewSchema>

/**
 * El backend manda el record del perfil sin discriminador; el rol es lo único
 * que dice cuál es. Se tipa aquí para que el resto de la app no adivine.
 */
export function toAuthUser(view: UserView): AuthUser {
  return view as unknown as AuthUser
}
