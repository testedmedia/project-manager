'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================
// TYPES
// ============================================
type Priority = 'low' | 'medium' | 'high' | 'urgent'
type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
type ProjectStatus = 'live' | 'building' | 'planned' | 'offline'
type ViewMode = 'projects' | 'dashboard' | 'kanban' | 'list'

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
  projectId?: string
}

interface DeletedTask extends Task {
  deletedAt: string
}

interface Project {
  id: string
  name: string
  description: string
  url: string
  status: ProjectStatus
  category: string
  techStack: string
  owner: Agent
  designScore: number
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

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  live: { label: 'LIVE', color: '#10B981', bg: 'rgba(16, 185, 129, 0.2)' },
  building: { label: 'BUILDING', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.2)' },
  planned: { label: 'PLANNED', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.2)' },
  offline: { label: 'OFFLINE', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.2)' }
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

const CATEGORIES = ['Dashboard', 'Tool', 'Agent', 'Marketing', 'Finance', 'Security', 'DevOps', 'Other']

// ============================================
// DEFAULT DATA
// ============================================
const DEFAULT_PROJECTS: Project[] = [
  { id: '1', name: 'Gem Dashboard Elite', description: 'Main project tracker & crypto signals leaderboard', url: 'https://gem-dashboard-elite.vercel.app', status: 'live', category: 'Dashboard', techStack: 'Next.js 14, Supabase, Tailwind 3', owner: 'Jarvis', designScore: 7, createdAt: '2026-01-15' },
  { id: '2', name: 'Project Manager', description: 'Task & project management for the AI team', url: 'https://project-manager-opal-one.vercel.app', status: 'live', category: 'Tool', techStack: 'Next.js 16, Framer Motion, Tailwind 4', owner: 'Jarvis', designScore: 8, createdAt: '2026-02-01' },
  { id: '3', name: 'Command Center', description: 'Cyberpunk system ops dashboard with live data', url: 'https://command-center-eosin.vercel.app', status: 'live', category: 'Dashboard', techStack: 'Next.js 14, SQLite, Supabase', owner: 'Justin', designScore: 7, createdAt: '2026-01-20' },
  { id: '4', name: 'Agent Status Dashboard', description: 'Monitor all 16 agents, APIs, cron jobs', url: 'https://agent-status-dashboard.vercel.app', status: 'live', category: 'Dashboard', techStack: 'Static HTML, Chart.js', owner: 'Justin', designScore: 8, createdAt: '2026-01-18' },
  { id: '5', name: 'Crypto Tracker', description: 'Live prices, calls, whale activity, liquidations', url: 'https://crypto-tracker-theta-seven.vercel.app', status: 'live', category: 'Dashboard', techStack: 'Next.js, Recharts, Tailwind 3', owner: 'Jarvis', designScore: 7, createdAt: '2026-01-10' },
  { id: '6', name: 'Kyle Dashboard', description: 'Lead generation tracking with pipeline flow', url: 'https://kyle-dashboard.vercel.app', status: 'live', category: 'Marketing', techStack: 'Static HTML, Chart.js', owner: 'Kyle', designScore: 8, createdAt: '2026-01-22' },
  { id: '7', name: 'Algo Leaderboard', description: 'Algo trading performance rankings', url: 'https://algo-leaderboard.vercel.app', status: 'live', category: 'Dashboard', techStack: 'Next.js 14, Recharts', owner: 'Jarvis', designScore: 3, createdAt: '2026-01-12' },
  { id: '8', name: 'Strategy Hub', description: 'Internal content strategy docs', url: 'https://strategy-hub-eosin.vercel.app', status: 'live', category: 'Marketing', techStack: 'Next.js 14', owner: 'Jarvis', designScore: 3, createdAt: '2026-01-14' },
  { id: '9', name: 'Master Dashboard', description: 'System overview with Vercel/n8n/cron monitoring', url: 'https://master-dashboard-fawn.vercel.app', status: 'live', category: 'Dashboard', techStack: 'Next.js 16, Pages Router', owner: 'Bob', designScore: 4, createdAt: '2026-01-08' },
  { id: '10', name: 'ROI Calculator', description: 'Lead capture with ROI calculation', url: 'https://roi-calculator-flax-eta.vercel.app', status: 'live', category: 'Tool', techStack: 'Static HTML', owner: 'Kyle', designScore: 6, createdAt: '2026-01-25' },
  { id: '11', name: 'Jarvis Dashboard v2', description: 'Empty - needs to be built or deleted', url: '', status: 'planned', category: 'Dashboard', techStack: 'Next.js 16, Tailwind 4', owner: 'Bob', designScore: 0, createdAt: '2026-02-01' },
  { id: '12', name: 'Project Tracker', description: 'Kanban board for Call Setter AI', url: 'https://project-tracker-sand.vercel.app', status: 'live', category: 'Tool', techStack: 'Static HTML, Upstash Redis', owner: 'Jarvis', designScore: 5, createdAt: '2026-01-16' },
]

const DEFAULT_TASKS: Task[] = [
  { id: '1', title: 'Fix Telegram API costs', description: 'Reduce token usage by switching to Kimi K2.5', status: 'in_progress', priority: 'urgent', assignee: 'Jarvis', dueDate: '2026-02-06', tags: ['bug', 'urgent'], createdAt: '2026-02-05', projectId: '2' },
  { id: '2', title: 'Glass UI Dashboard upgrade', description: 'Apply glassmorphism to all dashboards', status: 'todo', priority: 'high', assignee: 'Bob', dueDate: '2026-02-07', tags: ['design'], createdAt: '2026-02-05' },
  { id: '3', title: 'Deploy monitoring agent', description: 'Watch Vercel deployments and alert on failures', status: 'done', priority: 'medium', assignee: 'Justin', dueDate: '2026-02-05', tags: ['devops'], createdAt: '2026-02-04', projectId: '4' },
  { id: '4', title: 'Lead generation optimization', description: 'Improve Kyle dashboard metrics', status: 'review', priority: 'medium', assignee: 'Kyle', dueDate: '2026-02-08', tags: ['marketing'], createdAt: '2026-02-03', projectId: '6' },
  { id: '5', title: 'Security audit completion', description: 'Full system security review and API key cleanup', status: 'backlog', priority: 'high', assignee: 'Ethan', dueDate: '2026-02-10', tags: ['security'], createdAt: '2026-02-02' },
  { id: '6', title: 'Cost tracking improvements', description: 'Better API cost monitoring with Shen dashboard', status: 'todo', priority: 'low', assignee: 'Shen', dueDate: '2026-02-09', tags: ['finance'], createdAt: '2026-02-01' },
]

// ============================================
// PERSISTENCE (Supabase API + localStorage cache)
// ============================================
const STORAGE_KEY_PROJECTS = 'pm_projects'
const STORAGE_KEY_TASKS = 'pm_tasks'
const STORAGE_KEY_DELETED = 'pm_deleted_tasks'
const MAX_DELETED = 20

function loadLocal<T>(key: string, defaults: T): T {
  if (typeof window === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaults
  } catch { return defaults }
}

function saveLocal<T>(key: string, data: T) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(data))
}

