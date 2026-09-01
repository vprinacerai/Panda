import postgres from 'postgres'

const isServerless = process.env.VERCEL === '1'

// En serverless (Vercel) usar max:1 para no agotar conexiones del pool de Neon
// En local usar max:10 para mejor rendimiento en desarrollo
const sql = postgres(process.env.DATABASE_URL!, {
  max:             isServerless ? 1 : 10,
  idle_timeout:    isServerless ? 5 : 20,
  connect_timeout: 10,
  ssl: process.env.DATABASE_SSL === 'false' ? false : 'prefer',
  transform: postgres.camel,
})

export default sql
