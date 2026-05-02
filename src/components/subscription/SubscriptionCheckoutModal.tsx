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
import { formatUsdc } from '@/payments/subscriptionPaymentConfig'

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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="max-w-xl border-[hsl(265_40%_24%)] bg-[hsl(265_35%_8%)] p-0 text-foreground shadow-2xl">
        <div className="border-b border-[hsl(265_40%_18%)] px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
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
                    Phantom, Solflare, MetaMask, Binance, OKX, and Jupiter wallet names are accepted.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 shrink-0 text-[hsl(var(--accent))]" />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {walletOptions.length > 0 ? (
                  walletOptions.map((walletOption) => (
                    <button
                      key={walletOption.label}
                      onClick={() => onSelectWallet(walletOption.name)}
                      disabled={loading || !walletOption.usable}
                      className={`flex items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition ${
                        walletOption.selected
                          ? 'border-[hsl(var(--accent))] bg-[hsl(157_87%_51%/0.08)]'
                          : 'border-[hsl(265_40%_22%)] bg-[hsl(265_30%_15%)] hover:border-[hsl(var(--primary))]'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                      type="button"
                    >
                      <span className="font-medium">{walletOption.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {walletOption.connected && walletOption.selected ? 'Connected' : walletOption.readyState}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="sm:col-span-2 rounded-lg border border-dashed border-[hsl(265_40%_24%)] p-4 text-sm text-muted-foreground">
                    No allowed wallet extension was detected in this browser.
                  </div>
                )}
              </div>
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
                <div className="flex gap-2 text-xs font-bold">
                  <span className="rounded bg-white px-2 py-1 text-slate-900">VISA</span>
                  <span className="rounded bg-white px-2 py-1 text-slate-900">MC</span>
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
