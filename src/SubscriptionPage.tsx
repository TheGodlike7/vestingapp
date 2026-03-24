import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { createTransfer } from '@solana/pay'
import { PublicKey } from '@solana/web3.js'
import { WalletContextProvider } from './WalletProvider'
import { supabase } from './supabase'
import { Zap, Check } from 'lucide-react'

const BUSINESS_WALLET = import.meta.env.VITE_BUSINESS_WALLET
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const SUBSCRIPTION_AMOUNT_USD = 99

function SubscriptionContent() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [solPrice, setSolPrice] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [subscription, setSubscription] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => { fetchSolPrice(); checkSession() }, [])
  useEffect(() => { if (user) fetchSubscription() }, [user])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    setUser(session.user)
  }

  const fetchSolPrice = async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      const data = await res.json()
      setSolPrice(data.solana.usd)
    } catch { setSolPrice(180) }
  }

  const fetchSubscription = async () => {
    const { data } = await supabase.from('subscriptions').select('*').eq('owner_id', user?.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single()
    if (data) setSubscription(data)
  }

  const solAmount = solPrice > 0 ? (SUBSCRIPTION_AMOUNT_USD / solPrice).toFixed(4) : '0'

  const handlePayWithUSDC = async () => {
    if (!publicKey) return
    setLoading(true)
    setStatus('Preparing transaction...')
    try {
      const recipient = new PublicKey(BUSINESS_WALLET)
      const splToken = new PublicKey(USDC_MINT)
      const amount = new (require('@solana/pay').BigNumber)(SUBSCRIPTION_AMOUNT_USD)
      const transaction = await createTransfer(connection, publicKey, { recipient, splToken, amount, memo: `vestingapp-starter-${user?.id?.slice(0, 8)}` })
      setStatus('Please approve in your wallet...')
      const signature = await sendTransaction(transaction, connection)
      setStatus('Confirming payment...')
      await connection.confirmTransaction(signature, 'confirmed')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)
      await supabase.from('subscriptions').insert({ owner_id: user.id, status: 'active', plan: 'starter', amount_usd: SUBSCRIPTION_AMOUNT_USD, transaction_signature: signature, expires_at: expiresAt.toISOString() })
      setStatus('✅ Payment confirmed! Subscription activated.')
      fetchSubscription()
    } catch (err: any) { setStatus('❌ Error: ' + err.message) }
    setLoading(false)
  }

  const daysRemaining = subscription ? Math.ceil((new Date(subscription.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0

  const features = [
    'Up to 2 active projects',
    'Up to 100 recipients',
    'All 4 vesting templates',
    'Recipient claim portal',
    'Email support (48hr)',
    'Network fees paid by your wallet',
  ]

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--gradient-hero)' }}>
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[hsl(271_100%_64%/0.15)] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-[hsl(265_40%_20%/0.5)]">
          <div>
            <button onClick={() => window.location.href = '/dashboard'} className="text-muted-foreground hover:text-foreground transition-colors text-sm mb-2 block">
              ← Back to Dashboard
            </button>
            <a href="/" className="flex items-center gap-2.5">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
                <Zap className="absolute inset-0 m-auto w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">
                Vesting<span className="gradient-text">App</span>
              </span>
            </a>
          </div>
          <WalletMultiButton />
        </div>

        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Subscription</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your VestingApp subscription</p>
        </div>

        {/* Active Subscription */}
        {subscription && (
          <div className="rounded-2xl p-6 border border-[hsl(157_87%_51%/0.3)] bg-[hsl(157_87%_51%/0.08)] mb-6">
            <h2 className="font-display text-lg font-semibold text-[hsl(var(--accent))] mb-4">✅ Active Subscription</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Plan', value: 'Starter' },
                { label: 'Status', value: 'Active' },
                { label: 'Days Left', value: daysRemaining.toString() },
                { label: 'Renews', value: new Date(subscription.expires_at).toLocaleDateString() },
              ].map(item => (
                <div key={item.label} className="bg-[hsl(265_44%_15%/0.5)] rounded-xl p-3 text-center border border-[hsl(265_40%_20%/0.5)]">
                  <div className="text-muted-foreground text-xs mb-1">{item.label}</div>
                  <div className="font-bold text-sm text-foreground">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Card */}
        <div className="glass-card rounded-2xl p-8 text-center relative">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-bold" style={{ background: 'var(--gradient-primary)', color: 'white' }}>
              <Zap className="w-3 h-3" />
              Flat Fee — No % Cut
            </div>
          </div>

          <div className="mb-6 mt-2">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Starter Plan</h2>
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="font-display text-5xl font-extrabold text-foreground">$99</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            {solPrice > 0 && (
              <p className="text-muted-foreground text-sm">≈ {solAmount} SOL at current price</p>
            )}
          </div>

          <div className="text-left mb-8 space-y-3">
            {features.map(feature => (
              <div key={feature} className="flex items-center gap-3 text-sm text-foreground py-2 border-b border-[hsl(265_40%_20%/0.3)]">
                <Check className="w-4 h-4 text-[hsl(var(--accent))] shrink-0" />
                {feature}
              </div>
            ))}
            <div className="flex items-center gap-3 py-2">
              <Check className="w-4 h-4 shrink-0" style={{ color: '#9945FF' }} />
              <span>
                <span style={{
                  background: 'linear-gradient(90deg, #9945FF, #14F195, #00C2FF, #9945FF, #14F195, #9945FF)',
                  backgroundSize: '300% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'chromatic 6s linear infinite',
                  fontWeight: '700',
                  fontSize: '0.9rem'
                }}>
                  No percentage cut on tokens
                </span>
              </span>
            </div>
          </div>

          {status && (
            <div className={`px-4 py-3 rounded-xl text-sm text-center mb-4 ${
              status.includes('❌')
                ? 'bg-[hsl(0_84%_60%/0.1)] border border-[hsl(0_84%_60%/0.3)] text-[hsl(0_84%_60%)]'
                : 'bg-[hsl(157_87%_51%/0.1)] border border-[hsl(157_87%_51%/0.3)] text-[hsl(var(--accent))]'
            }`}>
              {status}
            </div>
          )}

          {!publicKey ? (
            <div>
              <p className="text-muted-foreground text-sm mb-4">Connect your wallet to pay with USDC</p>
              <WalletMultiButton />
            </div>
          ) : (
            <button
              onClick={handlePayWithUSDC}
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-base text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              style={{ background: loading ? 'rgba(99,102,241,0.5)' : 'var(--gradient-primary)', boxShadow: loading ? 'none' : '0 0 20px hsl(271 100% 64% / 0.3)' }}
            >
              {loading ? 'Processing...' : 'Pay $99 USDC'}
            </button>
          )}
          <p className="text-muted-foreground text-xs">Payment processed on Solana. Transaction fees paid by your wallet.</p>
        </div>
      </div>
    </div>
  )
}

export function SubscriptionPage() {
  return <WalletContextProvider><SubscriptionContent /></WalletContextProvider>
}