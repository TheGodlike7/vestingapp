import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { WalletContextProvider } from './WalletProvider'
import { supabase } from './supabase'

function ClaimPage() {
  const { publicKey } = useWallet()
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (publicKey) {
      fetchSchedules(publicKey.toBase58())
    } else {
      setSchedules([])
    }
  }, [publicKey])

  const fetchSchedules = async (wallet: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('vesting_schedules')
      .select(`
        *,
        vesting_projects (
          project_name,
          token_symbol,
          token_mint
        )
      `)
      .eq('recipient_wallet', wallet)
      .eq('is_active', true)
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
          <h1 style={{ margin: 0 }}>🔓 VestingApp</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.5)' }}>
            Claim your vested tokens
          </p>
        </div>
        <WalletMultiButton />
      </div>

      {!publicKey ? (
        <div style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👛</div>
          <h2>Connect Your Wallet</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
            Connect your Phantom wallet to see your vesting schedules
          </p>
          <WalletMultiButton />
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
          Loading your schedules...
        </div>
      ) : schedules.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
          <h2>No Vesting Schedules Found</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>
            No active vesting schedules found for your wallet.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
            Connected: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {schedules.map((schedule) => {
            const vested = calculateVested(schedule)
            const progress = ((Number(vested) / schedule.total_amount) * 100).toFixed(1)

            return (
              <div key={schedule.id} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '2rem',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {/* Project Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ margin: '0 0 0.25rem 0' }}>
                      {schedule.vesting_projects?.project_name}
                    </h2>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                      {schedule.schedule_type} vesting • Started {new Date(schedule.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    background: 'rgba(81,207,102,0.2)',
                    color: '#51cf66',
                    fontSize: '0.8rem'
                  }}>
                    Active
                  </span>
                </div>

                {/* Token amounts */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  {[
                    { label: 'Total Allocated', value: `${schedule.total_amount} ${schedule.vesting_projects?.token_symbol}` },
                    { label: 'Vested So Far', value: `${vested} ${schedule.vesting_projects?.token_symbol}` },
                    { label: 'Claimable Now', value: `${vested} ${schedule.vesting_projects?.token_symbol}` },
                  ].map(item => (
                    <div key={item.label} style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '1rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{item.label}</div>
                      <div style={{ fontWeight: '700', fontSize: '1rem' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                      {calculateCliffStatus(schedule)}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                      {progress}% vested
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      borderRadius: '999px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                {/* Claim Button */}
                <button
                  onClick={() => alert('Blockchain claim coming soon! This will trigger the Solana transaction.')}
                  disabled={Number(vested) === 0}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: Number(vested) > 0
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : 'rgba(255,255,255,0.1)',
                    color: Number(vested) > 0 ? 'white' : 'rgba(255,255,255,0.3)',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: Number(vested) > 0 ? 'pointer' : 'not-allowed'
                  }}
                >
                  {Number(vested) > 0 ? `Claim ${vested} ${schedule.vesting_projects?.token_symbol}` : 'Nothing to Claim Yet'}
                </button>
              </div>
            )
          })}
        </div>
      )}
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