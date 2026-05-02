import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base'
import { ArrowLeft, Check, Zap } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { WalletContextProvider } from './WalletProvider'
import { supabase } from './supabase'
import { SubscriptionCheckoutModal } from './components/subscription/SubscriptionCheckoutModal'
import {
  SUBSCRIPTION_PAYMENT_CONFIG,
  formatUsdc,
  isAllowedSubscriptionWallet,
} from './payments/subscriptionPaymentConfig'
import { createSubscriptionPayment, cancelSubscriptionPayment } from './payments/subscriptionPaymentApi'
import { clearPaymentLock, readPaymentLock, writePaymentLock } from './payments/subscriptionPaymentLock'
import { submitSubscriptionPayment } from './payments/solanaSubscriptionPayment'
import type { PaymentTab, SubscriptionRecord, WalletOption } from './payments/subscriptionPaymentTypes'

const features = [
  'Up to 2 active projects',
  'Up to 100 recipients per project',
  'All 4 vesting templates',
  'Recipient self-serve claim portal',
  'Real-time vesting dashboard',
  'Solana devnet & mainnet support',
  'Email support (48hr response)',
  'Network fees paid by your wallet only',
]

type User = {
  id: string
}

function SubscriptionContent() {
  const {
    publicKey,
    wallets,
    wallet,
    select,
    connect,
    disconnect,
    connected,
    connecting,
    signTransaction,
  } = useWallet()
  const { connection } = useConnection()
  const [solPrice, setSolPrice] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutLocked, setCheckoutLocked] = useState(false)
  const [paymentTab, setPaymentTab] = useState<PaymentTab>('crypto')
  const [pendingWalletName, setPendingWalletName] = useState<string | null>(null)
  const checkoutGateRef = useRef(false)
  const paymentInFlightRef = useRef(false)

  const allowedWallets = useMemo(
    () => wallets.filter(({ adapter }) => isAllowedSubscriptionWallet(adapter.name)),
    [wallets],
  )

  const selectedWalletAllowed = isAllowedSubscriptionWallet(wallet?.adapter.name)
  const selectedWalletName = wallet?.adapter.name ?? ''
  const solAmount = solPrice > 0 ? (99 / solPrice).toFixed(4) : '0'
  const businessWalletConfigured = Boolean(SUBSCRIPTION_PAYMENT_CONFIG.businessWallet)

  const walletOptions = useMemo<WalletOption[]>(
    () =>
      allowedWallets.map(({ adapter, readyState }) => {
        const selected = selectedWalletName === adapter.name
        return {
          name: adapter.name,
          label: adapter.name,
          readyState,
          selected,
          connected: connected && selected,
          usable: readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable,
        }
      }),
    [allowedWallets, connected, selectedWalletName],
  )

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
      setSolPrice(Number(data.solana.usd))
    } catch {
      setSolPrice(180)
    }
  }

  const fetchSubscription = useCallback(async (): Promise<SubscriptionRecord | null> => {
    if (!user) return null

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('owner_id', user.id)
      .eq('status', 'active')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setSubscription(data ?? null)
    return data ?? null
  }, [user])

  useEffect(() => {
    const run = async () => {
      await fetchSolPrice()
      await checkSession()
    }
    run()
  }, [])

  useEffect(() => {
    if (!user) return

    clearExpiredLocalLock(user.id)

    const run = async () => {
      await fetchSubscription()
    }

    run()
  }, [fetchSubscription, user])

  useEffect(() => {
    if (!pendingWalletName || !wallet || wallet.adapter.name !== pendingWalletName || connected || connecting) {
      return
    }

    const run = async () => {
      try {
        await connect()
        setStatus('')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Wallet connection failed'
        setStatus('Error: Wallet connection failed: ' + message)
      } finally {
        setPendingWalletName(null)
      }
    }

    run()
  }, [connect, connected, connecting, pendingWalletName, wallet])

  function clearExpiredLocalLock(userId: string) {
    readPaymentLock(userId)
  }

  const resetCheckoutGate = () => {
    checkoutGateRef.current = false
    setCheckoutLocked(false)
  }

  const openCheckout = () => {
    if (checkoutGateRef.current) return
    checkoutGateRef.current = true
    setCheckoutLocked(true)
    setPaymentTab('crypto')
    setStatus('')
    setCheckoutOpen(true)
  }

  const closeCheckout = () => {
    if (loading) return
    setCheckoutOpen(false)
    setStatus('')
    resetCheckoutGate()
  }

  const handleSelectWallet = (walletName: WalletName) => {
    if (loading) return
    setStatus('')
    select(walletName)
    setPendingWalletName(String(walletName))
  }

  const waitForSubscriptionActivation = async (signature: string) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const activeSubscription = await fetchSubscription()

      if (activeSubscription?.transaction_signature === signature || activeSubscription?.status === 'active') {
        setStatus('Payment confirmed. Subscription is active.')
        return
      }
    }

    setStatus('Payment confirmed. Activation is still processing; refresh in a moment.')
  }

  const handlePayWithUSDC = async () => {
    if (paymentInFlightRef.current) return
    paymentInFlightRef.current = true
    setLoading(true)
    setStatus('Preparing subscription payment...')

    let paymentIdToCancel: string | null = null
    let signatureSubmitted = false

    try {
      if (!user?.id) throw new Error('You need to be signed in.')
      if (!publicKey) throw new Error('Connect an allowed wallet first.')
      if (!signTransaction) throw new Error('The selected wallet cannot sign this transaction.')
      if (!selectedWalletAllowed) {
        throw new Error('Use Phantom, Solflare, MetaMask, Binance, OKX, or Jupiter wallet.')
      }
      if (!businessWalletConfigured) throw new Error('Business wallet is not configured.')
      if (!Number.isFinite(SUBSCRIPTION_PAYMENT_CONFIG.amountUsdc) || SUBSCRIPTION_PAYMENT_CONFIG.amountUsdc <= 0) {
        throw new Error('Subscription amount is not configured.')
      }

      const activeLock = readPaymentLock(user.id)
      if (activeLock) {
        const expiresAt = new Date(activeLock.expiresAt).toLocaleTimeString()
        throw new Error(`A payment is already active until ${expiresAt}.`)
      }

      const intent = await createSubscriptionPayment(publicKey.toBase58())
      paymentIdToCancel = intent.paymentId
      writePaymentLock(user.id, intent)

      setStatus('Approve the subscription transaction in your wallet.')
      const signature = await submitSubscriptionPayment({
        connection,
        payer: publicKey,
        signTransaction,
        intent,
      })
      signatureSubmitted = true

      setStatus('Confirming subscription payment...')
      await waitForSubscriptionActivation(signature)
      clearPaymentLock(user.id)
      paymentIdToCancel = null
    } catch (err) {
      if (paymentIdToCancel && !signatureSubmitted && user?.id) {
        await cancelSubscriptionPayment(paymentIdToCancel).catch(() => undefined)
        clearPaymentLock(user.id)
      }

      const message = err instanceof Error ? err.message : 'Unknown error'
      setStatus('Error: ' + message)
    } finally {
      paymentInFlightRef.current = false
      setLoading(false)
    }
  }

  const daysRemaining = subscription
    ? Math.ceil((new Date(subscription.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--gradient-hero)' }}>
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-150 h-100 bg-[hsl(271_100%_64%/0.15)] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-[hsl(265_40%_20%/0.5)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              type="button"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <a href="/" className="flex items-center gap-2">
              <div className="relative w-7 h-7">
                <div className="absolute inset-0 rounded-lg bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
                <Zap className="absolute inset-0 m-auto w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-foreground hidden sm:block">
                Vesting<span className="gradient-text">App</span>
              </span>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {connected && selectedWalletAllowed ? (
              <button
                onClick={() => disconnect()}
                className="rounded-lg border border-[hsl(265_40%_24%)] bg-[hsl(265_40%_12%/0.7)] px-3 py-2 text-xs text-foreground hover:border-[hsl(var(--primary))]"
                type="button"
              >
                {selectedWalletName}
              </button>
            ) : (
              <span className="hidden sm:inline text-xs text-muted-foreground">Connect during checkout</span>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Subscription</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your VestingApp plan</p>
        </div>

        {subscription && (
          <div className="rounded-2xl p-6 border border-[hsl(157_87%_51%/0.3)] bg-[hsl(157_87%_51%/0.06)] mb-8">
            <h2 className="font-display text-lg font-semibold text-[hsl(var(--accent))] mb-4">Active Subscription</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Plan', value: 'Starter' },
                { label: 'Status', value: 'Active' },
                { label: 'Days Remaining', value: daysRemaining.toString() },
                { label: 'Renews', value: new Date(subscription.expires_at).toLocaleDateString() },
              ].map((item) => (
                <div key={item.label} className="glass-card rounded-xl p-3 text-center">
                  <div className="text-muted-foreground text-xs mb-1">{item.label}</div>
                  <div className="font-bold text-foreground text-sm">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-md mx-auto glass-card rounded-2xl p-8 border border-[hsl(271_100%_64%/0.3)] relative" style={{ boxShadow: 'var(--shadow-purple)' }}>
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-bold" style={{ background: 'var(--gradient-primary)', color: 'hsl(275 68% 5%)' }}>
              <Zap className="w-3 h-3" />
              Flat Fee - No % Cut
            </div>
          </div>

          <div className="text-center mb-8 mt-2">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Starter Plan</h2>
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="font-display text-5xl font-extrabold text-foreground">{SUBSCRIPTION_PAYMENT_CONFIG.priceLabel}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Crypto test charge: {formatUsdc(SUBSCRIPTION_PAYMENT_CONFIG.amountUsdc)} USDC
            </p>
            {solPrice > 0 && (
              <p className="text-muted-foreground text-sm">Approximately {solAmount} SOL at current price</p>
            )}
          </div>

          <div className="space-y-3 mb-8">
            {features.map((feature, i) => (
              <div key={feature} className="flex items-center gap-3 text-sm">
                <Check className={`w-4 h-4 shrink-0 ${i === features.length - 1 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--accent))]'}`} />
                {feature}
              </div>
            ))}
            <div className="flex items-center gap-3 text-sm font-bold">
              <Check className="w-4 h-4 shrink-0 text-[hsl(var(--primary))]" />
              <span style={{
                background: 'linear-gradient(90deg, #9945FF, #14F195, #00C2FF, #9945FF)',
                backgroundSize: '300% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'chromatic 6s linear infinite',
              }}>
                No percentage cut on tokens
              </span>
            </div>
          </div>

          <button
            onClick={openCheckout}
            disabled={checkoutLocked}
            className="w-full py-4 rounded-xl font-bold text-base text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: checkoutLocked ? 'rgba(99,102,241,0.5)' : 'var(--gradient-primary)', boxShadow: checkoutLocked ? 'none' : 'var(--glow-purple)' }}
            type="button"
          >
            {checkoutLocked ? 'Checkout opened' : 'Pay'}
          </button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            One checkout action at a time. Duplicate payment signatures are blocked server-side.
          </p>
        </div>
      </div>

      <SubscriptionCheckoutModal
        open={checkoutOpen}
        loading={loading}
        status={status}
        paymentTab={paymentTab}
        walletOptions={walletOptions}
        amountUsdc={SUBSCRIPTION_PAYMENT_CONFIG.amountUsdc}
        networkLabel={SUBSCRIPTION_PAYMENT_CONFIG.networkLabel}
        businessWalletConfigured={businessWalletConfigured}
        selectedWalletAllowed={selectedWalletAllowed}
        onClose={closeCheckout}
        onPaymentTabChange={setPaymentTab}
        onSelectWallet={handleSelectWallet}
        onPayWithUSDC={handlePayWithUSDC}
      />
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
