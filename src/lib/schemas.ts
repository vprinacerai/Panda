import { z } from 'zod'

const POSICIONES = ['ARQ', 'DEF', 'VOL', 'DEL'] as const
const uuid = z.string().uuid()

export const LoginSchema = z.object({
  email:    z.string().email('Email inválido').max(200),
  password: z.string().min(1, 'Contraseña requerida').max(200),
  torneoId: uuid,
})

export const RegistroSchema = z.object({
  email:    z.string().email('Email inválido').max(200).transform(s => s.trim().toLowerCase()),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
  nombreDT: z.string().min(1).max(20).transform(s => s.trim()),
  torneoId: uuid,
})

export const RecuperarSchema = z.object({
  email:    z.string().email().max(200).transform(s => s.trim().toLowerCase()),
  torneoId: uuid,
})

export const CambiarClaveSchema = z.object({
  email:        z.string().email().max(200).transform(s => s.trim().toLowerCase()),
  codigo:       z.string().length(6).regex(/^\d+$/, 'Código inválido'),
  nuevaPassword: z.string().min(8).max(200),
  torneoId:     uuid,
})

export const GuardarEquipoSchema = z.object({
  nombreEquipo: z.string().min(1).max(15).transform(s => s.trim()),
  jugadoresIds: z.array(uuid).length(7, 'Se requieren exactamente 7 jugadores'),
  capitanId:    uuid,
  fechaConfigId: uuid,
})

export const JugadorSchema = z.object({
  nombre:   z.string().min(1).max(100).transform(s => s.trim()),
  equipo:   z.string().min(1).max(100).transform(s => s.trim()),
  posicion: z.enum(POSICIONES),
  activo:   z.boolean().optional(),
})

export const FechaSchema = z.object({
  nombreFecha:    z.string().min(1).max(50).transform(s => s.trim()),
  numero:         z.number().int().positive(),
  deadlineCierre: z.string().datetime().nullable().optional(),
  fechaFin:       z.string().datetime().nullable().optional(),
})

// Helper: parsea body con schema Zod y devuelve error 400 si falla
export async function parseBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<{ data: T } | Response> {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      const issues: Array<{ message: string }> = (result.error as any).issues ?? []
      const mensaje = issues.map(e => e.message).join('. ') || 'Datos inválidos.'
      return Response.json({ error: mensaje }, { status: 400 })
    }
    return { data: result.data }
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 })
  }
}
