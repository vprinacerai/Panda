import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { getSession, requireAdmin } from '@/lib/auth'

// Aplica migraciones pendientes — solo admin autenticado
// GET /api/migrate  (requiere cookie panda_token con rol admin)
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const migraciones = []
  try {
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS login_attempts integer DEFAULT 0`
    migraciones.push('✓ login_attempts agregado')
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS lockout_until timestamptz`
    migraciones.push('✓ lockout_until agregado')
    return Response.json({ ok: true, migraciones })
  } catch (err: any) {
    return Response.json({ error: err.message, migraciones }, { status: 500 })
  }
}
