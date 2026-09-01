// Helper centralizado para Set-Cookie con flag Secure en producción
export function buildCookie(name: string, value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${name}=${value}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}
