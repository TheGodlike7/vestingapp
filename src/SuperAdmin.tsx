import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Zap, Users, FolderOpen, Calendar, CheckCircle, LogOut } from 'lucide-react'

export function SuperAdmin() {
  const [, setUser] = useState<any>(null)
  const [owners, setOwners] = useState<any[]>([])
  const [stats, setStats] = useState({ totalOwners: 0, totalProjects: 0, totalSchedules: 0, activeSchedules: 0 })
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      checkSuperAdmin(session.user)
    })
  }, [])

  const checkSuperAdmin = async (authUser: any) => {
    const { data } = await supabase.from('project_owners').select('*').eq('id', authUser.id).single()
    if (!data?.is_super_admin) { setUnauthorized(true); setLoading(false); return }
    setUser(authUser)
    fetchOwners()
    fetchStats()
    setLoading(false)
  }

  const fetchOwners = async () => {
    const { data } = await supabase.from('project_owners').select('*').order('created_at', { ascending: false })
    if (data) setOwners(data)
  }

  const fetchStats = async () => {
    const [ownersRes, projectsRes, schedulesRes, activeRes] = await Promise.all([
      supabase.from('project_owners').select('id', { count: 'exact' }),
      supabase.from('vesting_projects').select('id', { count: 'exact' }),
      supabase.from('vesting_schedules').select('id', { count: 'exact' }),
      supabase.from('vesting_schedules').select('id', { count: 'exact' }).eq('is_active', true)
    ])
    setStats({ totalOwners: ownersRes.count || 0, totalProjects: projectsRes.count || 0, totalSchedules: schedulesRes.count || 0, activeSchedules: activeRes.count || 0 })
  }

  const toggleActive = async (ownerId: string, currentStatus: boolean) => {
    await supabase.from('project_owners').update({ is_active: !currentStatus }).eq('id', ownerId)
    fetchOwners()
  }

  const changePlan = async (ownerId: string, plan: string) => {
    await supabase.from('project_owners').update({ plan }).eq('id', ownerId)
    fetchOwners()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    </div>
  )

  if (unauthorized) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
      <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-4">
        <div className="text-5xl mb-4">⛔</div>
        <h2 className="font-display text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-sm mb-6">You don't have super admin privileges</p>
        <button onClick={() => window.location.href = '/dashboard'} className="btn-primary px-6 py-2.5 rounded-xl text-sm font-bold text-white">
          Go to Dashboard
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--gradient-hero)' }}>
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-[hsl(265_40%_20%/0.5)]">
          <div>
            <a href="/" className="flex items-center gap-2.5 mb-2">
              <div className="relative w-7 h-7">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
                <Zap className="absolute inset-0 m-auto w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-bold text-base text-foreground">
                Vesting<span className="gradient-text">App</span>
              </span>
            </a>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Super Admin</h1>
            <p className="text-muted-foreground text-sm mt-1">Platform control center</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[hsl(265_40%_20%)] text-muted-foreground hover:text-foreground hover:border-[hsl(var(--primary))] transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Clients', value: stats.totalOwners, icon: Users, color: 'text-[hsl(var(--primary))]' },
            { label: 'Total Projects', value: stats.totalProjects, icon: FolderOpen, color: 'text-[hsl(var(--accent))]' },
            { label: 'Total Schedules', value: stats.totalSchedules, icon: Calendar, color: 'text-[hsl(var(--primary))]' },
            { label: 'Active Schedules', value: stats.activeSchedules, icon: CheckCircle, color: 'text-[hsl(var(--accent))]' },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <stat.icon className={`w-6 h-6 mx-auto mb-3 ${stat.color} stat-icon`} />
              <div className={`text-2xl font-bold font-display mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-muted-foreground text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Clients Table */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-6">All Clients</h2>

          {owners.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No clients yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[hsl(265_40%_20%/0.5)]">
                    {['Email', 'Company', 'Plan', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => (
                    <tr key={owner.id} className="border-b border-[hsl(265_40%_20%/0.3)] hover:bg-[hsl(265_44%_15%/0.3)] transition-colors">
                      <td className="px-3 py-4 text-sm text-foreground">
                        {owner.email}
                        {owner.is_super_admin && (
                          <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-[hsl(45_100%_50%/0.2)] text-yellow-400">ADMIN</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-muted-foreground">{owner.company_name || '—'}</td>
                      <td className="px-3 py-4">
                        <select
                          value={owner.plan}
                          onChange={e => changePlan(owner.id, e.target.value)}
                          className="bg-[hsl(265_44%_15%)] border border-[hsl(265_40%_20%)] text-foreground rounded-lg px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-[hsl(var(--primary))]"
                        >
                          <option value="free">Free</option>
                          <option value="starter">Starter</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          owner.is_active
                            ? 'bg-[hsl(157_87%_51%/0.15)] text-[hsl(var(--accent))] border-[hsl(157_87%_51%/0.3)]'
                            : 'bg-[hsl(0_84%_60%/0.15)] text-[hsl(0_84%_60%)] border-[hsl(0_84%_60%/0.3)]'
                        }`}>
                          {owner.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-xs text-muted-foreground">{new Date(owner.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-4">
                        {!owner.is_super_admin && (
                          <button
                            onClick={() => toggleActive(owner.id, owner.is_active)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              owner.is_active
                                ? 'border-[hsl(0_84%_60%/0.4)] text-[hsl(0_84%_60%)] hover:bg-[hsl(0_84%_60%/0.1)]'
                                : 'border-[hsl(157_87%_51%/0.4)] text-[hsl(var(--accent))] hover:bg-[hsl(157_87%_51%/0.1)]'
                            }`}
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
    </div>
  )
}