import { supabase } from '@/supabase'
import type { CreateSubscriptionPaymentResponse, PendingPaymentIntent } from './subscriptionPaymentTypes'

function assertPendingPaymentIntent(value: PendingPaymentIntent): PendingPaymentIntent {
  if (!value.paymentId || !value.userIdPrefix || !value.memo || !value.expiresAt) {
    throw new Error('Payment intent response is incomplete.')
  }

  if (!Number.isFinite(value.amountUsdc) || value.amountUsdc <= 0) {
    throw new Error('Payment intent amount is invalid.')
  }

  return value
}

export async function createSubscriptionPayment(walletAddress: string): Promise<PendingPaymentIntent> {
  const { data, error } = await supabase.functions.invoke<CreateSubscriptionPaymentResponse>(
    'create-subscription-payment',
    {
      body: { walletAddress },
    },
  )

  if (error) {
    throw new Error(error.message || 'Unable to create subscription payment.')
  }

  if (!data?.payment) {
    throw new Error('Payment intent was not returned.')
  }

  return assertPendingPaymentIntent(data.payment)
}

export async function cancelSubscriptionPayment(paymentId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('cancel-subscription-payment', {
    body: { paymentId },
  })

  if (error) {
    throw new Error(error.message || 'Unable to cancel pending payment.')
  }
}
