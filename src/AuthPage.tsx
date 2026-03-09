import { useState } from 'react'
import { supabase } from './supabase'

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

  if (isLogin) {
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        padding: '2.5rem',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '420px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '0.5rem' }}>
          🔐 VestingApp
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '2rem' }}>
          {isLogin ? 'Welcome back' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Your company or project name"
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
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
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
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
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

          {message && (
            <p style={{
              color: message.includes('error') || message.includes('Error') ? '#ff6b6b' : '#51cf66',
              marginBottom: '1rem',
              textAlign: 'center',
              fontSize: '0.9rem'
            }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
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
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '1.5rem' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => setIsLogin(!isLogin)}
            style={{ color: '#8b5cf6', cursor: 'pointer', fontWeight: '600' }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  )
}