import { useMemo, useState } from 'react'
import { ArrowLeft, CreditCard, Loader2, LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react'
import type { WalletName } from '@solana/wallet-adapter-base'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PaymentTab, WalletOption } from '@/payments/subscriptionPaymentTypes'
import { formatUsdc, isPrimarySubscriptionWallet } from '@/payments/subscriptionPaymentConfig'

function WalletBrandIcon({ icon, label }: { icon: string; label: string }) {
  if (icon) {
    return (
      <img
        src={icon}
        alt=""
        className="h-6 w-6 shrink-0 rounded-md object-contain"
        loading="lazy"
      />
    )
  }

  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(265_44%_20%)] text-xs font-bold text-foreground">
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}

function WalletOptionButton({
  walletOption,
  loading,
  onSelectWallet,
}: {
  walletOption: WalletOption
  loading: boolean
  onSelectWallet: (walletName: WalletName) => void
}) {
  return (
    <button
      onClick={() => onSelectWallet(walletOption.name)}
      disabled={loading || !walletOption.usable}
      className={`flex items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition ${
        walletOption.selected
          ? 'border-[hsl(var(--accent))] bg-[hsl(157_87%_51%/0.08)]'
          : 'border-[hsl(265_40%_22%)] bg-[hsl(265_30%_15%)] hover:border-[hsl(var(--primary))]'
      } disabled:cursor-not-allowed disabled:opacity-50`}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-2">
        <WalletBrandIcon icon={walletOption.icon} label={walletOption.label} />
        <span className="truncate font-medium">{walletOption.label}</span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {walletOption.connected && walletOption.selected ? 'Connected' : walletOption.readyState}
      </span>
    </button>
  )
}

function VisaLogo() {
  return (
    <svg viewBox="0 0 40 24" className="h-6 w-10 shrink-0" aria-label="Visa">
      <rect width="40" height="24" rx="4" fill="white" />
      <path d="M15.1 15.8h-2.3l1.4-7.5h2.3l-1.4 7.5Zm8.2-7.3a5.9 5.9 0 0 0-2-.35c-2.2 0-3.8 1.03-3.8 2.5 0 1.1 1.08 1.7 1.9 2.07.85.39 1.14.64 1.13.99 0 .54-.74.79-1.43.79-.95 0-1.46-.13-2.25-.43l-.3-.13-.34 1.82c.53.21 1.5.4 2.5.41 2.35 0 3.9-1.02 3.92-2.6.01-.86-.58-1.52-1.88-2.07-.78-.35-1.26-.58-1.26-.94 0-.32.4-.66 1.29-.66.78-.01 1.34.15 1.78.31l.21.09.33-1.76Zm5.94-.2h-1.8c-.56 0-.98.14-1.22.68l-3.48 6.82h2.46l.49-1.18h3l.28 1.18h2.17L29.24 8.3Zm-2.88 4.72 1.22-2.86.7 2.86h-1.92ZM10.85 8.3l-2.25 5.1-.24-1.08c-.42-1.23-1.72-2.56-3.18-3.22l2.06 6.69h2.48l3.62-7.49h-2.5Z" fill="#1434CB" />
    </svg>
  )
}

function MastercardLogo() {
  return (
    <svg viewBox="0 0 40 24" className="h-6 w-10 shrink-0" aria-label="Mastercard">
      <rect width="40" height="24" rx="4" fill="white" />
      <circle cx="16" cy="12" r="6.2" fill="#EB001B" />
      <circle cx="24" cy="12" r="6.2" fill="#F79E1B" fillOpacity="0.92" />
      <path d="M20 7.24a6.18 6.18 0 0 1 0 9.52 6.18 6.18 0 0 1 0-9.52Z" fill="#FF5F00" />
    </svg>
  )
}

type SubscriptionCheckoutModalProps = {
  open: boolean
  loading: boolean
  status: string
  paymentTab: PaymentTab
  walletOptions: WalletOption[]
  amountUsdc: number
  networkLabel: string
  businessWalletConfigured: boolean
  selectedWalletAllowed: boolean
  onClose: () => void
  onPaymentTabChange: (tab: PaymentTab) => void
  onSelectWallet: (walletName: WalletName) => void
  onPayWithUSDC: () => void
}

