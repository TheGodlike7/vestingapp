import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { CreateProjectModal } from './CreateProjectModal'
import { useSubscription } from './useSubscription'

export function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
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
      <style>{`
        .stat-card {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255,255,255,0.1);
          text-align: center;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
          cursor: default;
        }
        .stat-card:hover {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 12px 40px rgba(99,102,241,0.3);
          border-color: rgba(139,92,246,0.6);
          background: rgba(99,102,241,0.12);
        }
        .stat-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          display: block;
          transition: transform 0.25s ease;
        }
        .stat-card:hover .stat-icon {
          transform: scale(1.2) rotate(-8deg);
        }
        .project-card {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
        }
        .project-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(99,102,241,0.25);
          border-color: rgba(139,92,246,0.5);
          background: rgba(99,102,241,0.08);
        }
        .manage-btn {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
          background: transparent;
          color: white;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
        }
        .manage-btn:hover {
          background: rgba(99,102,241,0.3);
          border-color: rgba(139,92,246,0.6);
          transform: scale(1.05);
        }
        .account-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.05);
          color: white;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .account-btn:hover {
          background: rgba(99,102,241,0.2);
          border-color: rgba(139,92,246,0.5);
          box-shadow: 0 4px 16px rgba(99,102,241,0.2);
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>🏦 Dashboard</h1>
        <div style={{ position: 'relative' }}>
          <button
            className="account-btn"
            onClick={() => setShowProfileMenu(prev => !prev)}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.8rem',
              flexShrink: 0
            }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span>Account</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>▼</span>
          </button>

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 0.5rem)',
              background: '#1e1b4b',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              minWidth: '220px',
              zIndex: 100,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}>
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>Signed in as</div>
                <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: '600', wordBreak: 'break-all' }}>{user?.email}</div>
              </div>

              {[
                { label: '💳 Manage Subscription', action: () => window.location.href = '/subscription' },
                { label: '🔑 Change Password', action: () => window.location.href = '/reset-password' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { item.action(); setShowProfileMenu(false) }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {item.label}
                </button>
              ))}

              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  color: '#ff6b6b',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                🚪 Sign Out
              </button>
            </div>
          )}
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
          <div key={stat.label} className="stat-card">
            <span className="stat-icon">{stat.icon}</span>
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
              <div key={project.id} className="project-card">
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0' }}>{project.project_name}</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    {project.token_symbol} • {project.token_mint.slice(0, 8)}...
                  </p>
                </div>
                <button
                  className="manage-btn"
                  onClick={() => window.location.href = `/project/${project.id}`}
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