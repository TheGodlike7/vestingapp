import { useState } from 'react'
import { supabase } from './supabase'
import { Zap, KeyRound } from 'lucide-react'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMessage('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMessage(error.message)
    else {
      setMessage('✅ Password updated! Redirecting to login...')
      setTimeout(() => window.location.href = '/login', 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--gradient-hero)' }}>
      <div className="absolute inset-0 mesh-bg opacity-30" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-150 h-100 bg-[hsl(271_100%_64%/0.15)] rounded-full blur-[100px] pointer-events-none" />

      <a href="/login" className="absolute top-6 left-6 text-muted-foreground hover:text-foreground transition-colors text-sm">
        ← Back to Login
      </a>

      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div className="flex flex-col items-center mb-8">
          <a href="/" className="flex items-center gap-2.5 mb-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-xl bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
              <Zap className="absolute inset-0 m-auto w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-foreground">
              Vesting<span className="gradient-text">App</span>
            </span>
          </a>
          <div className="w-12 h-12 rounded-2xl bg-[hsl(271_100%_64%/0.1)] border border-[hsl(271_100%_64%/0.2)] flex items-center justify-center mb-3">
            <KeyRound className="w-6 h-6 text-[hsl(var(--primary))]" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">Set new password</h2>
          <p className="text-muted-foreground text-sm mt-1">Choose a strong password for your account</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                className="w-full px-4 py-3 rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_44%_15%/0.5)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
                className="w-full px-4 py-3 rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_44%_15%/0.5)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all"
              />
            </div>

            {message && (
              <div className={`px-4 py-3 rounded-xl text-sm text-center ${
                message.includes('✅')
                  ? 'bg-[hsl(157_87%_51%/0.1)] border border-[hsl(157_87%_51%/0.3)] text-[hsl(var(--accent))]'
                  : 'bg-[hsl(0_84%_60%/0.1)] border border-[hsl(0_84%_60%/0.3)] text-[hsl(0_84%_60%)]'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-base text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: loading ? 'rgba(99,102,241,0.5)' : 'var(--gradient-primary)', boxShadow: loading ? 'none' : '0 0 20px hsl(271 100% 64% / 0.3)' }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}