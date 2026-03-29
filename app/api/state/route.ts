import { getPool } from '../../../lib/db'
import {
  STATE_ROW_ID,
  createDefaultState,
  normalizeState,
  stampState,
} from '../../../lib/store'

export const dynamic = 'force-dynamic'

let schemaPromise: Promise<void> | null = null

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = getPool()
      .query(`
        create table if not exists dailyops_state (
          id text primary key,
          state jsonb not null,
          updated_at timestamptz not null default timezone('utc', now())
        )
      `)
      .then(() => undefined)
      .catch((error: unknown) => {
        schemaPromise = null
        throw error
      })
  }

  await schemaPromise
}

function formatStoredState(row: { state: unknown; updated_at: Date }) {
  return normalizeState({
    ...normalizeState(row.state),
    updatedAt: row.updated_at.toISOString(),
  })
}

export async function GET() {
  try {
    await ensureSchema()

    const result = await getPool().query(
      'select state, updated_at from dailyops_state where id = $1 limit 1',
      [STATE_ROW_ID]
    )

    if (result.rowCount === 0) {
      return Response.json({ exists: false, state: createDefaultState() })
    }

    return Response.json({
      exists: true,
      state: formatStoredState(result.rows[0]),
    })
  } catch (error) {
    console.error('Failed to load Daily Ops state', error)
    return Response.json({ error: 'Failed to load state' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await ensureSchema()

    const body = await request.json()
    const state = stampState(normalizeState(body))

    const result = await getPool().query(
      `
        insert into dailyops_state (id, state, updated_at)
        values ($1, $2::jsonb, $3::timestamptz)
        on conflict (id) do update
        set state = excluded.state,
            updated_at = excluded.updated_at
        returning state, updated_at
      `,
      [STATE_ROW_ID, JSON.stringify(state), state.updatedAt]
    )

    return Response.json({
      exists: true,
      state: formatStoredState(result.rows[0]),
    })
  } catch (error) {
    console.error('Failed to save Daily Ops state', error)
    return Response.json({ error: 'Failed to save state' }, { status: 500 })
  }
}
