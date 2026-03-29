'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getState, saveState, getToday, getTodayLog, updateTodayLog,
  getLast7Days, getLast30Days, getCurrentStreak, formatDate,
  SECTIONS, AppState, DayLog, Task
} from '../lib/store'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip
} from 'recharts'

type View = 'today' | 'history' | 'settings'

export default function DailyOps() {
  const [state, setState] = useState<AppState | null>(null)
  const [view, setView] = useState<View>('today')
  const [todayLog, setTodayLog] = useState<DayLog | null>(null)
  const [activeNote, setActiveNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [winFlash, setWinFlash] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTaskLabel, setNewTaskLabel] = useState('')
  const [newTaskSub, setNewTaskSub] = useState('')
  const [newTaskSection, setNewTaskSection] = useState('Morning')
  const [showAddTask, setShowAddTask] = useState(false)
  const [notifTime, setNotifTime] = useState('08:00')
  const [notifGranted, setNotifGranted] = useState(false)

  useEffect(() => {
    const s = getState()
    setState(s)
    setTodayLog(getTodayLog(s))
    setNotifTime(s.notifTime || '08:00')
    if (typeof Notification !== 'undefined') {
      setNotifGranted(Notification.permission === 'granted')
    }
  }, [])

  const persist = useCallback((newState: AppState, newLog: DayLog) => {
    const updated = updateTodayLog(newState, newLog)
    saveState(updated)
    setState(updated)
    setTodayLog(newLog)
  }, [])

  const toggleTask = (taskId: string) => {
    if (!state || !todayLog) return
    const newDone = { ...todayLog.done, [taskId]: !todayLog.done[taskId] }
    const newLog = { ...todayLog, done: newDone }
    persist(state, newLog)
    const total = state.tasks.length
    const doneCount = Object.values(newDone).filter(Boolean).length
    if (doneCount === total) {
      setWinFlash(true)
      setTimeout(() => setWinFlash(false), 3000)
    }
  }

  const openNote = (taskId: string) => {
    if (!todayLog) return
    setActiveNote(taskId)
    setNoteText(todayLog.notes[taskId] || '')
  }

  const saveNote = () => {
    if (!state || !todayLog || !activeNote) return
    const newLog = { ...todayLog, notes: { ...todayLog.notes, [activeNote]: noteText } }
    persist(state, newLog)
    setActiveNote(null)
  }

  const requestNotif = async () => {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setNotifGranted(perm === 'granted')
    if (perm === 'granted') scheduleNotif(notifTime)
  }

  const scheduleNotif = (time: string) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const [h, m] = time.split(':').map(Number)
    const now = new Date()
    const target = new Date()
    target.setHours(h, m, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    const delay = target.getTime() - now.getTime()
    setTimeout(() => {
      new Notification('Daily Ops 🔥', { body: "Time to lock in. Open your tracker.", icon: '/icon-192.png' })
    }, delay)
  }

  const saveNotifTime = () => {
    if (!state) return
    const newState = { ...state, notifTime }
    saveState(newState)
    setState(newState)
    scheduleNotif(notifTime)
  }

  const deleteTask = (taskId: string) => {
    if (!state || !todayLog) return
    const newTasks = state.tasks.filter(t => t.id !== taskId)
    const newDone = { ...todayLog.done }
    delete newDone[taskId]
    const newLog = { ...todayLog, done: newDone }
    const newState = { ...state, tasks: newTasks }
    persist(newState, newLog)
  }

  const addTask = () => {
    if (!state || !newTaskLabel.trim()) return
    const id = 'custom_' + Date.now()
    const task: Task = {
      id, label: newTaskLabel, sub: newTaskSub, icon: '📌',
      section: newTaskSection, order: state.tasks.length
    }
    const newState = { ...state, tasks: [...state.tasks, task] }
    saveState(newState)
    setState(newState)
    setNewTaskLabel(''); setNewTaskSub(''); setShowAddTask(false)
  }

  const saveEditTask = () => {
    if (!state || !editingTask) return
    const newTasks = state.tasks.map(t => t.id === editingTask.id ? editingTask : t)
    const newState = { ...state, tasks: newTasks }
    saveState(newState)
    setState(newState)
    setEditingTask(null)
  }

  if (!state || !todayLog) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
      <div style={{ fontFamily: 'Space Mono', color: 'var(--text-dim)', fontSize: 11, letterSpacing: 3 }}>LOADING...</div>
    </div>
  )

  const tasks = state.tasks
  const total = tasks.length
  const doneCount = Object.values(todayLog.done).filter(Boolean).length
  const pct = total ? Math.round((doneCount / total) * 100) : 0
  const streak = getCurrentStreak(state.logs, total)
  const today = getToday()

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>

      {/* WIN BANNER */}
      {winFlash && (
        <div className="animate-slidedown" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          background: 'var(--accent)', color: '#000', textAlign: 'center',
          padding: '12px', fontFamily: 'Bebas Neue', fontSize: 20, letterSpacing: 4,
          maxWidth: 480, margin: '0 auto'
        }}>
          🔥 ALL {total} DONE. BEAST MODE.
        </div>
      )}

      {/* NOTE MODAL */}
      {activeNote && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-end', maxWidth: 480, margin: '0 auto'
        }}>
          <div style={{ width: '100%', background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: 20 }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 3, marginBottom: 12 }}>
              NOTE — {tasks.find(t => t.id === activeNote)?.label?.toUpperCase()}
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="What actually happened today..."
              rows={4}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                color: 'var(--text)', padding: 12, fontFamily: 'DM Sans', fontSize: 14,
                resize: 'none', outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={saveNote} style={{
                flex: 1, background: 'var(--accent)', color: '#000', border: 'none',
                fontFamily: 'Space Mono', fontSize: 11, letterSpacing: 2, padding: 10, cursor: 'pointer'
              }}>SAVE</button>
              <button onClick={() => setActiveNote(null)} style={{
                flex: 1, background: 'transparent', color: 'var(--text-dim)',
                border: '1px solid var(--border)', fontFamily: 'Space Mono', fontSize: 11, padding: 10, cursor: 'pointer'
              }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editingTask && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-end', maxWidth: 480, margin: '0 auto'
        }}>
          <div style={{ width: '100%', background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: 20 }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 3, marginBottom: 12 }}>EDIT TASK</div>
            <input value={editingTask.label} onChange={e => setEditingTask({ ...editingTask, label: e.target.value })}
              placeholder="Task name" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', fontFamily: 'DM Sans', fontSize: 14, outline: 'none', marginBottom: 8 }} />
            <input value={editingTask.sub} onChange={e => setEditingTask({ ...editingTask, sub: e.target.value })}
              placeholder="Subtitle" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', fontFamily: 'DM Sans', fontSize: 14, outline: 'none', marginBottom: 8 }} />
            <select value={editingTask.section} onChange={e => setEditingTask({ ...editingTask, section: e.target.value })}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', fontFamily: 'DM Sans', fontSize: 14, outline: 'none', marginBottom: 12 }}>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEditTask} style={{ flex: 1, background: 'var(--accent)', color: '#000', border: 'none', fontFamily: 'Space Mono', fontSize: 11, padding: 10, cursor: 'pointer', letterSpacing: 2 }}>SAVE</button>
              <button onClick={() => setEditingTask(null)} style={{ flex: 1, background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', fontFamily: 'Space Mono', fontSize: 11, padding: 10, cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ padding: '24px 20px 0', borderBottom: '1px solid var(--border)', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 38, letterSpacing: 4, lineHeight: 1 }}>DAILY OPS</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 2, marginTop: 2 }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 48, color: 'var(--accent)', lineHeight: 1 }}>{doneCount}</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1 }}>/ {total} DONE</div>
            {streak > 0 && (
              <div style={{ fontFamily: 'Space Mono', fontSize: 8, color: 'var(--accent)', marginTop: 2 }}>🔥 {streak} DAY STREAK</div>
            )}
          </div>
        </div>
        {/* PROGRESS BAR */}
        <div style={{ height: 2, background: 'var(--border)', marginBottom: 0 }}>
          <div style={{ height: '100%', background: 'var(--accent)', width: pct + '%', transition: 'width 0.4s ease', boxShadow: pct > 0 ? '0 0 8px var(--accent)' : 'none' }} />
        </div>
        {/* NAV */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(['today', 'history', 'settings'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              flex: 1, background: 'transparent', border: 'none',
              borderBottom: view === v ? '2px solid var(--accent)' : '2px solid transparent',
              color: view === v ? 'var(--accent)' : 'var(--text-dim)',
              fontFamily: 'Space Mono', fontSize: 9, letterSpacing: 2,
              padding: '10px 0', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s'
            }}>{v}</button>
          ))}
        </div>
      </div>

      {/* VIEWS */}
      <div style={{ padding: '0 20px 100px' }}>

        {/* TODAY VIEW */}
        {view === 'today' && (
          <div className="animate-fadein">
            {/* Yesterday's failures */}
            <YesterdayFailures state={state} />

            {SECTIONS.map(section => {
              const sectionTasks = tasks.filter(t => t.section === section)
              if (!sectionTasks.length) return null
              const secDone = sectionTasks.filter(t => todayLog.done[t.id]).length
              return (
                <div key={section} style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: 3, color: 'var(--text-dim)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '3px 8px' }}>
                      {section.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: secDone === sectionTasks.length ? 'var(--accent)' : 'var(--text-dim)' }}>
                      {secDone}/{sectionTasks.length}
                    </div>
                  </div>
                  {sectionTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      done={!!todayLog.done[task.id]}
                      hasNote={!!todayLog.notes[task.id]}
                      onToggle={() => toggleTask(task.id)}
                      onNote={() => openNote(task.id)}
                      onEdit={() => setEditingTask(task)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>
              )
            })}

            {/* Add task */}
            <div style={{ marginTop: 28 }}>
              {!showAddTask ? (
                <button onClick={() => setShowAddTask(true)} style={{
                  width: '100%', background: 'transparent', border: '1px dashed var(--border)',
                  color: 'var(--text-dim)', fontFamily: 'Space Mono', fontSize: 9, letterSpacing: 2,
                  padding: 12, cursor: 'pointer', transition: 'all 0.2s'
                }}>+ ADD CUSTOM TASK</button>
              ) : (
                <div style={{ border: '1px solid var(--border)', padding: 16, background: 'var(--surface)' }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 3, marginBottom: 12 }}>NEW TASK</div>
                  <input value={newTaskLabel} onChange={e => setNewTaskLabel(e.target.value)} placeholder="Task name *"
                    style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', marginBottom: 6 }} />
                  <input value={newTaskSub} onChange={e => setNewTaskSub(e.target.value)} placeholder="Subtitle (optional)"
                    style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', marginBottom: 6 }} />
                  <select value={newTaskSection} onChange={e => setNewTaskSection(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', marginBottom: 12 }}>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={addTask} style={{ flex: 1, background: 'var(--accent)', color: '#000', border: 'none', fontFamily: 'Space Mono', fontSize: 10, padding: 8, cursor: 'pointer', letterSpacing: 2 }}>ADD</button>
                    <button onClick={() => setShowAddTask(false)} style={{ flex: 1, background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', fontFamily: 'Space Mono', fontSize: 10, padding: 8, cursor: 'pointer' }}>CANCEL</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY VIEW */}
        {view === 'history' && (
          <div className="animate-fadein">
            <WeeklyChart state={state} />
            <CalendarHeatmap state={state} />
            <HistoryLog state={state} tasks={tasks} />
          </div>
        )}

        {/* SETTINGS VIEW */}
        {view === 'settings' && (
          <div className="animate-fadein" style={{ marginTop: 28 }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 3, marginBottom: 16 }}>NOTIFICATIONS</div>
            <div style={{ border: '1px solid var(--border)', padding: 16, background: 'var(--surface)', marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 12 }}>Daily reminder to open your tracker</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <input type="time" value={notifTime} onChange={e => setNotifTime(e.target.value)}
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontFamily: 'Space Mono', fontSize: 14, outline: 'none' }} />
                <button onClick={saveNotifTime} style={{ background: 'var(--accent)', color: '#000', border: 'none', fontFamily: 'Space Mono', fontSize: 9, padding: '8px 14px', cursor: 'pointer', letterSpacing: 2 }}>SET</button>
              </div>
              {!notifGranted ? (
                <button onClick={requestNotif} style={{ width: '100%', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: 'Space Mono', fontSize: 9, padding: 10, cursor: 'pointer', letterSpacing: 2 }}>
                  ENABLE NOTIFICATIONS
                </button>
              ) : (
                <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--accent)', letterSpacing: 2 }}>✓ NOTIFICATIONS ACTIVE</div>
              )}
            </div>

            <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 3, marginBottom: 16, marginTop: 28 }}>DANGER ZONE</div>
            <button onClick={() => {
              if (confirm('Reset TODAY only? History stays.')) {
                if (!state || !todayLog) return
                const newLog = { ...todayLog, done: {}, notes: {} }
                persist(state, newLog)
              }
            }} style={{ width: '100%', background: 'transparent', border: '1px solid #ff3b3b33', color: 'var(--red)', fontFamily: 'Space Mono', fontSize: 9, padding: 10, cursor: 'pointer', letterSpacing: 2, marginBottom: 8 }}>
              RESET TODAY
            </button>
            <button onClick={() => {
              if (confirm('Nuke ALL data? Cannot undo.')) {
                localStorage.clear(); window.location.reload()
              }
            }} style={{ width: '100%', background: '#ff3b3b11', border: '1px solid var(--red)', color: 'var(--red)', fontFamily: 'Space Mono', fontSize: 9, padding: 10, cursor: 'pointer', letterSpacing: 2 }}>
              RESET ALL DATA
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SUBCOMPONENTS ───────────────────────────────────────────────

function TaskRow({ task, done, hasNote, onToggle, onNote, onEdit, onDelete }: {
  task: Task; done: boolean; hasNote: boolean;
  onToggle: () => void; onNote: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div style={{ marginBottom: 6, position: 'relative' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 14px',
          border: '1px solid ' + (done ? 'var(--border)' : 'var(--border)'),
          background: done ? '#111' : 'var(--surface)',
          borderLeft: done ? '2px solid var(--accent)' : '2px solid transparent',
          opacity: done ? 0.65 : 1, transition: 'all 0.2s', cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        {/* Checkbox */}
        <div onClick={onToggle} style={{
          width: 20, height: 20, border: '1.5px solid ' + (done ? 'var(--accent)' : 'var(--border-bright)'),
          background: done ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.2s', cursor: 'pointer'
        }}>
          {done && <span style={{ color: '#000', fontSize: 11, fontWeight: 700 }}>✓</span>}
        </div>

        {/* Text */}
        <div style={{ flex: 1 }} onClick={onToggle}>
          <div style={{ fontSize: 14, fontWeight: 500, color: done ? 'var(--text-dim)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none', textDecorationColor: 'var(--text-dim)' }}>
            {task.label}
          </div>
          <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: done ? '#333' : 'var(--text-dim)', marginTop: 2 }}>
            {task.sub}
          </div>
        </div>

        {/* Note indicator */}
        {hasNote && (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
        )}

        {/* Actions toggle */}
        <button onClick={() => setShowActions(!showActions)} style={{
          background: 'transparent', border: 'none', color: 'var(--text-dim)',
          cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1, flexShrink: 0
        }}>⋯</button>
      </div>

      {/* Action row */}
      {showActions && (
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderTop: 'none', background: '#0d0d0d' }}>
          {[
            { label: hasNote ? '📝 Edit Note' : '📝 Add Note', action: () => { onNote(); setShowActions(false) } },
            { label: '✏️ Edit Task', action: () => { onEdit(); setShowActions(false) } },
            { label: '🗑 Delete', action: () => { onDelete(); setShowActions(false) } },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} style={{
              flex: 1, background: 'transparent', border: 'none',
              borderRight: '1px solid var(--border)', color: 'var(--text-dim)',
              fontFamily: 'Space Mono', fontSize: 8, letterSpacing: 1,
              padding: '8px 4px', cursor: 'pointer', transition: 'color 0.2s'
            }}>{btn.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function YesterdayFailures({ state }: { state: AppState }) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yKey = yesterday.toISOString().split('T')[0]
  const yLog = state.logs[yKey]
  if (!yLog) return null

  const failed = state.tasks.filter(t => !yLog.done[t.id])
  if (!failed.length) return (
    <div style={{ marginTop: 20, padding: '10px 14px', border: '1px solid #1a2a00', background: '#0d1500' }}>
      <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--accent)', letterSpacing: 2 }}>✓ YESTERDAY — PERFECT DAY</div>
    </div>
  )

  return (
    <div style={{ marginTop: 20, padding: '12px 14px', border: '1px solid #2a0000', background: '#120000' }}>
      <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--red)', letterSpacing: 2, marginBottom: 8 }}>
        YESTERDAY — MISSED {failed.length}/{state.tasks.length}
      </div>
      {failed.map(t => (
        <div key={t.id} style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#ff3b3b88', marginBottom: 3, paddingLeft: 8, borderLeft: '2px solid #ff3b3b33' }}>
          {t.icon} {t.label}
        </div>
      ))}
    </div>
  )
}

function WeeklyChart({ state }: { state: AppState }) {
  const days = getLast7Days()
  const data = days.map(d => ({
    name: new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }),
    score: state.logs[d]?.score || 0,
    total: state.tasks.length,
    pct: state.logs[d] ? Math.round((state.logs[d].score / state.tasks.length) * 100) : 0,
    isToday: d === getToday()
  }))

  return (
    <div style={{ marginTop: 24, border: '1px solid var(--border)', padding: 16, background: 'var(--surface)' }}>
      <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 3, marginBottom: 16 }}>WEEKLY SCORE</div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barSize={24}>
          <XAxis dataKey="name" tick={{ fontFamily: 'Space Mono', fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, state.tasks.length]} />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'Space Mono', fontSize: 10 }}
            formatter={(v: any) => [`${v}/${state.tasks.length}`, 'Done']}
            labelStyle={{ color: 'var(--text-dim)' }}
          />
          <Bar dataKey="score" radius={[2, 2, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isToday ? 'var(--accent)' : entry.pct >= 80 ? '#4a7a00' : entry.pct >= 50 ? '#2a4a00' : '#1a1a1a'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CalendarHeatmap({ state }: { state: AppState }) {
  const days = getLast30Days()
  const total = state.tasks.length

  return (
    <div style={{ marginTop: 16, border: '1px solid var(--border)', padding: 16, background: 'var(--surface)' }}>
      <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 3, marginBottom: 14 }}>30-DAY HEATMAP</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {days.map(d => {
          const log = state.logs[d]
          const pct = log ? log.score / total : -1
          const isToday = d === getToday()
          let bg = '#1a1a1a'
          if (pct >= 0.8) bg = 'var(--accent)'
          else if (pct >= 0.5) bg = '#4a7a00'
          else if (pct >= 0.2) bg = '#2a4a00'
          else if (pct >= 0) bg = '#1a2a00'

          return (
            <div key={d} title={`${formatDate(d)}: ${log?.score || 0}/${total}`} style={{
              width: 20, height: 20,
              background: bg,
              border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
              transition: 'all 0.2s'
            }} />
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        {[['#1a1a1a','0%'], ['#1a2a00','<20%'], ['#2a4a00','50%'], ['#4a7a00','80%'], ['var(--accent)','100%']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, background: c }} />
            <span style={{ fontFamily: 'Space Mono', fontSize: 8, color: 'var(--text-dim)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HistoryLog({ state, tasks }: { state: AppState, tasks: Task[] }) {
  const days = getLast7Days().reverse()

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 3, marginBottom: 14 }}>HISTORY LOG</div>
      {days.map(d => {
        const log = state.logs[d]
        if (!log) return null
        const failed = tasks.filter(t => !log.done[t.id])
        const notes = Object.entries(log.notes || {}).filter(([, v]) => v)
        return (
          <div key={d} style={{ border: '1px solid var(--border)', padding: 14, background: 'var(--surface)', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 2 }}>{formatDate(d).toUpperCase()}</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 20, color: log.score === tasks.length ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>
                {log.score}/{tasks.length}
              </div>
            </div>
            {failed.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {failed.map(t => (
                  <div key={t.id} style={{ fontSize: 11, color: '#ff3b3b66', fontFamily: 'Space Mono', marginBottom: 2 }}>✗ {t.label}</div>
                ))}
              </div>
            )}
            {notes.map(([id, note]) => {
              const task = tasks.find(t => t.id === id)
              return (
                <div key={id} style={{ fontSize: 12, color: 'var(--text-mid)', borderLeft: '2px solid var(--border)', paddingLeft: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--text-dim)' }}>{task?.label}: </span>{note}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
