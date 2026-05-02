import type { PendingPaymentIntent } from './subscriptionPaymentTypes'

const PAYMENT_LOCK_PREFIX = 'vestingapp:subscription-payment'

type StoredPaymentLock = {
  paymentId: string
  userIdPrefix: string
  memo: string
  amountUsdc: number
  expiresAt: string
  createdAt: string
}

function lockKey(userId: string): string {
  return `${PAYMENT_LOCK_PREFIX}:${userId}`
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isStoredPaymentLock(value: unknown): value is StoredPaymentLock {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.paymentId === 'string' &&
    typeof candidate.userIdPrefix === 'string' &&
    typeof candidate.memo === 'string' &&
    typeof candidate.amountUsdc === 'number' &&
    typeof candidate.expiresAt === 'string' &&
    typeof candidate.createdAt === 'string'
  )
}

export function readPaymentLock(userId: string): StoredPaymentLock | null {
  if (!canUseLocalStorage()) return null

  const raw = window.localStorage.getItem(lockKey(userId))
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isStoredPaymentLock(parsed)) {
      window.localStorage.removeItem(lockKey(userId))
      return null
    }

    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(lockKey(userId))
      return null
    }

    return parsed
  } catch {
    window.localStorage.removeItem(lockKey(userId))
    return null
  }
}

export function writePaymentLock(userId: string, intent: PendingPaymentIntent): void {
  if (!canUseLocalStorage()) return

  const lock: StoredPaymentLock = {
    paymentId: intent.paymentId,
    userIdPrefix: intent.userIdPrefix,
    memo: intent.memo,
    amountUsdc: intent.amountUsdc,
    expiresAt: intent.expiresAt,
    createdAt: new Date().toISOString(),
  }

  window.localStorage.setItem(lockKey(userId), JSON.stringify(lock))
}

export function clearPaymentLock(userId: string): void {
  if (!canUseLocalStorage()) return
  window.localStorage.removeItem(lockKey(userId))
}