export function SubscriptionCheckoutModal({
  open,
  loading,
  status,
  paymentTab,
  walletOptions,
  amountUsdc,
  networkLabel,
  businessWalletConfigured,
  selectedWalletAllowed,
  onClose,
  onPaymentTabChange,
  onSelectWallet,
  onPayWithUSDC,
}: SubscriptionCheckoutModalProps) {
  const paymentDisabled = loading || !selectedWalletAllowed || !businessWalletConfigured
  const [showOtherWallets, setShowOtherWallets] = useState(false)
  const primaryWalletOptions = useMemo(
    () => walletOptions.filter((walletOption) => isPrimarySubscriptionWallet(walletOption.label)),
    [walletOptions],
  )
  const otherWalletOptions = useMemo(
    () => walletOptions.filter((walletOption) => !isPrimarySubscriptionWallet(walletOption.label)),
    [walletOptions],
  )

  const handleClose = () => {
    setShowOtherWallets(false)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose()
      }}
    >
      <DialogContent className="max-w-xl border-[hsl(265_40%_24%)] bg-[hsl(265_35%_8%)] p-0 text-foreground shadow-2xl">
        <div className="border-b border-[hsl(265_40%_18%)] px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(265_30%_16%)] text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Back to subscription"
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <DialogTitle className="font-display text-xl">Starter subscription checkout</DialogTitle>
              <DialogDescription>
                Choose one payment method for this monthly subscription.
              </DialogDescription>
            </div>
          </div>
        </div>

        <Tabs value={paymentTab} onValueChange={(value) => onPaymentTabChange(value as PaymentTab)} className="px-6 pb-6">
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-none border-b border-[hsl(265_40%_18%)] bg-transparent p-0">
            <TabsTrigger value="crypto" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent))] data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <WalletCards className="mr-2 h-4 w-4" />
              Crypto wallet
            </TabsTrigger>
            <TabsTrigger value="card" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent))] data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <CreditCard className="mr-2 h-4 w-4" />
              Card
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crypto" className="mt-6 space-y-5">
            <div className="rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_30%_12%/0.9)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">Connect a subscription wallet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Phantom and Solflare stay upfront. Other Wallets reveals compatible modern wallets detected in this browser.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 shrink-0 text-[hsl(var(--accent))]" />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {primaryWalletOptions.map((walletOption) => (
                  <WalletOptionButton
                    key={walletOption.label}
                    walletOption={walletOption}
                    loading={loading}
                    onSelectWallet={onSelectWallet}
                  />
                ))}

                <button
                  onClick={() => setShowOtherWallets((current) => !current)}
                  className="flex items-center justify-between rounded-lg border border-[hsl(265_40%_22%)] bg-[hsl(265_30%_15%)] px-3 py-3 text-left text-sm transition hover:border-[hsl(var(--primary))]"
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <WalletBrandIcon icon="" label="Other Wallets" />
                    <span className="truncate font-medium">Other Wallets</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {showOtherWallets ? 'Hide' : otherWalletOptions.length > 0 ? `${otherWalletOptions.length} detected` : 'View'}
                  </span>
                </button>
              </div>

              {showOtherWallets && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {otherWalletOptions.length > 0 ? (
                    otherWalletOptions.map((walletOption) => (
                      <WalletOptionButton
                        key={walletOption.label}
                        walletOption={walletOption}
                        loading={loading}
                        onSelectWallet={onSelectWallet}
                      />
                    ))
                  ) : (
                  <div className="sm:col-span-2 rounded-lg border border-dashed border-[hsl(265_40%_24%)] p-4 text-sm text-muted-foreground">
                    No other supported Wallet Standard wallet was detected in this browser.
                  </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_30%_12%/0.9)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Subscription charge</p>
                  <p className="mt-1 font-display text-2xl font-bold">{formatUsdc(amountUsdc)} USDC</p>
                </div>
                <LockKeyhole className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <span>Network: {networkLabel}</span>
                <span>Memo required by webhook</span>
              </div>
            </div>

            {!businessWalletConfigured && (
              <div className="rounded-xl border border-[hsl(0_84%_60%/0.35)] bg-[hsl(0_84%_60%/0.1)] px-4 py-3 text-sm text-[hsl(0_84%_70%)]">
                Business wallet is not configured.
              </div>
            )}

            {status && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                status.startsWith('Error')
                  ? 'border-[hsl(0_84%_60%/0.35)] bg-[hsl(0_84%_60%/0.1)] text-[hsl(0_84%_70%)]'
                  : 'border-[hsl(157_87%_51%/0.28)] bg-[hsl(157_87%_51%/0.08)] text-[hsl(var(--accent))]'
              }`}>
                {status}
              </div>
            )}

            <button
              onClick={onPayWithUSDC}
              disabled={paymentDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--gradient-primary)', boxShadow: loading ? 'none' : 'var(--glow-purple)' }}
              type="button"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Processing subscription payment' : `Pay ${formatUsdc(amountUsdc)} USDC`}
            </button>
          </TabsContent>

          <TabsContent value="card" className="mt-6 space-y-5">
            <div className="rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_30%_12%/0.9)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">Card subscription</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Visa and Mastercard checkout can be connected when Stripe is configured.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <VisaLogo />
                  <MastercardLogo />
                </div>
              </div>
              <button
                disabled
                className="mt-5 w-full rounded-xl border border-[hsl(265_40%_24%)] bg-[hsl(265_20%_18%)] py-4 font-bold text-muted-foreground disabled:cursor-not-allowed"
                type="button"
              >
                Stripe checkout not connected
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
