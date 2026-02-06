'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'

// ============================================
// TYPES & INTERFACES
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
  updatedAt: string
  completedAt: string | null
  projectId: string | null
}

interface Project {
  id: string
  name: string
  color: string
  description: string
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  backlog: { label: 'Backlog', color: 'text-gray-400', bgColor: 'bg-gray-500/20', borderColor: 'border-gray-500/30' },
  todo: { label: 'To Do', color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/30' },
  in_progress: { label: 'In Progress', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/30' },
  review: { label: 'Review', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
  done: { label: 'Done', color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/30' }
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bgColor: string; icon: string }> = {
  low: { label: 'Low', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: '○' },
  medium: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: '◐' },
  high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/20', icon: '●' },
  urgent: { label: 'Urgent', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: '◉' }
}

const AGENT_COLORS: Record<Agent, string> = {
  Jarvis: '#54B4D3',
  Bob: '#F59E0B',
  Justin: '#10B981',
  Kyle: '#8B5CF6',
  Ethan: '#EF4444',
  Shen: '#EC4899'
}

const DEFAULT_PROJECTS: Project[] = [
  { id: 'proj-1', name: 'Gem Dashboard', color: '#54B4D3', description: 'Main dashboard project' },
  { id: 'proj-2', name: 'Agent System', color: '#10B981', description: 'AI agents and automation' },
  { id: 'proj-3', name: 'Marketing', color: '#F59E0B', description: 'Marketing and content' },
  { id: 'proj-4', name: 'Infrastructure', color: '#8B5CF6', description: 'DevOps and infrastructure' }
]

const DEFAULT_TAGS = ['bug', 'feature', 'improvement', 'docs', 'design', 'urgent', 'research']

// ============================================
// UTILITY FUNCTIONS
// ============================================

const generateId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const formatDate = (date: string | null) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const isOverdue = (dueDate: string | null) => {
  if (!dueDate) return false
  return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
}

const isDueToday = (dueDate: string | null) => {
  if (!dueDate) return false
  return new Date(dueDate).toDateString() === new Date().toDateString()
}

const isDueSoon = (dueDate: string | null) => {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const today = new Date()
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays > 0 && diffDays <= 3
}

// ============================================
// COMPONENTS
// ============================================

// Glass Card Component
const GlassCard = ({ children, className = '', ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
  <motion.div
    className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    {...props}
  >
    {children}
  </motion.div>
)

// Task Card Component
const TaskCard = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  projects,
  isDragging = false
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  projects: Project[]
  isDragging?: boolean
}) => {
  const project = projects.find(p => p.id === task.projectId)
  const priorityConfig = PRIORITY_CONFIG[task.priority]
  const overdue = isOverdue(task.dueDate)
  const dueToday = isDueToday(task.dueDate)
  const dueSoon = isDueSoon(task.dueDate)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer transition-all group ${
        isDragging ? 'shadow-2xl shadow-cyan-500/20 ring-2 ring-cyan-500/50' : ''
      } ${task.status === 'done' ? 'opacity-70' : ''}`}
      onClick={() => onEdit(task)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <span className={`${priorityConfig.color} text-lg`}>{priorityConfig.icon}</span>
          {project && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: project.color }}
            />
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
            className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-white mb-2 line-clamp-2 ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
        {task.title}
      </h3>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-white/5 rounded-full text-xs text-gray-400">
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-white/5 rounded-full text-xs text-gray-400">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        {/* Assignee */}
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
              style={{ backgroundColor: AGENT_COLORS[task.assignee] }}
            >
              {task.assignee[0]}
            </div>
            <span className="text-xs text-gray-400">{task.assignee}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-500">Unassigned</span>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            overdue ? 'bg-red-500/20 text-red-400' :
            dueToday ? 'bg-yellow-500/20 text-yellow-400' :
            dueSoon ? 'bg-orange-500/20 text-orange-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {overdue ? 'Overdue' : dueToday ? 'Today' : formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// Task Modal Component
const TaskModal = ({
  isOpen,
  onClose,
  onSave,
  task,
  projects
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (task: Task) => void
  task: Task | null
  projects: Project[]
}) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: null,
    dueDate: null,
    tags: [],
    projectId: null
  })
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (task) {
      setFormData(task)
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee: null,
        dueDate: null,
        tags: [],
        projectId: null
      })
    }
  }, [task, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title?.trim()) return

    const now = new Date().toISOString()
    const savedTask: Task = {
      id: task?.id || generateId(),
      title: formData.title!,
      description: formData.description || '',
      status: formData.status as TaskStatus,
      priority: formData.priority as Priority,
      assignee: formData.assignee as Agent | null,
      dueDate: formData.dueDate || null,
      tags: formData.tags || [],
      projectId: formData.projectId || null,
      createdAt: task?.createdAt || now,
      updatedAt: now,
      completedAt: formData.status === 'done' && !task?.completedAt ? now : task?.completedAt || null
    }

    onSave(savedTask)
    onClose()
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), newTag.trim()] }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) || [] }))
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="backdrop-blur-2xl bg-[#0a1525]/95 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">
                {task ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                  placeholder="Task title..."
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all resize-none"
                  placeholder="Task description..."
                />
              </div>

              {/* Status & Priority Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key} className="bg-[#0a1525]">{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key} className="bg-[#0a1525]">{config.icon} {config.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignee & Due Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Assignee</label>
                  <select
                    value={formData.assignee || ''}
                    onChange={e => setFormData(prev => ({ ...prev, assignee: (e.target.value || null) as Agent | null }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                  >
                    <option value="" className="bg-[#0a1525]">Unassigned</option>
                    {AGENTS.map(agent => (
                      <option key={agent} value={agent} className="bg-[#0a1525]">{agent}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
                    onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Project</label>
                <select
                  value={formData.projectId || ''}
                  onChange={e => setFormData(prev => ({ ...prev, projectId: e.target.value || null }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                >
                  <option value="" className="bg-[#0a1525]">No Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id} className="bg-[#0a1525]">{project.name}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags?.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-400"
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none transition-all"
                    placeholder="Add a tag..."
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {DEFAULT_TAGS.filter(t => !formData.tags?.includes(t)).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }))}
                      className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full text-xs transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl text-white font-medium transition-all shadow-lg shadow-cyan-500/25"
              >
                {task ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Dashboard View Component
const DashboardView = ({
  tasks,
  projects
}: {
  tasks: Task[]
  projects: Project[]
}) => {
  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const completedToday = tasks.filter(t =>
      t.completedAt && new Date(t.completedAt).toDateString() === today.toDateString()
    ).length

    const completedThisWeek = tasks.filter(t =>
      t.completedAt && new Date(t.completedAt) >= weekAgo
    ).length

    const overdueTasks = tasks.filter(t =>
      t.status !== 'done' && t.dueDate && isOverdue(t.dueDate)
    ).length

    const dueTodayTasks = tasks.filter(t =>
      t.status !== 'done' && t.dueDate && isDueToday(t.dueDate)
    ).length

    const byStatus = Object.keys(STATUS_CONFIG).reduce((acc, status) => {
      acc[status as TaskStatus] = tasks.filter(t => t.status === status).length
      return acc
    }, {} as Record<TaskStatus, number>)

    const byPriority = Object.keys(PRIORITY_CONFIG).reduce((acc, priority) => {
      acc[priority as Priority] = tasks.filter(t => t.status !== 'done' && t.priority === priority).length
      return acc
    }, {} as Record<Priority, number>)

    const byAssignee = AGENTS.reduce((acc, agent) => {
      acc[agent] = tasks.filter(t => t.status !== 'done' && t.assignee === agent).length
      return acc
    }, {} as Record<Agent, number>)

    const totalProgress = tasks.length > 0
      ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
      : 0

    return { completedToday, completedThisWeek, overdueTasks, dueTodayTasks, byStatus, byPriority, byAssignee, totalProgress }
  }, [tasks])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">📋</span>
            <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full">Total</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{tasks.length}</div>
          <div className="text-sm text-gray-400">Total Tasks</div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">✅</span>
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Today</span>
          </div>
          <div className="text-3xl font-bold text-green-400 mb-1">{stats.completedToday}</div>
          <div className="text-sm text-gray-400">Completed Today</div>
          <div className="text-xs text-gray-500 mt-1">{stats.completedThisWeek} this week</div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">⚠️</span>
            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">Alert</span>
          </div>
          <div className="text-3xl font-bold text-red-400 mb-1">{stats.overdueTasks}</div>
          <div className="text-sm text-gray-400">Overdue Tasks</div>
          <div className="text-xs text-gray-500 mt-1">{stats.dueTodayTasks} due today</div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">📊</span>
            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">Progress</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.totalProgress}%</div>
          <div className="text-sm text-gray-400">Overall Progress</div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.totalProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-cyan-500 to-green-500"
            />
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Breakdown */}
        <GlassCard className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats.byStatus[status as TaskStatus]
              const percent = tasks.length > 0 ? (count / tasks.length) * 100 : 0
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm ${config.color}`}>{config.label}</span>
                    <span className="text-sm text-gray-400">{count}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className={`h-full ${config.bgColor.replace('/20', '')}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Priority Distribution */}
        <GlassCard className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Priority Distribution</h3>
          <div className="space-y-3">
            {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => {
              const count = stats.byPriority[priority as Priority]
              const activeTasks = tasks.filter(t => t.status !== 'done').length
              const percent = activeTasks > 0 ? (count / activeTasks) * 100 : 0
              return (
                <div key={priority} className="flex items-center gap-3">
                  <span className={`text-lg ${config.color}`}>{config.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm ${config.color}`}>{config.label}</span>
                      <span className="text-sm text-gray-400">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className={`h-full ${config.bgColor.replace('/20', '')}`}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Team Workload */}
        <GlassCard className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Team Workload</h3>
          <div className="space-y-3">
            {AGENTS.map(agent => {
              const count = stats.byAssignee[agent]
              const maxTasks = Math.max(...Object.values(stats.byAssignee), 1)
              const percent = (count / maxTasks) * 100
              return (
                <div key={agent} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-black shrink-0"
                    style={{ backgroundColor: AGENT_COLORS[agent] }}
                  >
                    {agent[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">{agent}</span>
                      <span className="text-sm text-gray-400">{count} tasks</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full"
                        style={{ backgroundColor: AGENT_COLORS[agent] }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>

      {/* Recent Activity */}
      <GlassCard className="p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Tasks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 6)
            .map(task => (
              <div
                key={task.id}
                className="p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${PRIORITY_CONFIG[task.priority].color}`}>
                    {PRIORITY_CONFIG[task.priority].icon}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[task.status].bgColor} ${STATUS_CONFIG[task.status].color}`}>
                    {STATUS_CONFIG[task.status].label}
                  </span>
                </div>
                <h4 className={`font-medium text-white text-sm truncate ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                  {task.title}
                </h4>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{task.assignee || 'Unassigned'}</span>
                  <span>{formatDate(task.updatedAt)}</span>
                </div>
              </div>
            ))}
        </div>
      </GlassCard>
    </div>
  )
}

// Kanban View Component
const KanbanView = ({
  tasks,
  projects,
  onEdit,
  onDelete,
  onStatusChange
}: {
  tasks: Task[]
  projects: Project[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}) => {
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    setDragOverColumn(status)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    if (draggedTask) {
      onStatusChange(draggedTask, status)
    }
    setDraggedTask(null)
    setDragOverColumn(null)
  }

  const columns = Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(([status, config]) => {
        const columnTasks = tasks.filter(t => t.status === status)
        return (
          <div
            key={status}
            className={`flex-shrink-0 w-80 backdrop-blur-lg bg-white/5 border rounded-2xl transition-all ${
              dragOverColumn === status
                ? 'border-cyan-500/50 bg-cyan-500/5'
                : 'border-white/10'
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column Header */}
            <div className={`p-4 border-b ${config.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${config.bgColor}`} />
                  <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${config.bgColor} ${config.color}`}>
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Column Content */}
            <div className="p-3 space-y-3 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto">
              <AnimatePresence>
                {columnTasks
                  .sort((a, b) => {
                    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
                    return priorityOrder[a.priority] - priorityOrder[b.priority]
                  })
                  .map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={draggedTask === task.id ? 'opacity-50' : ''}
                    >
                      <TaskCard
                        task={task}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onStatusChange={onStatusChange}
                        projects={projects}
                        isDragging={draggedTask === task.id}
                      />
                    </div>
                  ))}
              </AnimatePresence>
              {columnTasks.length === 0 && (
                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  No tasks
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Calendar View Component
const CalendarView = ({
  tasks,
  projects,
  onEdit,
  onDelete,
  onStatusChange
}: {
  tasks: Task[]
  projects: Project[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  const calendarStart = new Date(monthStart)
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay())

  const calendarEnd = new Date(monthEnd)
  calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()))

  const weeks: Date[][] = []
  let currentWeek: Date[] = []
  const current = new Date(calendarStart)

  while (current <= calendarEnd) {
    currentWeek.push(new Date(current))
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
    current.setDate(current.getDate() + 1)
  }

  const getTasksForDate = (date: Date) => {
    return tasks.filter(t => {
      if (!t.dueDate) return false
      const taskDate = new Date(t.dueDate)
      return taskDate.toDateString() === date.toDateString()
    })
  }

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              viewMode === 'week' ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              viewMode === 'month' ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <GlassCard className="overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-white/10">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-400 border-r border-white/5 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Weeks */}
        <div className="divide-y divide-white/5">
          {(viewMode === 'week'
            ? weeks.filter(week => week.some(d => d.toDateString() === today.toDateString()))
            : weeks
          ).map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 divide-x divide-white/5">
              {week.map((date, dayIndex) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                const isToday = date.toDateString() === today.toDateString()
                const dayTasks = getTasksForDate(date)

                return (
                  <div
                    key={dayIndex}
                    className={`min-h-[120px] p-2 transition-colors ${
                      isCurrentMonth ? 'bg-transparent' : 'bg-white/2'
                    } ${isToday ? 'bg-cyan-500/10' : ''} hover:bg-white/5`}
                  >
                    {/* Date Number */}
                    <div className={`text-sm font-medium mb-2 ${
                      isToday
                        ? 'w-7 h-7 rounded-full bg-cyan-500 text-black flex items-center justify-center'
                        : isCurrentMonth ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {date.getDate()}
                    </div>

                    {/* Tasks */}
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map(task => (
                        <motion.div
                          key={task.id}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => onEdit(task)}
                          className={`px-2 py-1 rounded text-xs cursor-pointer truncate ${
                            task.status === 'done'
                              ? 'bg-green-500/20 text-green-400 line-through'
                              : `${PRIORITY_CONFIG[task.priority].bgColor} ${PRIORITY_CONFIG[task.priority].color}`
                          }`}
                        >
                          {task.title}
                        </motion.div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500 pl-2">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}

// List View Component
const ListView = ({
  tasks,
  projects,
  onEdit,
  onDelete,
  onStatusChange
}: {
  tasks: Task[]
  projects: Project[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}) => {
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'status' | 'assignee'>('priority')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterAssignee, setFilterAssignee] = useState<Agent | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        if (filterStatus !== 'all' && task.status !== filterStatus) return false
        if (filterAssignee !== 'all' && task.assignee !== filterAssignee) return false
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'priority':
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
            return priorityOrder[a.priority] - priorityOrder[b.priority]
          case 'dueDate':
            if (!a.dueDate && !b.dueDate) return 0
            if (!a.dueDate) return 1
            if (!b.dueDate) return -1
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          case 'status':
            const statusOrder = { backlog: 0, todo: 1, in_progress: 2, review: 3, done: 4 }
            return statusOrder[a.status] - statusOrder[b.status]
          case 'assignee':
            return (a.assignee || 'zzz').localeCompare(b.assignee || 'zzz')
          default:
            return 0
        }
      })
  }, [tasks, filterStatus, filterAssignee, searchQuery, sortBy])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as TaskStatus | 'all')}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="all" className="bg-[#0a1525]">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key} className="bg-[#0a1525]">{config.label}</option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value as Agent | 'all')}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="all" className="bg-[#0a1525]">All Assignees</option>
            {AGENTS.map(agent => (
              <option key={agent} value={agent} className="bg-[#0a1525]">{agent}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="priority" className="bg-[#0a1525]">Sort by Priority</option>
            <option value="dueDate" className="bg-[#0a1525]">Sort by Due Date</option>
            <option value="status" className="bg-[#0a1525]">Sort by Status</option>
            <option value="assignee" className="bg-[#0a1525]">Sort by Assignee</option>
          </select>
        </div>
      </GlassCard>

      {/* Task List */}
      <GlassCard className="overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-white/5 border-b border-white/10 text-sm font-medium text-gray-400">
          <div className="col-span-1">Priority</div>
          <div className="col-span-4">Task</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Assignee</div>
          <div className="col-span-2">Due Date</div>
          <div className="col-span-1">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/5">
          <AnimatePresence>
            {filteredTasks.map(task => {
              const project = projects.find(p => p.id === task.projectId)
              const overdue = isOverdue(task.dueDate)
              const dueToday = isDueToday(task.dueDate)

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => onEdit(task)}
                >
                  {/* Priority */}
                  <div className="col-span-1">
                    <span className={`text-xl ${PRIORITY_CONFIG[task.priority].color}`}>
                      {PRIORITY_CONFIG[task.priority].icon}
                    </span>
                  </div>

                  {/* Task */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      {project && (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                      )}
                      <span className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-white'}`}>
                        {task.title}
                      </span>
                    </div>
                    {task.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {task.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-white/5 rounded text-xs text-gray-500">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <select
                      value={task.status}
                      onChange={e => {
                        e.stopPropagation()
                        onStatusChange(task.id, e.target.value as TaskStatus)
                      }}
                      onClick={e => e.stopPropagation()}
                      className={`px-3 py-1 rounded-lg text-sm ${STATUS_CONFIG[task.status].bgColor} ${STATUS_CONFIG[task.status].color} border-0 focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <option key={key} value={key} className="bg-[#0a1525]">{config.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assignee */}
                  <div className="col-span-2">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
                          style={{ backgroundColor: AGENT_COLORS[task.assignee] }}
                        >
                          {task.assignee[0]}
                        </div>
                        <span className="text-sm text-gray-300">{task.assignee}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="col-span-2">
                    {task.dueDate ? (
                      <span className={`text-sm ${
                        overdue ? 'text-red-400' :
                        dueToday ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {formatDate(task.dueDate)}
                        {overdue && ' (Overdue)'}
                        {dueToday && ' (Today)'}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">No due date</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onDelete(task.id)
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {filteredTasks.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <div className="text-4xl mb-3">📭</div>
              <div>No tasks found</div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProjectManagementPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const isInitialLoad = useRef(true)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Save to API with debouncing
  const saveToApi = useCallback(async (tasksData: Task[], projectsData: Project[]) => {
    try {
      setSyncStatus('syncing')
      const response = await fetch('/api/sort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasksData,
          projects: projectsData,
          version: 2 // New data format
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLastUpdated(data.lastUpdated)
        setSyncStatus('idle')
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('API save error:', error)
      setSyncStatus('error')
    }
  }, [])

  // Debounced save
  const debouncedSave = useCallback((tasksData: Task[], projectsData: Project[]) => {
    localStorage.setItem('pm-tasks', JSON.stringify(tasksData))
    localStorage.setItem('pm-projects', JSON.stringify(projectsData))
    const now = new Date().toISOString()
    localStorage.setItem('pm-last-updated', now)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToApi(tasksData, projectsData)
    }, 1000)
  }, [saveToApi])

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      // Load from localStorage first
      const savedTasks = localStorage.getItem('pm-tasks')
      const savedProjects = localStorage.getItem('pm-projects')
      const savedLastUpdated = localStorage.getItem('pm-last-updated')

      let localTasks: Task[] = []
      let localProjects: Project[] = DEFAULT_PROJECTS

      if (savedTasks) {
        localTasks = JSON.parse(savedTasks)
      }
      if (savedProjects) {
        localProjects = JSON.parse(savedProjects)
      }

      setTasks(localTasks)
      setProjects(localProjects)
      if (savedLastUpdated) setLastUpdated(savedLastUpdated)

      // Try to fetch from API
      try {
        setSyncStatus('syncing')
        const response = await fetch('/api/sort')
        if (response.ok) {
          const data = await response.json()

          if (data.tasks && data.version === 2) {
            // New format
            setTasks(data.tasks)
            if (data.projects) setProjects(data.projects)
            setLastUpdated(data.lastUpdated)

            localStorage.setItem('pm-tasks', JSON.stringify(data.tasks))
            if (data.projects) localStorage.setItem('pm-projects', JSON.stringify(data.projects))
            if (data.lastUpdated) localStorage.setItem('pm-last-updated', data.lastUpdated)
          } else if (localTasks.length > 0) {
            // Sync local to API
            await saveToApi(localTasks, localProjects)
          }

          setSyncStatus('idle')
        }
      } catch (error) {
        console.error('API load error:', error)
        setSyncStatus('error')
      }

      isInitialLoad.current = false
    }

    loadData()
  }, [saveToApi])

  // Save on data changes
  useEffect(() => {
    if (isInitialLoad.current) return
    debouncedSave(tasks, projects)
  }, [tasks, projects, debouncedSave])

  // Task handlers
  const handleSaveTask = (task: Task) => {
    setTasks(prev => {
      const existing = prev.find(t => t.id === task.id)
      if (existing) {
        return prev.map(t => t.id === task.id ? task : t)
      }
      return [task, ...prev]
    })
    setEditingTask(null)
  }

  const handleDeleteTask = (id: string) => {
    if (!confirm('Delete this task?')) return
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const handleStatusChange = (id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      return {
        ...t,
        status,
        updatedAt: new Date().toISOString(),
        completedAt: status === 'done' && !t.completedAt ? new Date().toISOString() :
                     status !== 'done' ? null : t.completedAt
      }
    }))
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  const handleNewTask = () => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  const viewModes: { key: ViewMode; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'kanban', label: 'Kanban', icon: '📋' },
    { key: 'calendar', label: 'Calendar', icon: '📅' },
    { key: 'list', label: 'List', icon: '📝' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050810] via-[#0a1525] to-[#0d1a2d] p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                Project Management
              </h1>
              <p className="text-gray-400 mt-1">
                Manage tasks, track progress, and collaborate with your team
              </p>
              {lastUpdated && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>
                  {syncStatus === 'syncing' && (
                    <span className="flex items-center gap-1 text-cyan-400">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                      Syncing...
                    </span>
                  )}
                  {syncStatus === 'error' && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <span className="w-2 h-2 bg-orange-400 rounded-full" />
                      Offline mode
                    </span>
                  )}
                  {syncStatus === 'idle' && (
                    <span className="flex items-center gap-1 text-green-400">
                      <span className="w-2 h-2 bg-green-400 rounded-full" />
                      Synced
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Switcher */}
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                {viewModes.map(mode => (
                  <button
                    key={mode.key}
                    onClick={() => setViewMode(mode.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === mode.key
                        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{mode.icon}</span>
                    <span className="hidden sm:inline">{mode.label}</span>
                  </button>
                ))}
              </div>

              {/* New Task Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNewTask}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl text-white font-semibold transition-all shadow-lg shadow-cyan-500/25"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">New Task</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'dashboard' && (
              <DashboardView tasks={tasks} projects={projects} />
            )}
            {viewMode === 'kanban' && (
              <KanbanView
                tasks={tasks}
                projects={projects}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            )}
            {viewMode === 'calendar' && (
              <CalendarView
                tasks={tasks}
                projects={projects}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            )}
            {viewMode === 'list' && (
              <ListView
                tasks={tasks}
                projects={projects}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Task Modal */}
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingTask(null) }}
          onSave={handleSaveTask}
          task={editingTask}
          projects={projects}
        />
      </div>
    </div>
  )
}
