import { useState } from 'react'
import { supabase } from './supabase'
import { useSubscription } from './useSubscription'

interface Props {
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export function CreateProjectModal({ userId, onClose, onSuccess }: Props) {
  const [projectName, setProjectName] = useState('')
  const [tokenMint, setTokenMint] = useState('')
  const [tokenSymbol, setTokenSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // ✅ Step 2.1: subscription hook
  const { canCreate } = useSubscription(userId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ Step 2.2: enforcement (CRITICAL)
    if (!canCreate) {
      setMessage('Subscription required to create projects')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase.from('vesting_projects').insert({
      owner_id: userId,
      project_name: projectName,
      token_mint: tokenMint,
      token_symbol: tokenSymbol.toUpperCase()
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      onSuccess()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        padding: '2rem',
        width: '100%',
        maxWidth: '480px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'white', margin: 0 }}>📁 Create New Project</h2>
          <span onClick={onClose} style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.5rem' }}>×</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="e.g. My Token Project"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>
              Token Symbol
            </label>
            <input
              type="text"
              value={tokenSymbol}
              onChange={e => setTokenSymbol(e.target.value)}
              placeholder="e.g. USDC, SOL, MYTOKEN"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>
              Token Mint Address
            </label>
            <input
              type="text"
              value={tokenMint}
              onChange={e => setTokenMint(e.target.value)}
              placeholder="Solana token mint address"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
              Find this in your token's Solana explorer page
            </p>
          </div>

          {message && (
            <p style={{ color: '#ff6b6b', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {message}
            </p>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.875rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.875rem',
                borderRadius: '8px',
                border: 'none',
                background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}