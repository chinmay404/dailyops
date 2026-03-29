export interface Task {
  id: string
  label: string
  sub: string
  icon: string
  section: string
  order: number
}

export interface DayLog {
  date: string
  done: Record<string, boolean>
  notes: Record<string, string>
  score: number
  total: number
}

export interface AppState {
  tasks: Task[]
  logs: Record<string, DayLog>
  notifTime: string
  updatedAt?: string
}

const DEFAULT_NOTIF_TIME = '08:00'
export const STORE_KEY = 'dailyops_v2'
export const STATE_ROW_ID = 'default'
export const SECTIONS = ['Morning', 'Robotics', 'Movement', 'Food', 'Work']

export const DEFAULT_TASKS: Task[] = [
  { id: 'wake', label: 'Wake + No Phone', sub: '20 mins no screen after waking', icon: '🌅', section: 'Morning', order: 0 },
  { id: 'walk', label: 'Morning Walk', sub: '20-30 mins outside', icon: '🚶', section: 'Morning', order: 1 },
  { id: 'shower', label: 'Cold Shower', sub: 'End cold, 30 sec minimum', icon: '🚿', section: 'Morning', order: 2 },
  { id: 'karpathy', label: 'ML Fundamentals', sub: 'Karpathy / training loop — 1 hour', icon: '🧠', section: 'Robotics', order: 3 },
  { id: 'rover', label: 'Rover / Project Work', sub: 'Build something real today', icon: '🤖', section: 'Robotics', order: 4 },
  { id: 'workout', label: 'Evening Workout', sub: 'Jog / bodyweight / walk — 30-45 mins', icon: '💪', section: 'Movement', order: 5 },
  { id: 'protein', label: 'Protein Every Meal', sub: 'Eggs / curd / meat — no skipping', icon: '🍳', section: 'Food', order: 6 },
  { id: 'cutoff', label: 'No Food After 9pm', sub: 'Hard cutoff. Water only.', icon: '🚫', section: 'Food', order: 7 },
  { id: 'deepwork', label: 'Deep Work Block Done', sub: 'No context switching — focused hours', icon: '⚡', section: 'Work', order: 8 },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneTask(task: Task): Task {
  return { ...task }
}

function countDone(done: Record<string, boolean>) {
  return Object.values(done).filter(Boolean).length
}

function normalizeTask(value: unknown, fallbackOrder: number): Task | null {
  if (!isRecord(value)) return null

  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const label = typeof value.label === 'string' ? value.label.trim() : ''

  if (!id || !label) return null

  return {
    id,
    label,
    sub: typeof value.sub === 'string' ? value.sub : '',
    icon: typeof value.icon === 'string' && value.icon ? value.icon : '📌',
    section: typeof value.section === 'string' && value.section ? value.section : 'Work',
    order: typeof value.order === 'number' ? value.order : fallbackOrder,
  }
}

function normalizeBooleanRecord(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {}

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry === 'boolean')
  ) as Record<string, boolean>
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry === 'string')
  ) as Record<string, string>
}

function normalizeLog(date: string, value: unknown, total: number): DayLog | null {
  if (!isRecord(value)) return null

  const done = normalizeBooleanRecord(value.done)
  const notes = normalizeStringRecord(value.notes)
  const score = countDone(done)

  return {
    date,
    done,
    notes,
    score,
    total: typeof value.total === 'number' ? value.total : total,
  }
}

export function createDefaultState(): AppState {
  return {
    tasks: DEFAULT_TASKS.map(cloneTask),
    logs: {},
    notifTime: DEFAULT_NOTIF_TIME,
  }
}

export function normalizeState(input: unknown): AppState {
  const base = createDefaultState()

  if (!isRecord(input)) {
    return base
  }

  const parsedTasks = Array.isArray(input.tasks)
    ? input.tasks
        .map((task, index) => normalizeTask(task, index))
        .filter((task): task is Task => Boolean(task))
    : []

  const tasks = (parsedTasks.length ? parsedTasks : base.tasks)
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((task, index) => ({ ...task, order: index }))

  const total = tasks.length
  const logs: Record<string, DayLog> = {}

  if (isRecord(input.logs)) {
    for (const [date, value] of Object.entries(input.logs)) {
      const log = normalizeLog(date, value, total)
      if (log) {
        logs[date] = log
      }
    }
  }

  const updatedAt = typeof input.updatedAt === 'string' ? input.updatedAt : undefined

  return {
    tasks,
    logs,
    notifTime: typeof input.notifTime === 'string' && input.notifTime ? input.notifTime : base.notifTime,
    ...(updatedAt ? { updatedAt } : {}),
  }
}

export function getState(): AppState {
  if (typeof window === 'undefined') return createDefaultState()

  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? normalizeState(JSON.parse(raw)) : createDefaultState()
  } catch {
    return createDefaultState()
  }
}

export function saveState(state: AppState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORE_KEY, JSON.stringify(normalizeState(state)))
}

export function clearStateCache() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORE_KEY)
}

export function stampState(state: AppState): AppState {
  return {
    ...normalizeState(state),
    updatedAt: new Date().toISOString(),
  }
}

export function hasMeaningfulState(state: AppState): boolean {
  if (Object.keys(state.logs).length > 0) return true
  if (state.notifTime !== DEFAULT_NOTIF_TIME) return true
  if (state.tasks.length !== DEFAULT_TASKS.length) return true

  return state.tasks.some((task, index) => {
    const baseTask = DEFAULT_TASKS[index]
    return JSON.stringify(task) !== JSON.stringify(baseTask)
  })
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

export function getTodayLog(state: AppState): DayLog {
  const today = getToday()
  return state.logs[today] || { date: today, done: {}, notes: {}, score: 0, total: state.tasks.length }
}

export function updateTodayLog(state: AppState, log: DayLog): AppState {
  const normalized = normalizeState(state)
  const score = countDone(log.done)

  return {
    ...normalized,
    logs: {
      ...normalized.logs,
      [log.date]: { ...log, score, total: normalized.tasks.length },
    },
  }
}

export function getLast7Days(): string[] {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export function getLast30Days(): string[] {
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export function getCurrentStreak(logs: Record<string, DayLog>, total: number): number {
  let streak = 0
  const today = getToday()

  for (let i = 0; i < 365; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]

    if (key === today && !logs[key]) continue

    const log = logs[key]
    if (log && log.score >= Math.ceil(total * 0.8)) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return streak
}

export function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
