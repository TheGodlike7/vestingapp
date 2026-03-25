import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { WalletContextProvider } from './WalletProvider'
import { supabase } from './supabase'
import { Zap, Wallet, Inbox, TrendingUp } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
 
function ClaimPage() {
  const { publicKey } = useWallet()
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
 
  useEffect(() => {
    if (publicKey) fetchSchedules(publicKey.toBase58())
    else setSchedules([])
  }, [publicKey])
 
  const fetchSchedules = async (wallet: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('vesting_schedules')
      .select(`*, vesting_projects (project_name, token_symbol, token_mint)`)
      .eq('recipient_wallet', wallet).eq('is_active', true)
    if (data) setSchedules(data)
    setLoading(false)
  }
 
  const calculateVested = (schedule: any) => {
    const now = new Date()
    const start = new Date(schedule.start_date)
    const cliffEnd = new Date(start)
    cliffEnd.setMonth(cliffEnd.getMonth() + schedule.cliff_months)
    if (now < cliffEnd) return 0
    if (schedule.schedule_type === 'immediate') return schedule.total_amount
    const totalDuration = schedule.duration_months
    const elapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)
    const vestedMonths = Math.min(elapsed, totalDuration)
    return ((vestedMonths / totalDuration) * schedule.total_amount).toFixed(2)
  }
 
  const calculateCliffStatus = (schedule: any) => {
    const now = new Date()
    const start = new Date(schedule.start_date)
    const cliffEnd = new Date(start)
    cliffEnd.setMonth(cliffEnd.getMonth() + schedule.cliff_months)
    if (now < cliffEnd) {
      const daysLeft = Math.ceil((cliffEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return `Cliff ends in ${daysLeft} days`
    }
    return 'Cliff passed ✅'
  }
 
  return (
    <div className="min-h-screen relative" style={{ background: 'var(--gradient-hero)' }}>
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[hsl(271_100%_64%/0.12)] rounded-full blur-[100px] pointer-events-none" />
 
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-[hsl(265_40%_20%/0.5)]">
          <a href="/" className="flex items-center gap-2.5">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
              <Zap className="absolute inset-0 m-auto w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">
              Vesting<span className="gradient-text">App</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <WalletMultiButton />
          </div>
        </div>
 
        {/* Title */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Claim Tokens</h1>
          <p className="text-muted-foreground text-sm mt-1">View and claim your vested tokens</p>
        </div>
 
        {!publicKey ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-[hsl(271_100%_64%/0.2)]">
            <div className="w-20 h-20 rounded-2xl bg-[hsl(271_100%_64%/0.1)] border border-[hsl(271_100%_64%/0.2)] flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
              Connect your Solana wallet to view your vesting schedules and claim tokens
            </p>
            <WalletMultiButton />
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <div className="w-5 h-5 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            Loading your schedules...
          </div>
        ) : schedules.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-[hsl(265_40%_20%/0.5)]">
            <div className="w-20 h-20 rounded-2xl bg-[hsl(265_44%_15%/0.5)] border border-[hsl(265_40%_20%)] flex items-center justify-center mx-auto mb-6">
              <Inbox className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">No Vesting Schedules</h2>
            <p className="text-muted-foreground text-sm mb-2">No active vesting schedules found for your wallet</p>
            <p className="text-muted-foreground text-xs font-mono">
              {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => {
              const vested = calculateVested(schedule)
              const progress = ((Number(vested) / schedule.total_amount) * 100).toFixed(1)
              return (
                <div key={schedule.id} className="glass-card rounded-2xl p-6 border border-[hsl(265_40%_20%/0.5)]">
                  {/* Project Info */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground mb-1">
                        {schedule.vesting_projects?.project_name}
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        {schedule.schedule_type} vesting • Started {new Date(schedule.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[hsl(157_87%_51%/0.15)] text-[hsl(var(--accent))] border border-[hsl(157_87%_51%/0.3)]">
                      Active
                    </span>
                  </div>
 
                  {/* Token amounts */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: 'Total Allocated', value: `${schedule.total_amount}`, color: 'text-foreground' },
                      { label: 'Vested So Far', value: `${vested}`, color: 'text-[hsl(var(--primary))]' },
                      { label: 'Claimable Now', value: `${vested}`, color: 'text-[hsl(var(--accent))]' },
                    ].map(item => (
                      <div key={item.label} className="bg-[hsl(265_44%_15%/0.4)] border border-[hsl(265_40%_20%/0.5)] rounded-xl p-3 text-center">
                        <div className="text-muted-foreground text-xs mb-1">{item.label}</div>
                        <div className={`font-bold text-sm ${item.color}`}>
                          {item.value} <span className="text-muted-foreground text-xs">{schedule.vesting_projects?.token_symbol}</span>
                        </div>
                      </div>
                    ))}
                  </div>
 
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>{calculateCliffStatus(schedule)}</span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {progress}% vested
                      </span>
                    </div>
                    <div className="h-2 bg-[hsl(265_44%_15%)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${progress}%`,
                          background: 'var(--gradient-primary)',
                          boxShadow: '0 0 10px hsl(271 100% 64% / 0.4)'
                        }}
                      />
                    </div>
                  </div>
 
                  {/* Claim Button */}
                  <button
                    onClick={() => alert('Blockchain claim coming soon!')}
                    disabled={Number(vested) === 0}
                    className="w-full py-3.5 rounded-xl font-bold text-base transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: Number(vested) > 0 ? 'var(--gradient-primary)' : 'hsl(265 44% 15%)',
                      color: Number(vested) > 0 ? 'white' : 'hsl(215 20% 65%)',
                      boxShadow: Number(vested) > 0 ? 'var(--glow-purple)' : 'none'
                    }}
                  >
                    {Number(vested) > 0
                      ? `Claim ${vested} ${schedule.vesting_projects?.token_symbol}`
                      : 'Nothing to Claim Yet'
                    }
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
 
export default function App() {
  return (
    <WalletContextProvider>
      <ClaimPage />
    </WalletContextProvider>
  )
}