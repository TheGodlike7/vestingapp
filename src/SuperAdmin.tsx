import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function SuperAdmin() {
  const [, setUser] = useState<any>(null)
  const [owners, setOwners] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalOwners: 0,
    totalProjects: 0,
    totalSchedules: 0,
    activeSchedules: 0
  })
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/login'
        return
      }
      checkSuperAdmin(session.user)
    })
  }, [])

  const checkSuperAdmin = async (authUser: any) => {
    const { data } = await supabase
      .from('project_owners')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!data?.is_super_admin) {
      setUnauthorized(true)
      setLoading(false)
      return
    }

    setUser(authUser)
    fetchOwners()
    fetchStats()
    setLoading(false)
  }

  const fetchOwners = async () => {
    const { data } = await supabase
      .from('project_owners')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setOwners(data)
  }

  const fetchStats = async () => {
    const [ownersRes, projectsRes, schedulesRes, activeRes] = await Promise.all([
      supabase.from('project_owners').select('id', { count: 'exact' }),
      supabase.from('vesting_projects').select('id', { count: 'exact' }),
      supabase.from('vesting_schedules').select('id', { count: 'exact' }),
      supabase.from('vesting_schedules').select('id', { count: 'exact' }).eq('is_active', true)
    ])
    setStats({
      totalOwners: ownersRes.count || 0,
      totalProjects: projectsRes.count || 0,
      totalSchedules: schedulesRes.count || 0,
      activeSchedules: activeRes.count || 0
    })
  }

  const toggleActive = async (ownerId: string, currentStatus: boolean) => {
    await supabase
      .from('project_owners')
      .update({ is_active: !currentStatus })
      .eq('id', ownerId)
    fetchOwners()
  }

  const changePlan = async (ownerId: string, plan: string) => {
    await supabase
      .from('project_owners')
      .update({ plan })
      .eq('id', ownerId)
    fetchOwners()
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

  if (unauthorized) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      color: 'white',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ fontSize: '4rem' }}>⛔</div>
      <h2>Access Denied</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>You don't have super admin privileges</p>
      <button
        onClick={() => window.location.href = '/dashboard'}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        Go to Dashboard
      </button>
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
          <h1 style={{ margin: 0 }}>⚡ Super Admin</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.5)' }}>
            Platform control center
          </p>
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
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

      {/* Platform Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {[
          { label: 'Total Clients', value: stats.totalOwners, icon: '👥' },
          { label: 'Total Projects', value: stats.totalProjects, icon: '📁' },
          { label: 'Total Schedules', value: stats.totalSchedules, icon: '📅' },
          { label: 'Active Schedules', value: stats.activeSchedules, icon: '✅' },
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

      {/* Clients Table */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '2rem',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{ margin: '0 0 1.5rem 0' }}>All Clients</h2>

        {owners.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
            No clients yet
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {['Email', 'Company', 'Plan', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left',
                      padding: '0.75rem',
                      color: 'rgba(255,255,255,0.5)',
                      fontWeight: '600',
                      fontSize: '0.85rem'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0.75rem', fontSize: '0.9rem' }}>
                      {owner.email}
                      {owner.is_super_admin && (
                        <span style={{
                          marginLeft: '0.5rem',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          background: 'rgba(255,215,0,0.2)',
                          color: 'gold',
                          fontSize: '0.7rem'
                        }}>ADMIN</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 0.75rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                      {owner.company_name || '—'}
                    </td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      <select
                        value={owner.plan}
                        onChange={e => changePlan(owner.id, e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: 'white',
                          borderRadius: '6px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        background: owner.is_active ? 'rgba(81,207,102,0.2)' : 'rgba(255,107,107,0.2)',
                        color: owner.is_active ? '#51cf66' : '#ff6b6b',
                        fontSize: '0.8rem'
                      }}>
                        {owner.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.75rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                      {new Date(owner.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      {!owner.is_super_admin && (
                        <button
                          onClick={() => toggleActive(owner.id, owner.is_active)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'transparent',
                            color: owner.is_active ? '#ff6b6b' : '#51cf66',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          {owner.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}