type SubscriptionPaymentConfig = {
  allowedWalletKeywords: readonly string[]
  businessWallet: string | undefined
  usdcMint: string
  priceLabel: string
  amountUsdc: number
  networkLabel: string
  lockTtlMs: number
  claimsEnabled: boolean
}

type SubscriptionNetwork = 'mainnet-beta' | 'devnet'

function readNetwork(): SubscriptionNetwork {
  return import.meta.env.VITE_SOLANA_NETWORK?.toLowerCase() === 'devnet' ? 'devnet' : 'mainnet-beta'
}

function amountForNetwork(network: SubscriptionNetwork): number {
  return network === 'devnet' ? 0.1 : 99
}

const networkLabel = readNetwork()
const CLAIMS_HAVE_SECURE_ONCHAIN_PATH = false
const PRIMARY_SUBSCRIPTION_WALLET_KEYWORDS = ['phantom', 'solflare'] as const

export const SUBSCRIPTION_PAYMENT_CONFIG: SubscriptionPaymentConfig = {
  allowedWalletKeywords: ['phantom', 'solflare', 'metamask', 'binance', 'okx', 'jupiter'],
  businessWallet: import.meta.env.VITE_BUSINESS_WALLET as string | undefined,
  usdcMint: import.meta.env.VITE_USDC_MINT ?? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  priceLabel: import.meta.env.VITE_SUBSCRIPTION_PRICE_LABEL ?? '$99',
  amountUsdc: amountForNetwork(networkLabel),
  networkLabel,
  lockTtlMs: 15 * 60 * 1000,
  claimsEnabled: CLAIMS_HAVE_SECURE_ONCHAIN_PATH && import.meta.env.VITE_CLAIMS_ENABLED === 'true',
}

export function isAllowedSubscriptionWallet(name?: string): boolean {
  if (!name) return false
  const normalized = name.toLowerCase()
  return SUBSCRIPTION_PAYMENT_CONFIG.allowedWalletKeywords.some((keyword) => normalized.includes(keyword))
}

export function isPrimarySubscriptionWallet(name?: string): boolean {
  if (!name) return false
  const normalized = name.toLowerCase()
  return PRIMARY_SUBSCRIPTION_WALLET_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

export function formatUsdc(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Not configured'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: amount < 1 ? 1 : 0,
  }).format(amount)
}
