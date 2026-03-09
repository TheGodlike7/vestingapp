import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { CreateProjectModal } from './CreateProjectModal'
import { useSubscription } from './useSubscription'

export function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { isActive, loading: subLoading } = useSubscription(user?.id)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/login'
      } else {
        setUser(session.user)
        fetchProjects(session.user.id)
        setLoading(false)
      }
    })
  }, [])

  const fetchProjects = async (userId: string) => {
    const { data } = await supabase
      .from('vesting_projects')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    if (data) setProjects(data)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
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
        <h1 style={{ margin: 0 }}>🏦 VestingApp Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
            {user?.email}
          </span>
          <button
              onClick={() => window.location.href = '/subscription'}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem'
            }}
          >
            💳 Manage Subscription
          </button>
          <button
            onClick={handleSignOut}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {[
          { label: 'Active Projects', value: projects.length.toString(), icon: '📁' },
          { label: 'Total Schedules', value: '0', icon: '📅' },
          { label: 'Total Recipients', value: '0', icon: '👥' },
          { label: 'Tokens Locked', value: '0', icon: '🔒' },
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
      
      {!subLoading && !isActive && (
        <div style={{
          background: 'rgba(255,107,107,0.1)',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          border: '1px solid rgba(255,107,107,0.3)',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong style={{ color: '#ff6b6b' }}>⚠️ No Active Subscription</strong>
            <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
              Subscribe to create projects and manage vesting schedules
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/subscription'}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Subscribe Now →
          </button>
        </div>
      )}

      {/* Projects Section */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '2rem',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Your Projects</h2>
          <button
            onClick={() => {
              if (!isActive) {
                window.location.href = '/subscription'
              } else {
                setShowCreateModal(true)
              }
            }}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              background: isActive
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'rgba(255,255,255,0.1)',
              color: isActive ? 'white' : 'rgba(255,255,255,0.4)',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {isActive ? '+ Create New Project' : '🔒 Subscribe to Create'}
          </button>
        </div>

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p>No projects yet. Create your first one!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {projects.map((project) => (
              <div key={project.id} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0' }}>{project.project_name}</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    {project.token_symbol} • {project.token_mint.slice(0, 8)}...
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = `/project/${project.id}`}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer'
                }}
              >
                Manage →
              </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showCreateModal && (
        <CreateProjectModal
          userId={user.id}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => fetchProjects(user.id)}
        />
      )}
    </div>
  )
}