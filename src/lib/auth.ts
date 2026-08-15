import { NextRequest } from 'next/server'
import { verifyToken, JWTPayload } from './jwt'

export async function getSession(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get('panda_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function requireSession(session: JWTPayload | null): Response | null {
  if (!session) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }
  return null
}

export function requireAdmin(session: JWTPayload | null): Response | null {
  const authError = requireSession(session)
  if (authError) return authError
  if (session!.rol !== 'admin') {
    return Response.json({ error: 'Acceso denegado' }, { status: 403 })
  }
  return null
}
