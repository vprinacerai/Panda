import postgres from 'postgres'

// Singleton — Next.js module cache keeps one pool across hot-reloads
const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: process.env.DATABASE_SSL === 'false' ? false : 'prefer',
  transform: postgres.camel, // snake_case columns → camelCase JS
})

export default sql
