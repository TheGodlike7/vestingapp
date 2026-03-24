import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabase'
import { CreateScheduleModal } from './CreateScheduleModal'
import { Zap, Calendar, Users, Lock, CheckCircle, Inbox } from 'lucide-react'

export function ProjectPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState<any>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login' }
      else { fetchProject(); fetchSchedules() }
    })
  }, [])

  const fetchProject = async () => {
    const { data } = await supabase.from('vesting_projects').select('*').eq('id', projectId).single()
    if (data) setProject(data)
    setLoading(false)
  }

  const fetchSchedules = async () => {
    const { data } = await supabase.from('vesting_schedules').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (data) setSchedules(data)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    </div>
  )

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--gradient-hero)' }}>
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-[hsl(265_40%_20%/0.5)]">
          <div>
            <button onClick={() => window.location.href = '/dashboard'} className="text-muted-foreground hover:text-foreground transition-colors text-sm mb-3 flex items-center gap-1">
              ← Back to Dashboard
            </button>
            <a href="/" className="flex items-center gap-2.5 mb-3">
              <div className="relative w-7 h-7">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
                <Zap className="absolute inset-0 m-auto w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-bold text-base text-foreground">
                Vesting<span className="gradient-text">App</span>
              </span>
            </a>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">{project?.project_name}</h1>
            <p className="text-muted-foreground text-sm">
              <span className="text-[hsl(var(--accent))] font-semibold">{project?.token_symbol}</span>
              {' '}• {project?.token_mint?.slice(0, 16)}...
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap"
          >
            + Add Schedule
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Schedules', value: schedules.length.toString(), icon: Calendar, color: 'text-[hsl(var(--primary))]' },
            { label: 'Total Recipients', value: schedules.length.toString(), icon: Users, color: 'text-[hsl(var(--accent))]' },
            { label: 'Tokens Locked', value: '0', icon: Lock, color: 'text-[hsl(var(--primary))]' },
            { label: 'Tokens Claimed', value: '0', icon: CheckCircle, color: 'text-[hsl(var(--accent))]' },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <stat.icon className={`w-6 h-6 mx-auto mb-3 ${stat.color} stat-icon`} />
              <div className={`text-2xl font-bold font-display mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-muted-foreground text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Schedules */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Vesting Schedules</h2>
              <p className="text-muted-foreground text-xs mt-0.5">{schedules.length} schedule{schedules.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {schedules.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[hsl(265_44%_15%)] border border-[hsl(265_40%_20%)] flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-1">No schedules yet</p>
              <p className="text-muted-foreground text-sm">Add your first vesting schedule to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="project-card">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">
                      {schedule.recipient_wallet.slice(0, 8)}...{schedule.recipient_wallet.slice(-8)}
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      {schedule.total_amount} {project?.token_symbol} • {schedule.schedule_type} • {schedule.duration_months}mo
                      {schedule.cliff_months > 0 && ` • ${schedule.cliff_months}mo cliff`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    schedule.is_active
                      ? 'bg-[hsl(157_87%_51%/0.15)] text-[hsl(var(--accent))] border-[hsl(157_87%_51%/0.3)]'
                      : 'bg-[hsl(0_84%_60%/0.15)] text-[hsl(0_84%_60%)] border-[hsl(0_84%_60%/0.3)]'
                  }`}>
                    {schedule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && project && (
        <CreateScheduleModal
          projectId={projectId!}
          tokenSymbol={project.token_symbol}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => fetchSchedules()}
        />
      )}
    </div>
  )
}