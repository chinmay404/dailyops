// lib/store.ts
export interface Task {
  id: string;
  label: string;
  sub: string;
  icon: string;
  section: string;
  order: number;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  done: Record<string, boolean>;
  notes: Record<string, string>;
  score: number;
  total: number;
}

export interface AppState {
  tasks: Task[];
  logs: Record<string, DayLog>; // keyed by date
  notifTime: string; // "08:00"
}

const DEFAULT_TASKS: Task[] = [
  { id: 'wake', label: 'Wake + No Phone', sub: '20 mins no screen after waking', icon: '🌅', section: 'Morning', order: 0 },
  { id: 'walk', label: 'Morning Walk', sub: '20-30 mins outside', icon: '🚶', section: 'Morning', order: 1 },
  { id: 'shower', label: 'Cold Shower', sub: 'End cold, 30 sec minimum', icon: '🚿', section: 'Morning', order: 2 },
  { id: 'karpathy', label: 'ML Fundamentals', sub: 'Karpathy / training loop — 1 hour', icon: '🧠', section: 'Robotics', order: 3 },
  { id: 'rover', label: 'Rover / Project Work', sub: 'Build something real today', icon: '🤖', section: 'Robotics', order: 4 },
  { id: 'workout', label: 'Evening Workout', sub: 'Jog / bodyweight / walk — 30-45 mins', icon: '💪', section: 'Movement', order: 5 },
  { id: 'protein', label: 'Protein Every Meal', sub: 'Eggs / curd / meat — no skipping', icon: '🍳', section: 'Food', order: 6 },
  { id: 'cutoff', label: 'No Food After 9pm', sub: 'Hard cutoff. Water only.', icon: '🚫', section: 'Food', order: 7 },
  { id: 'deepwork', label: 'Deep Work Block Done', sub: 'No context switching — focused hours', icon: '⚡', section: 'Work', order: 8 },
];

const STORE_KEY = 'dailyops_v2';

export function getState(): AppState {
  if (typeof window === 'undefined') return { tasks: DEFAULT_TASKS, logs: {}, notifTime: '08:00' };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { tasks: DEFAULT_TASKS, logs: {}, notifTime: '08:00' };
    return JSON.parse(raw);
  } catch { return { tasks: DEFAULT_TASKS, logs: {}, notifTime: '08:00' }; }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTodayLog(state: AppState): DayLog {
  const today = getToday();
  return state.logs[today] || { date: today, done: {}, notes: {}, score: 0, total: state.tasks.length };
}

export function updateTodayLog(state: AppState, log: DayLog): AppState {
  const done = Object.values(log.done).filter(Boolean).length;
  return {
    ...state,
    logs: {
      ...state.logs,
      [log.date]: { ...log, score: done, total: state.tasks.length }
    }
  };
}

export function getLast7Days(): string[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export function getLast30Days(): string[] {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export function getCurrentStreak(logs: Record<string, DayLog>, total: number): number {
  let streak = 0;
  const today = getToday();
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (key === today && !logs[key]) continue; // today not logged yet, keep going
    const log = logs[key];
    if (log && log.score >= Math.ceil(total * 0.8)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const SECTIONS = ['Morning', 'Robotics', 'Movement', 'Food', 'Work'];
