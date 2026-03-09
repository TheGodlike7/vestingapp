import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabase'
import { CreateScheduleModal } from './CreateScheduleModal'

export function ProjectPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState<any>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/login'
      } else {
        fetchProject()
        fetchSchedules()
      }
    })
  }, [])

  const fetchProject = async () => {
    const { data } = await supabase
      .from('vesting_projects')
      .select('*')
      .eq('id', projectId)
      .single()
    if (data) setProject(data)
    setLoading(false)
  }

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from('vesting_schedules')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (data) setSchedules(data)
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      color: 'white'
    }}>
      Loading...
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      color: 'white',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <p
            onClick={() => window.location.href = '/dashboard'}
            style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}
          >
            ← Back to Dashboard
          </p>
          <h1 style={{ margin: 0 }}>📁 {project?.project_name}</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.5)' }}>
            {project?.token_symbol} • {project?.token_mint}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          + Add Vesting Schedule
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {[
          { label: 'Total Schedules', value: schedules.length.toString(), icon: '📅' },
          { label: 'Total Recipients', value: schedules.length.toString(), icon: '👥' },
          { label: 'Tokens Locked', value: '0', icon: '🔒' },
          { label: 'Tokens Claimed', value: '0', icon: '✅' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>{stat.value}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Schedules List */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '2rem',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{ margin: '0 0 1.5rem 0' }}>Vesting Schedules</h2>

        {schedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p>No vesting schedules yet. Add your first one!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {schedules.map((schedule) => (
              <div key={schedule.id} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0' }}>
                    {schedule.recipient_wallet.slice(0, 8)}...{schedule.recipient_wallet.slice(-8)}
                  </h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    {schedule.total_amount} {project?.token_symbol} • {schedule.schedule_type} • {schedule.duration_months} months
                    {schedule.cliff_months > 0 && ` • ${schedule.cliff_months}mo cliff`}
                  </p>
                </div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  background: schedule.is_active ? 'rgba(81,207,102,0.2)' : 'rgba(255,107,107,0.2)',
                  color: schedule.is_active ? '#51cf66' : '#ff6b6b',
                  fontSize: '0.8rem'
                }}>
                  {schedule.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
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