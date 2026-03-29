import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var dailyOpsPool: Pool | undefined
}

function getConnectionString() {
  const raw =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL

  if (!raw) {
    throw new Error('Missing database connection string')
  }

  if (!raw.includes('[YOUR-PASSWORD]')) {
    return raw
  }

  if (!process.env.DB_PASS) {
    throw new Error('Missing DB_PASS for POSTGRES_URL placeholder replacement')
  }

  return raw.replace('[YOUR-PASSWORD]', encodeURIComponent(process.env.DB_PASS))
}

export function getPool() {
  if (!globalThis.dailyOpsPool) {
    const connectionString = getConnectionString()

    globalThis.dailyOpsPool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : undefined,
    })
  }

  return globalThis.dailyOpsPool
}
