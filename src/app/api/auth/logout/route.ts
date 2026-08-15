export async function POST() {
  const res = Response.json({ exito: true })
  const headers = new Headers(res.headers)
  headers.set('Set-Cookie', 'panda_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  return new Response(res.body, { status: 200, headers })
}
