import type { WalletName, WalletReadyState } from '@solana/wallet-adapter-base'

export type PaymentTab = 'crypto' | 'card'

export type PendingPaymentIntent = {
  paymentId: string
  userIdPrefix: string
  memo: string
  amountUsdc: number
  tokenMint: string
  businessWallet: string
  network: string
  expiresAt: string
  status: 'pending'
}

export type CreateSubscriptionPaymentResponse = {
  payment: PendingPaymentIntent
}

export type WalletOption = {
  name: WalletName
  label: string
  readyState: WalletReadyState
  selected: boolean
  connected: boolean
  usable: boolean
}

export type SubscriptionRecord = {
  id: string
  owner_id: string
  status: string
  plan: string
  amount_usd: number
  started_at: string
  expires_at: string
  transaction_signature?: string | null
}
