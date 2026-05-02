export const SUBSCRIPTION_PAYMENT_CONFIG = {
  allowedWalletKeywords: ['phantom', 'solflare', 'metamask', 'binance', 'okx', 'jupiter'],
  businessWallet: import.meta.env.VITE_BUSINESS_WALLET as string | undefined,
  usdcMint: import.meta.env.VITE_USDC_MINT ?? 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  priceLabel: import.meta.env.VITE_SUBSCRIPTION_PRICE_LABEL ?? '$99',
  amountUsdc: Number(import.meta.env.VITE_SUBSCRIPTION_AMOUNT_USDC ?? '0.1'),
  networkLabel: import.meta.env.VITE_SOLANA_NETWORK ?? 'devnet',
  lockTtlMs: 15 * 60 * 1000,
} as const

export function isAllowedSubscriptionWallet(name?: string): boolean {
  if (!name) return false
  const normalized = name.toLowerCase()
  return SUBSCRIPTION_PAYMENT_CONFIG.allowedWalletKeywords.some((keyword) => normalized.includes(keyword))
}

export function formatUsdc(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: amount < 1 ? 1 : 0,
  }).format(amount)
}
