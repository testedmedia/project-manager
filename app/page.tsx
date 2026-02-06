'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================
// TYPES
// ============================================
type Priority = 'low' | 'medium' | 'high' | 'urgent'
type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
type ViewMode = 'dashboard' | 'kanban' | 'calendar' | 'list'

const AGENTS = ['Jarvis', 'Bob', 'Justin', 'Kyle', 'Ethan', 'Shen'] as const
type Agent = typeof AGENTS[number]

interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  assignee: Agent | null
  dueDate: string | null
  tags: string[]
  createdAt: string
}

// ============================================
// CONFIG
// ============================================
const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  backlog: { label: 'Backlog', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.2)' },
  todo: { label: 'To Do', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.2)' },
  in_progress: { label: 'In Progress', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.2)' },
  review: { label: 'Review', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.2)' },
  done: { label: 'Done', color: '#10B981', bg: 'rgba(16, 185, 129, 0.2)' }
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: string }> = {
  low: { label: 'Low', color: '#3B82F6', icon: '○' },
  medium: { label: 'Medium', color: '#F59E0B', icon: '◐' },
  high: { label: 'High', color: '#F97316', icon: '●' },
  urgent: { label: 'Urgent', color: '#EF4444', icon: '◉' }
}

const AGENT_COLORS: Record<Agent, string> = {
  Jarvis: '#00D4FF', Bob: '#F59E0B', Justin: '#10B981',
  Kyle: '#8B5CF6', Ethan: '#EF4444', Shen: '#EC4899'
}

const SAMPLE_TASKS: Task[] = [
  { id: '1', title: 'Fix Telegram API costs', description: 'Reduce token usage by switching to Kimi K2.5', status: 'in_progress', priority: 'urgent', assignee: 'Jarvis', dueDate: '2026-02-06', tags: ['bug', 'urgent'], createdAt: '2026-02-05' },
  { id: '2', title: 'Glass UI Dashboard upgrade', description: 'Apply glassmorphism to all dashboards with animations', status: 'todo', priority: 'high', assignee: 'Bob', dueDate: '2026-02-07', tags: ['design', 'feature'], createdAt: '2026-02-05' },
  { id: '3', title: 'Deploy monitoring agent', description: 'Watch Vercel deployments and alert on failures', status: 'done', priority: 'medium', assignee: 'Justin', dueDate: '2026-02-05', tags: ['devops'], createdAt: '2026-02-04' },
  { id: '4', title: 'Lead generation optimization', description: 'Improve Kyle dashboard metrics and conversion tracking', status: 'review', priority: 'medium', assignee: 'Kyle', dueDate: '2026-02-08', tags: ['marketing'], createdAt: '2026-02-03' },
  { id: '5', title: 'Security audit completion', description: 'Full system security review and API key cleanup', status: 'backlog', priority: 'high', assignee: 'Ethan', dueDate: '2026-02-10', tags: ['security'], createdAt: '2026-02-02' },
  { id: '6', title: 'Cost tracking improvements', description: 'Better API cost monitoring with Shen dashboard', status: 'todo', priority: 'low', assignee: 'Shen', dueDate: '2026-02-09', tags: ['finance'], createdAt: '2026-02-01' },
]

// ============================================
// COMPONENTS
// ============================================

const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`glass-card relative overflow-hidden rounded-2xl ${className}`}>
    <div className="relative z-10">{children}</div>
  </div>
)

const StatCard = ({ icon, label, value, subtitle, color }: { icon: string; label: string; value: string | number; subtitle?: string; color: string }) => (
  <GlassCard className="p-6">
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{icon}</span>
          <span className="text-sm text-gray-400 uppercase tracking-wider font-medium">{label}</span>
        </div>
        <div className="text-4xl font-bold" style={{ color }}>{value}</div>
        {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
      </div>
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${color}20` }}>
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: color }} />
      </div>
    </div>
  </GlassCard>
)

const TaskCard = ({ task, onClick, onDragStart }: { task: Task; onClick: () => void; onDragStart?: (e: React.DragEvent) => void }) => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onClick={onClick}
      className="glass-task cursor-pointer rounded-xl p-4 mb-3 hover:bg-white/10 transition-colors duration-75"
      style={{ border: `1px solid ${PRIORITY_CONFIG[task.priority].color}30` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ color: PRIORITY_CONFIG[task.priority].color }} className="text-lg">{PRIORITY_CONFIG[task.priority].icon}</span>
          <span className="font-semibold text-white">{task.title}</span>
        </div>
        {task.assignee && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black shadow-lg"
            style={{ background: AGENT_COLORS[task.assignee], boxShadow: `0 0 20px ${AGENT_COLORS[task.assignee]}50` }}
          >
            {task.assignee[0]}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{task.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {task.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">{tag}</span>
          ))}
        </div>
        {task.dueDate && (
          <span className={`text-xs px-2 py-1 rounded-full ${isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400'}`}>
            {isOverdue ? '⚠️ Overdue' : task.dueDate}
          </span>
        )}
      </div>
    </div>
  )
}

