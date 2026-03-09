import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { createTransfer } from '@solana/pay'
import { PublicKey } from '@solana/web3.js'
import { WalletContextProvider } from './WalletProvider'
import { supabase } from './supabase'

const BUSINESS_WALLET = import.meta.env.VITE_BUSINESS_WALLET
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Mainnet USDC
const SUBSCRIPTION_AMOUNT_USD = 99

function SubscriptionContent() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [solPrice, setSolPrice] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [subscription, setSubscription] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchSolPrice()
    checkSession()
  }, [])

  useEffect(() => {
    if (user) fetchSubscription()
  }, [user])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/login'
      return
    }
    setUser(session.user)
  }

  const fetchSolPrice = async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      const data = await res.json()
      setSolPrice(data.solana.usd)
    } catch {
      setSolPrice(180) // fallback price
    }
  }

  const fetchSubscription = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('owner_id', user?.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) setSubscription(data)
  }

    const solAmount = solPrice > 0
       ? (SUBSCRIPTION_AMOUNT_USD / solPrice).toFixed(4)
       : '0'

  const handlePayWithUSDC = async () => {
    if (!publicKey) return
    setLoading(true)
    setStatus('Preparing transaction...')

    try {
      const recipient = new PublicKey(BUSINESS_WALLET)
      const splToken = new PublicKey(USDC_MINT)
      const amount = new (require('@solana/pay').BigNumber)(SUBSCRIPTION_AMOUNT_USD)

      const transaction = await createTransfer(connection, publicKey, {
        recipient,
        splToken,
        amount,
        memo: `vestingapp-starter-${user?.id?.slice(0, 8)}`
      })

      setStatus('Please approve in your wallet...')
      const signature = await sendTransaction(transaction, connection)

      setStatus('Confirming payment...')
      await connection.confirmTransaction(signature, 'confirmed')

      // Record in Supabase
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      await supabase.from('subscriptions').insert({
        owner_id: user.id,
        status: 'active',
        plan: 'starter',
        amount_usd: SUBSCRIPTION_AMOUNT_USD,
        transaction_signature: signature,
        expires_at: expiresAt.toISOString()
      })

      setStatus('✅ Payment confirmed! Subscription activated.')
      fetchSubscription()
    } catch (err: any) {
      setStatus('❌ Error: ' + err.message)
    }
    setLoading(false)
  }

  const daysRemaining = subscription
    ? Math.ceil((new Date(subscription.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

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
          <p
            onClick={() => window.location.href = '/dashboard'}
            style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', margin: '0 0 0.5rem 0', fontSize: '0.8rem' }}
          >
            ← Back to Dashboard
          </p>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>💳 Subscription</h1>
        </div>
        <WalletMultiButton />
      </div>

      {/* Active Subscription */}
      {subscription && (
        <div style={{
          background: 'rgba(81,207,102,0.1)',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid rgba(81,207,102,0.3)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#51cf66' }}>✅ Active Subscription</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Plan', value: 'Starter' },
              { label: 'Status', value: 'Active' },
              { label: 'Days Remaining', value: daysRemaining.toString() },
              { label: 'Renews', value: new Date(subscription.expires_at).toLocaleDateString() },
            ].map(item => (
              <div key={item.label} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{item.label}</div>
                <div style={{ fontWeight: '700' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Card */}
      <div style={{
        maxWidth: '480px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '2rem',
        border: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🚀</div>
        <h2 style={{ margin: '0 0 1rem 0' }}>Starter Plan</h2>
        <div style={{ fontSize: '2rem', fontWeight: '800', margin: '1rem 0' }}>
          $99<span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)' }}>/month</span>
        </div>

        {solPrice > 0 && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', marginBottom: '2rem' }}>
            ≈ {solAmount} SOL at current price
          </p>
        )}

        {/* Features */}
        <div style={{ textAlign: 'left', marginBottom: '2.5rem' }}>
          {[
            '✅ Up to 2 active projects',
            '✅ Up to 100 recipients',
            '✅ All 4 vesting templates',
            '✅ Recipient claim portal',
            '✅ Email support (48hr)',
            '✅ Network fees paid by your wallet',
          ].map(feature => (
            <div key={feature} style={{
              padding: '0.5rem 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              fontSize: '1rem'
            }}>
              {feature}
            </div>
          ))}
          <div style={{
            padding: '0.5rem 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            fontSize: '0.9rem',
            fontWeight: '700',
          }}>
            <span>✅ </span>
            <span style={{ 
              background: 'linear-gradient(90deg, #9945FF, #14F195, #00C2FF, #9945FF, #14F195, #9945FF)',
              backgroundSize: '300% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'chromatic 12s linear infinite',
              filter: 'drop-shadow(0 0 0.5px rgba(153,69,255,0.7))',
          }}>
            No percentage cut on tokens
          </span>
          </div>
        </div>

        <style>{`
          @keyframes chromatic {
            0% { background-position: 0% 50%; }
            100% { background-position: 300% 50%; }
          }
        `}</style>

        {status && (
          <p style={{
            color: status.includes('❌') ? '#ff6b6b' : '#51cf66',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {status}
          </p>
        )}

        {!publicKey ? (
          <div>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
              Connect your wallet to pay with USDC
            </p>
            <WalletMultiButton />
          </div>
        ) : (
          <button
            onClick={handlePayWithUSDC}
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '12px',
              border: 'none',
              background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Processing...' : `Pay $99 USDC`}
          </button>
        )}

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
          Payment processed on Solana network. Transaction fees paid by your wallet.
        </p>
      </div>
    </div>
  )
}

export function SubscriptionPage() {
  return (
    <WalletContextProvider>
      <SubscriptionContent />
    </WalletContextProvider>
  )
}