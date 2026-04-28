import { useState } from 'react'
import { supabase } from './supabase'
import { Zap } from 'lucide-react'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) setMessage(error.message)
      else setMessage('✅ Password reset email sent! Check your inbox.')
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = '/dashboard'
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { company_name: companyName } }
      })
      if (error) setMessage(error.message)
      else setMessage('Check your email to confirm your account!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--gradient-hero)' }}>

      {/* Background effects */}
      <div className="absolute inset-0 mesh-bg opacity-30" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-150 h-100 bg-[hsl(271_100%_64%/0.15)] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-75 h-75 bg-[hsl(157_87%_51%/0.08)] rounded-full blur-[80px] pointer-events-none" />

      {/* Back to home */}
      <a href="/" className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
        ← Back to Home
      </a>

      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <a href="/" className="flex items-center gap-2.5 mb-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-xl bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
              <div className="absolute inset-0 rounded-xl bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] blur-md opacity-50" />
              <Zap className="absolute inset-0 m-auto w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-foreground">
              Vesting<span className="gradient-text">App</span>
            </span>
          </a>
          <h2 className="font-display text-xl font-semibold text-foreground">
            {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === 'login' ? 'Sign in to manage your vesting schedules' : mode === 'signup' ? 'Start managing token vesting on Solana' : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company / Project Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Your company or project name"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_44%_15%/0.5)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_44%_15%/0.5)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_44%_15%/0.5)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all"
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <span
                  onClick={() => { setMode('forgot'); setMessage('') }}
                  className="text-sm text-[hsl(var(--primary))] cursor-pointer hover:underline"
                >
                  Forgot password?
                </span>
              </div>
            )}

            {message && (
              <div className={`px-4 py-3 rounded-xl text-sm text-center ${
                message.includes('✅') || (!message.toLowerCase().includes('error') && !message.toLowerCase().includes('invalid'))
                  ? 'bg-[hsl(157_87%_51%/0.1)] border border-[hsl(157_87%_51%/0.3)] text-[hsl(var(--accent))]'
                  : 'bg-[hsl(0_84%_60%/0.1)] border border-[hsl(0_84%_60%/0.3)] text-[hsl(0_84%_60%)]'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? 'rgba(99,102,241,0.5)' : 'var(--gradient-primary)',
                color: 'white',
                boxShadow: loading ? 'none' : '0 0 20px hsl(271 100% 64% / 0.3)'
              }}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'forgot' ? (
              <>
                Remember it?{' '}
                <span onClick={() => { setMode('login'); setMessage('') }} className="text-[hsl(var(--primary))] cursor-pointer font-semibold hover:underline">
                  Sign In
                </span>
              </>
            ) : mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <span onClick={() => { setMode('signup'); setMessage('') }} className="text-[hsl(var(--primary))] cursor-pointer font-semibold hover:underline">
                  Sign Up
                </span>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <span onClick={() => { setMode('login'); setMessage('') }} className="text-[hsl(var(--primary))] cursor-pointer font-semibold hover:underline">
                  Sign In
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}