async function saveToApi(tasks: Task[], projects: Project[], deleted?: DeletedTask[]) {
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, projects, deletedTasks: deleted })
    })
  } catch (e) { console.error('API save error:', e) }
}

async function loadFromApi(): Promise<{ tasks: Task[]; projects: Project[]; deletedTasks: DeletedTask[] } | null> {
  try {
    const res = await fetch('/api/data')
    if (!res.ok) return null
    const data = await res.json()
    if (data.source === 'supabase' && (data.tasks?.length > 0 || data.projects?.length > 0)) {
      return { tasks: data.tasks, projects: data.projects, deletedTasks: data.deletedTasks || [] }
    }
    return null
  } catch { return null }
}

// ============================================
// COMPONENTS
// ============================================
const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`glass-card relative overflow-hidden rounded-2xl ${className}`}>
    <div className="relative z-10">{children}</div>
  </div>
)

const StatCard = ({ icon, label, value, subtitle, color }: { icon: string; label: string; value: string | number; subtitle?: string; color: string }) => (
  <GlassCard className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{icon}</span>
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">{label}</span>
        </div>
        <div className="text-3xl font-bold" style={{ color }}>{value}</div>
        {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
      </div>
    </div>
  </GlassCard>
)

// ============================================
// MAIN APP
// ============================================
export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS)
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS)
  const [viewMode, setViewMode] = useState<ViewMode>('projects')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all')
  const [newProject, setNewProject] = useState<Omit<Project, 'id' | 'createdAt'>>({
    name: '', description: '', url: '', status: 'planned', category: 'Dashboard', techStack: '', owner: 'Jarvis', designScore: 5
  })
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as Priority, assignee: '' as Agent | '', status: 'todo' as TaskStatus, dueDate: '', projectId: '' })
  const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>([])
  const [showTrash, setShowTrash] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskSearch, setTaskSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'task' | 'project'; id: string; name: string } | null>(null)

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle')
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const isInitialLoad = useRef(true)

  // Load from API on mount, fall back to localStorage
  useEffect(() => {
    const load = async () => {
      // Instant load from localStorage cache
      const localP = loadLocal(STORAGE_KEY_PROJECTS, DEFAULT_PROJECTS)
      const localT = loadLocal(STORAGE_KEY_TASKS, DEFAULT_TASKS)
      const localD = loadLocal<DeletedTask[]>(STORAGE_KEY_DELETED, [])
      setProjects(localP)
      setTasks(localT)
      setDeletedTasks(localD)

      // Then try API
      setSyncStatus('syncing')
      const apiData = await loadFromApi()
      if (apiData) {
        setProjects(apiData.projects.length > 0 ? apiData.projects : localP)
        setTasks(apiData.tasks.length > 0 ? apiData.tasks : localT)
        setDeletedTasks(apiData.deletedTasks || localD)
        saveLocal(STORAGE_KEY_PROJECTS, apiData.projects.length > 0 ? apiData.projects : localP)
        saveLocal(STORAGE_KEY_TASKS, apiData.tasks.length > 0 ? apiData.tasks : localT)
        saveLocal(STORAGE_KEY_DELETED, apiData.deletedTasks || localD)
        setSyncStatus('saved')
      } else {
        // No API data - seed API with defaults/local
        await saveToApi(localT, localP, localD)
        setSyncStatus('saved')
      }
      isInitialLoad.current = false
    }
    load()
  }, [])

  // Debounced save to API + localStorage
  const debouncedSave = useCallback((t: Task[], p: Project[], d?: DeletedTask[]) => {
    saveLocal(STORAGE_KEY_TASKS, t)
    saveLocal(STORAGE_KEY_PROJECTS, p)
    if (d) saveLocal(STORAGE_KEY_DELETED, d)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSyncStatus('syncing')
      await saveToApi(t, p, d)
      setSyncStatus('saved')
    }, 800)
  }, [])

  // Persist on change
  const persistProjects = useCallback((p: Project[]) => { setProjects(p); debouncedSave(tasks, p, deletedTasks) }, [tasks, deletedTasks, debouncedSave])
  const persistTasks = useCallback((t: Task[], d?: DeletedTask[]) => {
    setTasks(t)
    if (d) setDeletedTasks(d)
    debouncedSave(t, projects, d || deletedTasks)
  }, [projects, deletedTasks, debouncedSave])

  // CRUD: Projects
  const addProject = () => {
    if (!newProject.name.trim()) return
    const project: Project = { ...newProject, id: Date.now().toString(), createdAt: new Date().toISOString().split('T')[0] }
    persistProjects([project, ...projects])
    setNewProject({ name: '', description: '', url: '', status: 'planned', category: 'Dashboard', techStack: '', owner: 'Jarvis', designScore: 5 })
    setShowAddProject(false)
  }

  const updateProject = () => {
    if (!editingProject) return
    persistProjects(projects.map(p => p.id === editingProject.id ? editingProject : p))
    setEditingProject(null)
  }

  const deleteProject = (id: string) => {
    persistProjects(projects.filter(p => p.id !== id))
    setSelectedProject(null)
  }

  // CRUD: Tasks
  const addTask = () => {
    if (!newTask.title.trim()) return
    const task: Task = {
      id: Date.now().toString(), title: newTask.title, description: newTask.description,
      status: newTask.status, priority: newTask.priority, assignee: newTask.assignee || null,
      dueDate: newTask.dueDate || null, tags: [], createdAt: new Date().toISOString().split('T')[0],
      projectId: newTask.projectId || undefined
    }
    persistTasks([task, ...tasks])
    setNewTask({ title: '', description: '', priority: 'medium', assignee: '', status: 'todo', dueDate: '', projectId: '' })
    setShowAddTask(false)
  }

  const softDeleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const deleted: DeletedTask = { ...task, deletedAt: new Date().toISOString() }
    const newDeleted = [deleted, ...deletedTasks].slice(0, MAX_DELETED)
    setDeletedTasks(newDeleted)
    const newTasks = tasks.filter(t => t.id !== id)
    persistTasks(newTasks, newDeleted)
    setSelectedTask(null)
    setConfirmDelete(null)
  }

  const restoreTask = (id: string) => {
    const task = deletedTasks.find(t => t.id === id)
    if (!task) return
    const { deletedAt, ...restored } = task
    const newDeleted = deletedTasks.filter(t => t.id !== id)
    setDeletedTasks(newDeleted)
    persistTasks([restored, ...tasks], newDeleted)
  }

  const permanentDeleteTask = (id: string) => {
    const newDeleted = deletedTasks.filter(t => t.id !== id)
    setDeletedTasks(newDeleted)
    saveLocal(STORAGE_KEY_DELETED, newDeleted)
    debouncedSave(tasks, projects, newDeleted)
  }

  const updateTask = (updated: Task) => {
    persistTasks(tasks.map(t => t.id === updated.id ? updated : t))
    setEditingTask(null)
    setSelectedTask(null)
  }

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    persistTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => { e.dataTransfer.setData('taskId', taskId) }
  const handleDrop = (e: React.DragEvent, status: TaskStatus) => { e.preventDefault(); const id = e.dataTransfer.getData('taskId'); if (id) updateTaskStatus(id, status) }
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }

  // Stats
  const projectStats = useMemo(() => ({
    total: projects.length,
    live: projects.filter(p => p.status === 'live').length,
    building: projects.filter(p => p.status === 'building').length,
    needsWork: projects.filter(p => p.designScore <= 4).length
  }), [projects])

  const taskStats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
  }), [tasks])

  const filteredTasks = useMemo(() => {
    if (!taskSearch) return tasks
    const q = taskSearch.toLowerCase()
    return tasks.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.assignee?.toLowerCase().includes(q))
  }, [tasks, taskSearch])

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { backlog: [], todo: [], in_progress: [], review: [], done: [] }
    filteredTasks.forEach(t => grouped[t.status].push(t))
    return grouped
  }, [filteredTasks])

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [projects, searchQuery, filterStatus])

  const inputClass = "w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
  const selectClass = "w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-500"

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-blue top-1/4 left-1/4 w-96 h-96" />
        <div className="orb orb-purple bottom-1/4 right-1/4 w-96 h-96" />
        <div className="orb orb-cyan top-1/2 right-1/3 w-64 h-64" />
      </div>

      {/* Sticky Nav */}
      <header className="sticky top-0 z-50 glass-card" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold gradient-title whitespace-nowrap">Project Manager</h1>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
              <span className="w-2 h-2 rounded-full bg-green-400" style={{ animation: 'glow-pulse 2s ease-in-out infinite' }} />
              <span className="text-xs text-green-400 font-medium">LIVE</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: syncStatus === 'syncing' ? 'rgba(245,158,11,0.1)' : syncStatus === 'saved' ? 'rgba(16,185,129,0.1)' : syncStatus === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)', border: `1px solid ${syncStatus === 'syncing' ? 'rgba(245,158,11,0.3)' : syncStatus === 'saved' ? 'rgba(16,185,129,0.3)' : syncStatus === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(107,114,128,0.3)'}` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: syncStatus === 'syncing' ? '#F59E0B' : syncStatus === 'saved' ? '#10B981' : syncStatus === 'error' ? '#EF4444' : '#6B7280', animation: syncStatus === 'syncing' ? 'glow-pulse 1s ease-in-out infinite' : 'none' }} />
              <span className="text-xs font-medium" style={{ color: syncStatus === 'syncing' ? '#F59E0B' : syncStatus === 'saved' ? '#10B981' : syncStatus === 'error' ? '#EF4444' : '#6B7280' }}>
                {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'saved' ? 'Saved' : syncStatus === 'error' ? 'Error' : 'Offline'}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {([
              { key: 'projects', icon: '🏗️', label: 'Projects' },
              { key: 'dashboard', icon: '📊', label: 'Dashboard' },
              { key: 'kanban', icon: '📋', label: 'Kanban' },
              { key: 'list', icon: '📝', label: 'List' }
            ] as const).map(({ key, icon, label }) => (
              <button key={key} onClick={() => setViewMode(key as ViewMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-75 flex items-center gap-2 ${viewMode === key ? 'tab-active text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                <span>{icon}</span><span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddProject(true)} className="btn-gradient px-4 py-2 rounded-xl font-medium text-white text-sm flex items-center gap-2">
              <span>+</span><span className="hidden sm:inline">Project</span>
            </button>
            <button onClick={() => setShowAddTask(true)} className="px-4 py-2 rounded-xl font-medium text-white text-sm bg-white/10 border border-white/20 hover:bg-white/20 transition-colors duration-75">
              <span>+ Task</span>
            </button>
            {deletedTasks.length > 0 && (
              <button onClick={() => setShowTrash(true)} className="relative px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-75 text-gray-400 hover:text-white">
                <span>🗑️</span>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{deletedTasks.length}</span>
              </button>
            )}
          </div>
        </div>
        <div className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {([
            { key: 'projects', icon: '🏗️', label: 'Projects' },
            { key: 'dashboard', icon: '📊', label: 'Dashboard' },
            { key: 'kanban', icon: '📋', label: 'Kanban' },
            { key: 'list', icon: '📝', label: 'List' }
          ] as const).map(({ key, icon, label }) => (
            <button key={key} onClick={() => setViewMode(key as ViewMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-75 flex items-center gap-1.5 whitespace-nowrap ${viewMode === key ? 'tab-active text-white' : 'text-gray-400 hover:text-white'}`}>
              <span>{icon}</span><span>{label}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8">

        {/* ===== PROJECTS VIEW ===== */}
        {viewMode === 'projects' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="🏗️" label="Total" value={projectStats.total} subtitle="All projects" color="#3B82F6" />
              <StatCard icon="🟢" label="Live" value={projectStats.live} subtitle="Deployed" color="#10B981" />
              <StatCard icon="🔨" label="Building" value={projectStats.building} subtitle="In progress" color="#F59E0B" />
              <StatCard icon="⚠️" label="Needs Work" value={projectStats.needsWork} subtitle="Score ≤ 4" color="#EF4444" />
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search projects..."
                className="flex-1 p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500" />
              <div className="flex gap-2">
                {(['all', 'live', 'building', 'planned', 'offline'] as const).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-75 capitalize ${filterStatus === s ? 'bg-white/20 text-white border border-white/30' : 'text-gray-400 hover:text-white bg-white/5'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Project Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map(project => (
                <GlassCard key={project.id} className="p-5 cursor-pointer hover:bg-white/5 transition-all duration-75">
                  <div onClick={() => setSelectedProject(project)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{project.name}</h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{project.description}</p>
                      </div>
                      <span className="ml-3 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
                        style={{ background: PROJECT_STATUS_CONFIG[project.status].bg, color: PROJECT_STATUS_CONFIG[project.status].color }}>
                        {PROJECT_STATUS_CONFIG[project.status].label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">{project.category}</span>
                      <span className="text-xs text-gray-500">{project.techStack}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{tasks.filter(t => t.projectId === project.id).length} tasks</span>
                        <span className="text-xs text-gray-600">|</span>
                        <span className="text-xs text-gray-400">{project.owner}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Design:</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 10 }, (_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full" style={{ background: i < project.designScore ? '#10B981' : 'rgba(255,255,255,0.1)' }} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400 ml-1">{project.designScore}/10</span>
                      </div>
                    </div>

                    {project.url && (
                      <a href={project.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="block mt-3 text-xs text-cyan-400 hover:text-cyan-300 truncate transition-colors">
                        {project.url.replace('https://', '')} →
                      </a>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* ===== DASHBOARD VIEW ===== */}
        {viewMode === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="📋" label="Tasks" value={taskStats.total} subtitle="All tasks" color="#3B82F6" />
              <StatCard icon="⚡" label="Active" value={taskStats.inProgress} subtitle="In progress" color="#F59E0B" />
              <StatCard icon="✅" label="Done" value={taskStats.completed} subtitle={`${Math.round((taskStats.completed / taskStats.total) * 100) || 0}%`} color="#10B981" />
              <StatCard icon="⚠️" label="Overdue" value={taskStats.overdue} subtitle="Need attention" color="#EF4444" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Status Breakdown</h3>
                <div className="space-y-3">
                  {(Object.entries(tasksByStatus) as [TaskStatus, Task[]][]).map(([status, statusTasks]) => (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: STATUS_CONFIG[status].color }} />
                      <span className="text-gray-300 flex-1 text-sm">{STATUS_CONFIG[status].label}</span>
                      <span className="text-white font-bold text-sm">{statusTasks.length}</span>
                      <div className="w-20 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ background: STATUS_CONFIG[status].color, width: `${(statusTasks.length / tasks.length) * 100 || 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Priority</h3>
                <div className="space-y-3">
                  {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(p => (
                    <div key={p} className="flex items-center gap-3">
                      <span className="text-lg" style={{ color: PRIORITY_CONFIG[p].color }}>{PRIORITY_CONFIG[p].icon}</span>
                      <span className="text-gray-300 flex-1 text-sm">{PRIORITY_CONFIG[p].label}</span>
                      <span className="text-white font-bold text-sm">{tasks.filter(t => t.priority === p).length}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Tasks per Project</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {projects.map(proj => {
                    const count = tasks.filter(t => t.projectId === proj.id).length
                    return (
                      <div key={proj.id} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                        <span className="text-gray-300 flex-1 text-sm truncate">{proj.name}</span>
                        <span className="text-white font-bold text-sm">{count}</span>
                      </div>
                    )
                  })}
                  {(() => { const unassigned = tasks.filter(t => !t.projectId).length; return unassigned > 0 ? (
                    <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                      <div className="w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
                      <span className="text-gray-400 flex-1 text-sm">No Project</span>
                      <span className="text-gray-400 font-bold text-sm">{unassigned}</span>
                    </div>
                  ) : null })()}
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* ===== SEARCH BAR (kanban & list) ===== */}
        {(viewMode === 'kanban' || viewMode === 'list') && (
          <div className="mb-4">
            <input type="text" value={taskSearch} onChange={e => setTaskSearch(e.target.value)}
              placeholder="Search tasks by title, description, or assignee..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors text-sm" />
          </div>
        )}

        {/* ===== KANBAN VIEW ===== */}
        {viewMode === 'kanban' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(status => (
              <div key={status} className="flex-1 min-w-[260px] max-w-[300px]">
                <div className="flex items-center gap-2 mb-3 px-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: STATUS_CONFIG[status].color }} />
                  <h3 className="font-semibold text-white text-sm">{STATUS_CONFIG[status].label}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400 ml-auto">{tasksByStatus[status].length}</span>
                </div>
                <div onDrop={e => handleDrop(e, status)} onDragOver={handleDragOver}
                  className="rounded-xl p-2 min-h-[400px]" style={{ background: STATUS_CONFIG[status].bg, border: `1px solid ${STATUS_CONFIG[status].color}20` }}>
                  {tasksByStatus[status].map(task => (
                    <div key={task.id} draggable onDragStart={e => handleDragStart(e, task.id)} onClick={() => setSelectedTask(task)}
                      className="glass-task cursor-pointer rounded-lg p-3 mb-2 hover:bg-white/10 transition-all duration-75"
                      style={{ border: `1px solid ${PRIORITY_CONFIG[task.priority].color}30` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ color: PRIORITY_CONFIG[task.priority].color }}>{PRIORITY_CONFIG[task.priority].icon}</span>
                        <span className="font-medium text-white text-sm truncate">{task.title}</span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-2">{task.description}</p>
                      <div className="flex items-center justify-between">
                        {task.projectId && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 truncate max-w-[120px]">{projects.find(p => p.id === task.projectId)?.name || 'Unknown'}</span>}
                        {task.dueDate && <span className={`text-xs ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-400' : 'text-gray-500'}`}>{task.dueDate}</span>}
                      </div>
                    </div>
                  ))}
                  {tasksByStatus[status].length === 0 && <div className="text-center text-gray-500 py-8 border-2 border-dashed border-white/10 rounded-lg text-sm">Drop here</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== LIST VIEW ===== */}
        {viewMode === 'list' && (
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-sm text-gray-400 font-medium">Task</th>
                    <th className="text-left p-4 text-sm text-gray-400 font-medium">Project</th>
                    <th className="text-left p-4 text-sm text-gray-400 font-medium">Status</th>
                    <th className="text-left p-4 text-sm text-gray-400 font-medium">Priority</th>
                    <th className="text-left p-4 text-sm text-gray-400 font-medium">Due</th>
                    <th className="text-left p-4 text-sm text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => (
                    <tr key={task.id} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-75 cursor-pointer" onClick={() => setSelectedTask(task)}>
                      <td className="p-4">
                        <div className="font-medium text-white text-sm">{task.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{task.description}</div>
                      </td>
                      <td className="p-4"><span className="text-sm text-gray-300">{task.projectId ? projects.find(p => p.id === task.projectId)?.name || '-' : '-'}</span></td>
                      <td className="p-4"><span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: STATUS_CONFIG[task.status].bg, color: STATUS_CONFIG[task.status].color }}>{STATUS_CONFIG[task.status].label}</span></td>
                      <td className="p-4"><span className="flex items-center gap-1 text-sm" style={{ color: PRIORITY_CONFIG[task.priority].color }}><span>{PRIORITY_CONFIG[task.priority].icon}</span>{PRIORITY_CONFIG[task.priority].label}</span></td>
                      <td className="p-4 text-gray-400 text-sm">{task.dueDate || '-'}</td>
                      <td className="p-4"><button onClick={() => setConfirmDelete({ type: 'task', id: task.id, name: task.title })} className="text-red-400 hover:text-red-300 text-sm transition-colors">Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>

      {/* ===== PROJECT DETAIL MODAL ===== */}
      <AnimatePresence>
        {selectedProject && !editingProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setSelectedProject(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-lg">
              <GlassCard className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: PROJECT_STATUS_CONFIG[selectedProject.status].bg, color: PROJECT_STATUS_CONFIG[selectedProject.status].color }}>
                      {PROJECT_STATUS_CONFIG[selectedProject.status].label}
                    </span>
                    <h2 className="text-2xl font-bold text-white mt-2">{selectedProject.name}</h2>
                  </div>
                  <button onClick={() => setSelectedProject(null)} className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">×</button>
                </div>
                <p className="text-gray-300 mb-6">{selectedProject.description}</p>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="text-white">{selectedProject.category}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tech Stack</span><span className="text-white text-sm">{selectedProject.techStack}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500">Owner</span>
                    <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black" style={{ background: AGENT_COLORS[selectedProject.owner] }}>{selectedProject.owner[0]}</div><span className="text-white">{selectedProject.owner}</span></div>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">Design Score</span><span className="text-white">{selectedProject.designScore}/10</span></div>
                  {selectedProject.url && <div className="flex justify-between"><span className="text-gray-500">URL</span><a href={selectedProject.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm">{selectedProject.url.replace('https://', '')}</a></div>}
                </div>
                {/* Project Tasks */}
                {(() => {
                  const projectTasks = tasks.filter(t => t.projectId === selectedProject.id)
                  return projectTasks.length > 0 ? (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-400 mb-3">Tasks ({projectTasks.length})</h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {projectTasks.map(t => (
                          <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={() => { setSelectedProject(null); setSelectedTask(t) }}>
                            <span style={{ color: PRIORITY_CONFIG[t.priority].color }} className="text-sm">{PRIORITY_CONFIG[t.priority].icon}</span>
                            <span className="text-white text-sm flex-1 truncate">{t.title}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: STATUS_CONFIG[t.status].bg, color: STATUS_CONFIG[t.status].color }}>{STATUS_CONFIG[t.status].label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 py-4 text-center text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">No tasks linked to this project</div>
                  )
                })()}
                <div className="flex gap-3">
                  <button onClick={() => { setNewTask({ ...newTask, projectId: selectedProject.id }); setSelectedProject(null); setShowAddTask(true) }} className="flex-1 py-3 rounded-xl bg-cyan-500/20 text-cyan-400 font-medium hover:bg-cyan-500/30 transition-colors">+ Add Task</button>
                  <button onClick={() => { setEditingProject(selectedProject); setSelectedProject(null) }} className="flex-1 py-3 rounded-xl btn-gradient font-medium text-white">Edit</button>
                  <button onClick={() => setConfirmDelete({ type: 'project', id: selectedProject.id, name: selectedProject.name })} className="px-6 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors">Delete</button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== EDIT PROJECT MODAL ===== */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setEditingProject(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">
            <GlassCard className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Edit Project</h2>
                <button onClick={() => setEditingProject(null)} className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">×</button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm text-gray-400 mb-1">Name</label><input type="text" value={editingProject.name} onChange={e => setEditingProject({ ...editingProject, name: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={editingProject.description} onChange={e => setEditingProject({ ...editingProject, description: e.target.value })} rows={2} className={inputClass + ' resize-none'} /></div>
                <div><label className="block text-sm text-gray-400 mb-1">URL</label><input type="text" value={editingProject.url} onChange={e => setEditingProject({ ...editingProject, url: e.target.value })} className={inputClass} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-400 mb-1">Status</label>
                    <select value={editingProject.status} onChange={e => setEditingProject({ ...editingProject, status: e.target.value as ProjectStatus })} className={selectClass}>
                      {Object.entries(PROJECT_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Category</label>
                    <select value={editingProject.category} onChange={e => setEditingProject({ ...editingProject, category: e.target.value })} className={selectClass}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-400 mb-1">Owner</label>
                    <select value={editingProject.owner} onChange={e => setEditingProject({ ...editingProject, owner: e.target.value as Agent })} className={selectClass}>
                      {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Design Score (0-10)</label>
                    <input type="number" min={0} max={10} value={editingProject.designScore} onChange={e => setEditingProject({ ...editingProject, designScore: Number(e.target.value) })} className={inputClass} /></div>
                </div>
                <div><label className="block text-sm text-gray-400 mb-1">Tech Stack</label><input type="text" value={editingProject.techStack} onChange={e => setEditingProject({ ...editingProject, techStack: e.target.value })} className={inputClass} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={updateProject} className="btn-gradient flex-1 py-3 rounded-xl font-medium text-white">Save Changes</button>
                <button onClick={() => setEditingProject(null)} className="px-6 py-3 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 transition-colors">Cancel</button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ===== ADD PROJECT MODAL ===== */}
      {showAddProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowAddProject(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">
            <GlassCard className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">New Project</h2>
                <button onClick={() => setShowAddProject(false)} className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">×</button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm text-gray-400 mb-1">Name *</label><input type="text" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} placeholder="Project name..." className={inputClass} /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} placeholder="What does this project do?" rows={2} className={inputClass + ' resize-none'} /></div>
                <div><label className="block text-sm text-gray-400 mb-1">URL</label><input type="text" value={newProject.url} onChange={e => setNewProject({ ...newProject, url: e.target.value })} placeholder="https://..." className={inputClass} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-400 mb-1">Status</label>
                    <select value={newProject.status} onChange={e => setNewProject({ ...newProject, status: e.target.value as ProjectStatus })} className={selectClass}>
                      {Object.entries(PROJECT_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Category</label>
                    <select value={newProject.category} onChange={e => setNewProject({ ...newProject, category: e.target.value })} className={selectClass}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-400 mb-1">Owner</label>
                    <select value={newProject.owner} onChange={e => setNewProject({ ...newProject, owner: e.target.value as Agent })} className={selectClass}>
                      {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Tech Stack</label><input type="text" value={newProject.techStack} onChange={e => setNewProject({ ...newProject, techStack: e.target.value })} placeholder="Next.js, React..." className={inputClass} /></div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={addProject} className="btn-gradient flex-1 py-3 rounded-xl font-medium text-white">Create Project</button>
                <button onClick={() => setShowAddProject(false)} className="px-6 py-3 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 transition-colors">Cancel</button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ===== ADD TASK MODAL ===== */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowAddTask(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">
            <GlassCard className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">New Task</h2>
                <button onClick={() => setShowAddTask(false)} className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">×</button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm text-gray-400 mb-1">Title *</label><input type="text" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title..." className={inputClass} /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Details..." rows={2} className={inputClass + ' resize-none'} /></div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Project *</label>
                  <select value={newTask.projectId} onChange={e => setNewTask({ ...newTask, projectId: e.target.value })} className={selectClass}>
                    <option value="">No Project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm text-gray-400 mb-1">Priority</label>
                    <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as Priority })} className={selectClass}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                    </select></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Status</label>
                    <select value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value as TaskStatus })} className={selectClass}>
                      {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select></div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Due Date</label>
                  <input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={addTask} className="btn-gradient flex-1 py-3 rounded-xl font-medium text-white">Create Task</button>
                <button onClick={() => setShowAddTask(false)} className="px-6 py-3 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 transition-colors">Cancel</button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ===== TASK DETAIL MODAL ===== */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setSelectedTask(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-lg">
              <GlassCard className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: PRIORITY_CONFIG[selectedTask.priority].color }}>{PRIORITY_CONFIG[selectedTask.priority].icon}</span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: STATUS_CONFIG[selectedTask.status].bg, color: STATUS_CONFIG[selectedTask.status].color }}>{STATUS_CONFIG[selectedTask.status].label}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">{selectedTask.title}</h2>
                  </div>
                  <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">×</button>
                </div>
                <p className="text-gray-300 mb-6">{selectedTask.description}</p>
                <div className="space-y-3 mb-6">
                  {selectedTask.projectId && <div className="flex items-center gap-3"><span className="text-gray-500 w-20">Project</span><span className="text-white font-medium">{projects.find(p => p.id === selectedTask.projectId)?.name || 'Unknown'}</span></div>}
                  {selectedTask.dueDate && <div className="flex items-center gap-3"><span className="text-gray-500 w-20">Due</span><span className="text-white">{selectedTask.dueDate}</span></div>}
                  <div className="flex items-center gap-3"><span className="text-gray-500 w-20">Created</span><span className="text-gray-300">{selectedTask.createdAt}</span></div>
                </div>
                <div className="flex gap-2">
                  <select value={selectedTask.status} onChange={e => { updateTaskStatus(selectedTask.id, e.target.value as TaskStatus); setSelectedTask({ ...selectedTask, status: e.target.value as TaskStatus }) }}
                    className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center font-medium">
                    {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                  <button onClick={() => { setEditingTask(selectedTask); setSelectedTask(null) }} className="px-5 py-3 rounded-xl bg-cyan-500/20 text-cyan-400 font-medium hover:bg-cyan-500/30 transition-colors">Edit</button>
                  <button onClick={() => setConfirmDelete({ type: 'task', id: selectedTask.id, name: selectedTask.title })} className="px-5 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors">Delete</button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}

        {/* ===== CONFIRM DELETE MODAL ===== */}
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={() => setConfirmDelete(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-sm">
              <GlassCard className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🗑️</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Delete {confirmDelete.type === 'task' ? 'Task' : 'Project'}?</h3>
                <p className="text-gray-400 mb-6 text-sm">
                  {confirmDelete.type === 'task' ? 'This will move' : 'This will permanently delete'} <span className="text-white font-medium">&quot;{confirmDelete.name}&quot;</span>
                  {confirmDelete.type === 'task' ? ' to the trash bin.' : '.'}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 transition-colors">Cancel</button>
                  <button onClick={() => {
                    if (confirmDelete.type === 'task') softDeleteTask(confirmDelete.id)
                    else { persistProjects(projects.filter(p => p.id !== confirmDelete.id)); setSelectedProject(null); setConfirmDelete(null) }
                  }} className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors">Delete</button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}

        {/* ===== EDIT TASK MODAL ===== */}
        {editingTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={() => setEditingTask(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-lg">
              <GlassCard className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Edit Task</h2>
                  <button onClick={() => setEditingTask(null)} className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">×</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Title</label>
                    <input type="text" value={editingTask.title} onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                    <textarea value={editingTask.description} onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                      rows={3} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition-colors resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Project</label>
                    <select value={editingTask.projectId || ''} onChange={e => setEditingTask({ ...editingTask, projectId: e.target.value || undefined })}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-white/40 transition-colors">
                      <option value="">No Project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Priority</label>
                      <select value={editingTask.priority} onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as Priority })}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-white/40 transition-colors">
                        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Status</label>
                      <select value={editingTask.status} onChange={e => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-white/40 transition-colors">
                        {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Due Date</label>
                    <input type="date" value={editingTask.dueDate || ''} onChange={e => setEditingTask({ ...editingTask, dueDate: e.target.value || null })}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-white/40 transition-colors" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setEditingTask(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 transition-colors">Cancel</button>
                  <button onClick={() => updateTask(editingTask)} className="flex-1 py-3 rounded-xl btn-gradient text-white font-medium">Save Changes</button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}

        {/* ===== TRASH BIN MODAL ===== */}
        {showTrash && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={() => setShowTrash(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-lg max-h-[80vh] flex flex-col">
              <GlassCard className="p-8 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Trash Bin</h2>
                    <p className="text-sm text-gray-400 mt-1">{deletedTasks.length} deleted task{deletedTasks.length !== 1 ? 's' : ''} (max {MAX_DELETED})</p>
                  </div>
                  <button onClick={() => setShowTrash(false)} className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">×</button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-2 -mx-2 px-2">
                  {deletedTasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">Trash is empty</div>
                  ) : deletedTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span style={{ color: PRIORITY_CONFIG[task.priority].color }} className="text-sm">{PRIORITY_CONFIG[task.priority].icon}</span>
                          <span className="text-white text-sm font-medium truncate">{task.title}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Deleted {new Date(task.deletedAt).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => restoreTask(task.id)} className="px-3 py-1.5 rounded-lg text-xs bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors font-medium">Restore</button>
                      <button onClick={() => permanentDeleteTask(task.id)} className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium">Purge</button>
                    </div>
                  ))}
                </div>
                {deletedTasks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <button onClick={() => { setDeletedTasks([]); saveLocal(STORAGE_KEY_DELETED, []); debouncedSave(tasks, projects, []); }}
                      className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 transition-colors text-sm">Empty Trash</button>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
