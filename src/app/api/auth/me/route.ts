import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { signToken } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) {
    if (process.env.DEV_MODE !== 'true') return Response.json({ usuario: null })
    return Response.json({ usuario: null })
  }
  return Response.json({ usuario: { email: session.email, nombreDT: session.nombreDT, rol: session.rol } })
}