const KanbanColumn = ({ status, tasks, onTaskClick, onDrop, onDragOver, onDragStart }: {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}) => (
  <div className="flex-1 min-w-[280px] max-w-[320px]">
    <div className="flex items-center gap-3 mb-4 px-2">
      <div className="w-3 h-3 rounded-full" style={{ background: STATUS_CONFIG[status].color, boxShadow: `0 0 10px ${STATUS_CONFIG[status].color}` }} />
      <h3 className="font-semibold text-white">{STATUS_CONFIG[status].label}</h3>
      <span className="text-sm px-2 py-0.5 rounded-full bg-white/10 text-gray-400 ml-auto">{tasks.length}</span>
    </div>
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="rounded-2xl p-3 min-h-[500px] transition-colors duration-75"
      style={{ background: STATUS_CONFIG[status].bg, border: `1px solid ${STATUS_CONFIG[status].color}20` }}
    >
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={() => onTaskClick(task)}
          onDragStart={onDragStart ? (e) => onDragStart(e, task.id) : undefined}
        />
      ))}
      {tasks.length === 0 && (
        <div className="text-center text-gray-500 py-12 border-2 border-dashed border-white/10 rounded-xl">
          Drop tasks here
        </div>
      )}
    </div>
  </div>
)

const CalendarView = ({ tasks }: { tasks: Task[] }) => {
  const [currentDate, setCurrentDate] = useState(new Date())

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDayOfMonth + 1
    if (day < 1 || day > daysInMonth) return null
    return day
  })

  const getTasksForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return tasks.filter(t => t.dueDate === dateStr)
  }

  return (
    <GlassCard className="p-6" >
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
          className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors duration-75 text-white"
        >
          ← Prev
        </button>
        <h3 className="text-2xl font-bold text-white">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
          className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors duration-75 text-white"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm text-gray-400 py-3 font-medium">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />
          const dayTasks = getTasksForDay(day)
          const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth()

          return (
            <div
              key={i}
              className={`aspect-square rounded-xl p-2 cursor-pointer transition-colors duration-75 border hover:bg-white/5 ${
                isToday
                  ? 'bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'border-transparent hover:border-white/20'
              }`}
            >
              <div className={`text-sm mb-1 font-medium ${isToday ? 'text-cyan-400' : 'text-gray-300'}`}>{day}</div>
              <div className="space-y-1">
                {dayTasks.slice(0, 2).map(task => (
                  <div
                    key={task.id}
                    className="text-xs truncate rounded px-1 py-0.5"
                    style={{ background: PRIORITY_CONFIG[task.priority].color + '40', color: PRIORITY_CONFIG[task.priority].color }}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <div className="text-xs text-gray-500">+{dayTasks.length - 2}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

const ListView = ({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (task: Task) => void }) => (
  <GlassCard className="overflow-hidden" >
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left p-4 text-sm text-gray-400 font-medium">Task</th>
            <th className="text-left p-4 text-sm text-gray-400 font-medium">Status</th>
            <th className="text-left p-4 text-sm text-gray-400 font-medium">Priority</th>
            <th className="text-left p-4 text-sm text-gray-400 font-medium">Assignee</th>
            <th className="text-left p-4 text-sm text-gray-400 font-medium">Due Date</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors duration-75"
            >
              <td className="p-4">
                <div className="font-medium text-white">{task.title}</div>
                <div className="text-sm text-gray-500 line-clamp-1">{task.description}</div>
              </td>
              <td className="p-4">
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: STATUS_CONFIG[task.status].bg, color: STATUS_CONFIG[task.status].color }}
                >
                  {STATUS_CONFIG[task.status].label}
                </span>
              </td>
              <td className="p-4">
                <span className="flex items-center gap-2" style={{ color: PRIORITY_CONFIG[task.priority].color }}>
                  <span className="text-lg">{PRIORITY_CONFIG[task.priority].icon}</span>
                  {PRIORITY_CONFIG[task.priority].label}
                </span>
              </td>
              <td className="p-4">
                {task.assignee && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black"
                      style={{ background: AGENT_COLORS[task.assignee] }}
                    >
                      {task.assignee[0]}
                    </div>
                    <span className="text-gray-300">{task.assignee}</span>
                  </div>
                )}
              </td>
              <td className="p-4 text-gray-400">{task.dueDate || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </GlassCard>
)

// ============================================
// MAIN APP
// ============================================
export default function ProjectManager() {
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as Priority, assignee: '' as Agent | '', status: 'todo' as TaskStatus })

  const addTask = () => {
    if (!newTask.title.trim()) return
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      status: newTask.status,
      priority: newTask.priority,
      assignee: newTask.assignee || null,
      dueDate: null,
      tags: [],
      createdAt: new Date().toISOString().split('T')[0]
    }
    setTasks([task, ...tasks])
    setNewTask({ title: '', description: '', priority: 'medium', assignee: '', status: 'todo' })
    setShowAddModal(false)
  }

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId)
  }

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId) updateTaskStatus(taskId, status)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
  }), [tasks])

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { backlog: [], todo: [], in_progress: [], review: [], done: [] }
    tasks.forEach(t => grouped[t.status].push(t))
    return grouped
  }, [tasks])

  return (
    <div className="min-h-screen p-8" style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)' }}>
      {/* Static background orbs - no animation for performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-blue top-1/4 left-1/4 w-96 h-96" />
        <div className="orb orb-purple bottom-1/4 right-1/4 w-96 h-96" />
        <div className="orb orb-cyan top-1/2 right-1/3 w-64 h-64" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold gradient-title">
              Project Management
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Manage tasks, track progress, collaborate with your AI team</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* View Mode Tabs */}
            <GlassCard className="p-1.5 flex gap-1" >
              {[
                { key: 'dashboard', icon: '📊', label: 'Dashboard' },
                { key: 'kanban', icon: '📋', label: 'Kanban' },
                { key: 'calendar', icon: '📅', label: 'Calendar' },
                { key: 'list', icon: '📝', label: 'List' }
              ].map(({ key, icon, label }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key as ViewMode)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-75 flex items-center gap-2 ${
                    viewMode === key
                      ? 'tab-active text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </GlassCard>

            {/* Add Task Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-gradient px-6 py-3 rounded-xl font-medium text-white hover:opacity-90 transition-opacity duration-75"
            >
              + Add Task
            </button>
          </div>
        </div>

        {/* Dashboard View */}
        {viewMode === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon="📋" label="Total" value={stats.total} subtitle="All tasks" color="#3B82F6" />
              <StatCard icon="⚡" label="In Progress" value={stats.inProgress} subtitle="Being worked on" color="#F59E0B" />
              <StatCard icon="✅" label="Completed" value={stats.completed} subtitle={`${Math.round((stats.completed / stats.total) * 100) || 0}% done`} color="#10B981" />
              <StatCard icon="⚠️" label="Overdue" value={stats.overdue} subtitle="Need attention" color="#EF4444" />
            </div>

            {/* Team & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Status Breakdown */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-5">Status Breakdown</h3>
                <div className="space-y-4">
                  {(Object.entries(tasksByStatus) as [TaskStatus, Task[]][]).map(([status, statusTasks]) => (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: STATUS_CONFIG[status].color }} />
                      <span className="text-gray-300 flex-1">{STATUS_CONFIG[status].label}</span>
                      <span className="text-white font-bold">{statusTasks.length}</span>
                      <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(statusTasks.length / tasks.length) * 100 || 0}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: STATUS_CONFIG[status].color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Priority Distribution */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-5">Priority Distribution</h3>
                <div className="space-y-4">
                  {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(priority => {
                    const count = tasks.filter(t => t.priority === priority).length
                    return (
                      <div key={priority} className="flex items-center gap-3">
                        <span className="text-xl" style={{ color: PRIORITY_CONFIG[priority].color }}>{PRIORITY_CONFIG[priority].icon}</span>
                        <span className="text-gray-300 flex-1">{PRIORITY_CONFIG[priority].label}</span>
                        <span className="text-white font-bold">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>

              {/* Team Workload */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-5">Team Workload</h3>
                <div className="space-y-4">
                  {AGENTS.map(agent => {
                    const count = tasks.filter(t => t.assignee === agent).length
                    return (
                      <div key={agent} className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-black shadow-lg"
                          style={{ background: AGENT_COLORS[agent], boxShadow: `0 0 15px ${AGENT_COLORS[agent]}40` }}
                        >
                          {agent[0]}
                        </div>
                        <span className="text-gray-300 flex-1">{agent}</span>
                        <span className="text-white font-bold">{count} tasks</span>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            </div>

            {/* Recent Tasks */}
            <GlassCard className="p-6" >
              <h3 className="text-lg font-semibold text-white mb-5">Recent Tasks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.slice(0, 6).map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByStatus[status]}
                onTaskClick={setSelectedTask}
                onDrop={(e) => handleDrop(e, status)}
                onDragOver={handleDragOver}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <CalendarView tasks={tasks} />
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <ListView tasks={tasks} onTaskClick={setSelectedTask} />
        )}

        {/* Task Detail Modal */}
        <AnimatePresence>
          {selectedTask && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 lg:p-8"
              onClick={() => setSelectedTask(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-lg"
              >
                <GlassCard className="p-8" >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl" style={{ color: PRIORITY_CONFIG[selectedTask.priority].color }}>
                          {PRIORITY_CONFIG[selectedTask.priority].icon}
                        </span>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{ background: STATUS_CONFIG[selectedTask.status].bg, color: STATUS_CONFIG[selectedTask.status].color }}
                        >
                          {STATUS_CONFIG[selectedTask.status].label}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-white">{selectedTask.title}</h2>
                    </div>
                    <button
                      onClick={() => setSelectedTask(null)}
                      className="text-gray-400 hover:text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-75"
                    >
                      ×
                    </button>
                  </div>

                  <p className="text-gray-300 mb-6 text-lg">{selectedTask.description}</p>

                  <div className="space-y-4 mb-8">
                    {selectedTask.assignee && (
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500 w-24">Assignee</span>
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black shadow-lg"
                          style={{ background: AGENT_COLORS[selectedTask.assignee], boxShadow: `0 0 20px ${AGENT_COLORS[selectedTask.assignee]}50` }}
                        >
                          {selectedTask.assignee[0]}
                        </div>
                        <span className="text-white font-medium">{selectedTask.assignee}</span>
                      </div>
                    )}

                    {selectedTask.dueDate && (
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500 w-24">Due Date</span>
                        <span className="text-white font-medium">{selectedTask.dueDate}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 w-24">Tags</span>
                      <div className="flex gap-2 flex-wrap">
                        {selectedTask.tags.map(tag => (
                          <span key={tag} className="px-3 py-1 rounded-full text-sm bg-white/10 text-gray-300">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="btn-gradient flex-1 py-3.5 rounded-xl font-medium text-white hover:opacity-90 transition-opacity duration-75">
                      Edit Task
                    </button>
                    <button className="px-6 py-3.5 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors duration-75">
                      Delete
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Task Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <GlassCard className="p-8" >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Add New Task</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-75"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Title *</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Enter task title..."
                      className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Description</label>
                    <textarea
                      value={newTask.description}
                      onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Enter description..."
                      rows={3}
                      className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Priority</label>
                      <select
                        value={newTask.priority}
                        onChange={e => setNewTask({ ...newTask, priority: e.target.value as Priority })}
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Assignee</label>
                      <select
                        value={newTask.assignee}
                        onChange={e => setNewTask({ ...newTask, assignee: e.target.value as Agent })}
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">Unassigned</option>
                        {AGENTS.map(agent => (
                          <option key={agent} value={agent}>{agent}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Status</label>
                    <select
                      value={newTask.status}
                      onChange={e => setNewTask({ ...newTask, status: e.target.value as TaskStatus })}
                      className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-500"
                    >
                      {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(status => (
                        <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={addTask}
                    className="btn-gradient flex-1 py-3.5 rounded-xl font-medium text-white hover:opacity-90 transition-opacity duration-75"
                  >
                    Create Task
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3.5 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 transition-colors duration-75"
                  >
                    Cancel
                  </button>
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
