import {
  AppState,
  DayLog,
  Task,
  getState as getCachedState,
  hasMeaningfulState,
  normalizeState,
  saveState as saveCachedState,
  stampState,
} from './store'

interface StateResponse {
  exists: boolean
  state: AppState
}

interface HydrationResult {
  state: AppState
  synced: boolean
}

function parseTimestamp(value?: string) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function stateSignature(state: AppState) {
  const normalized = normalizeState(state)
  return JSON.stringify({
    tasks: normalized.tasks,
    logs: normalized.logs,
    notifTime: normalized.notifTime,
  })
}

function mergeTasks(primary: Task[], secondary: Task[]) {
  const merged = new Map<string, Task>()

  for (const task of primary) {
    merged.set(task.id, task)
  }

  for (const task of secondary) {
    if (!merged.has(task.id)) {
      merged.set(task.id, task)
    }
  }

  return Array.from(merged.values())
    .sort((left, right) => left.order - right.order)
    .map((task, index) => ({ ...task, order: index }))
}

function mergeDayLogs(primary: DayLog, secondary: DayLog): DayLog {
  const primaryScore = Object.values(primary.done).filter(Boolean).length
  const secondaryScore = Object.values(secondary.done).filter(Boolean).length
  const preferred = secondaryScore > primaryScore ? secondary : primary
  const fallback = preferred === primary ? secondary : primary

  return {
    date: preferred.date,
    done: { ...fallback.done, ...preferred.done },
    notes: { ...fallback.notes, ...preferred.notes },
    score: Math.max(primaryScore, secondaryScore),
    total: Math.max(primary.total, secondary.total),
  }
}

function mergeStates(primary: AppState, secondary: AppState): AppState {
  const normalizedPrimary = normalizeState(primary)
  const normalizedSecondary = normalizeState(secondary)
  const logs: Record<string, DayLog> = { ...normalizedPrimary.logs }

  for (const [date, log] of Object.entries(normalizedSecondary.logs)) {
    logs[date] = logs[date] ? mergeDayLogs(logs[date], log) : log
  }

  const primaryStamp = parseTimestamp(normalizedPrimary.updatedAt)
  const secondaryStamp = parseTimestamp(normalizedSecondary.updatedAt)

  return normalizeState({
    tasks: mergeTasks(normalizedPrimary.tasks, normalizedSecondary.tasks),
    logs,
    notifTime: primaryStamp >= secondaryStamp ? normalizedPrimary.notifTime : normalizedSecondary.notifTime,
    updatedAt:
      primaryStamp >= secondaryStamp
        ? normalizedPrimary.updatedAt || normalizedSecondary.updatedAt
        : normalizedSecondary.updatedAt || normalizedPrimary.updatedAt,
  })
}

function resolveState(cached: AppState, remote: AppState, remoteExists: boolean) {
  const localState = normalizeState(cached)
  const remoteState = normalizeState(remote)
  const localTimestamp = parseTimestamp(localState.updatedAt)
  const remoteTimestamp = parseTimestamp(remoteState.updatedAt)

  if (!remoteExists) {
    return {
      state: hasMeaningfulState(localState) ? stampState(localState) : remoteState,
      shouldPersist: hasMeaningfulState(localState),
    }
  }

  if (localTimestamp && remoteTimestamp && localTimestamp !== remoteTimestamp) {
    return {
      state: localTimestamp > remoteTimestamp ? localState : remoteState,
      shouldPersist: localTimestamp > remoteTimestamp,
    }
  }

  if (localTimestamp && !remoteTimestamp && hasMeaningfulState(localState)) {
    return { state: localState, shouldPersist: true }
  }

  if (!localTimestamp && remoteTimestamp) {
    return { state: remoteState, shouldPersist: false }
  }

  if (!hasMeaningfulState(localState)) {
    return { state: remoteState, shouldPersist: false }
  }

  if (!hasMeaningfulState(remoteState)) {
    return { state: stampState(localState), shouldPersist: true }
  }

  const mergedState = stampState(mergeStates(remoteState, localState))
  const signaturesMatch = stateSignature(mergedState) === stateSignature(remoteState)

  return {
    state: mergedState,
    shouldPersist: !signaturesMatch,
  }
}

async function requestState(init?: RequestInit): Promise<StateResponse> {
  const response = await fetch('/api/state', {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`State request failed: ${response.status}`)
  }

  const payload = (await response.json()) as StateResponse
  return {
    exists: Boolean(payload.exists),
    state: normalizeState(payload.state),
  }
}

export async function hydrateState(): Promise<HydrationResult> {
  const cached = getCachedState()

  try {
    const remote = await requestState()
    const resolved = resolveState(cached, remote.state, remote.exists)

    saveCachedState(resolved.state)

    if (resolved.shouldPersist) {
      const syncedState = await persistState(resolved.state)
      return { state: syncedState, synced: true }
    }

    return { state: resolved.state, synced: true }
  } catch {
    return { state: cached, synced: false }
  }
}

export async function persistState(state: AppState): Promise<AppState> {
  const stamped = stampState(state)
  saveCachedState(stamped)

  const payload = await requestState({
    method: 'PUT',
    body: JSON.stringify(stamped),
  })

  saveCachedState(payload.state)
  return payload.state
}
