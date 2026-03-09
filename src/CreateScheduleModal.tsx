import { useState } from 'react'
import { supabase } from './supabase'

interface Props {
  projectId: string
  tokenSymbol: string
  onClose: () => void
  onSuccess: () => void
}

export function CreateScheduleModal({ projectId, tokenSymbol, onClose, onSuccess }: Props) {
  const [recipientWallet, setRecipientWallet] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [cliffMonths, setCliffMonths] = useState('0')
  const [durationMonths, setDurationMonths] = useState('12')
  const [scheduleType, setScheduleType] = useState('linear')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const applyTemplate = (template: string) => {
    switch(template) {
      case 'advisor':
        setCliffMonths('6')
        setDurationMonths('24')
        setScheduleType('linear')
        break
      case 'employee':
        setCliffMonths('12')
        setDurationMonths('48')
        setScheduleType('linear')
        break
      case 'investor':
        setCliffMonths('0')
        setDurationMonths('1')
        setScheduleType('immediate')
        break
      case 'custom':
        setCliffMonths('0')
        setDurationMonths('12')
        setScheduleType('stepped')
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.from('vesting_schedules').insert({
      project_id: projectId,
      recipient_wallet: recipientWallet,
      total_amount: parseFloat(totalAmount),
      start_date: new Date(startDate).toISOString(),
      cliff_months: parseInt(cliffMonths),
      duration_months: parseInt(durationMonths),
      schedule_type: scheduleType,
      is_active: true
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      onSuccess()
      onClose()
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: '1rem',
    boxSizing: 'border-box' as const
  }

  const labelStyle = {
    color: 'rgba(255,255,255,0.7)',
    display: 'block' as const,
    marginBottom: '0.5rem',
    fontSize: '0.9rem'
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      overflowY: 'auto',
      padding: '2rem'
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        padding: '2rem',
        width: '100%',
        maxWidth: '520px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'white', margin: 0 }}>📅 Add Vesting Schedule</h2>
          <span onClick={onClose} style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.5rem' }}>×</span>
        </div>

        {/* Templates */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Quick Templates</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {[
              { key: 'advisor', label: '🤝 Advisor', desc: '6mo cliff, 24mo' },
              { key: 'employee', label: '👨‍💼 Employee', desc: '12mo cliff, 48mo' },
              { key: 'investor', label: '💰 Investor', desc: 'Immediate' },
              { key: 'custom', label: '⚙️ Custom', desc: 'Stepped vesting' },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => applyTemplate(t.key)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Recipient Wallet Address</label>
            <input
              type="text"
              value={recipientWallet}
              onChange={e => setRecipientWallet(e.target.value)}
              placeholder="Solana wallet address"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Total Amount ({tokenSymbol})</label>
            <input
              type="number"
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
              placeholder="e.g. 10000"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Cliff Period (months)</label>
              <input
                type="number"
                value={cliffMonths}
                onChange={e => setCliffMonths(e.target.value)}
                min="0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Total Duration (months)</label>
              <input
                type="number"
                value={durationMonths}
                onChange={e => setDurationMonths(e.target.value)}
                min="1"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Vesting Type</label>
            <select
              value={scheduleType}
              onChange={e => setScheduleType(e.target.value)}
              style={inputStyle}
            >
              <option value="linear">Linear — equal amounts each period</option>
              <option value="stepped">Stepped — custom unlock dates</option>
              <option value="immediate">Immediate — all at once</option>
            </select>
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
              {loading ? 'Creating...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}