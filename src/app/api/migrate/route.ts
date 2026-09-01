import { NextRequest } from 'next/server'
import sql from '@/lib/db'

// Aplica migraciones pendientes de forma segura
// GET /api/migrate?secret=TU_SETUP_SECRET
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 })
  }

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
