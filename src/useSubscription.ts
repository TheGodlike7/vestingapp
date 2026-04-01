import { useState, useEffect } from 'react'
import { supabase } from './supabase'

type Subscription = {
  id: string
  owner_id: string
  status: string
  plan: string
  amount_usd: number
  started_at: string
  expires_at: string
}

export function useSubscription(userId: string | null) {
  const [isActive, setIsActive] = useState<boolean | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(!!userId)
  const checkSubscription = async (id: string) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('owner_id', id)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setSubscription(data)
      setIsActive(true)
    } else {
      setIsActive(false)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) {
      return
    }
    const run = async () => await checkSubscription(userId)
    run()
  }, [userId])

  return { isActive, subscription, loading, canCreate: isActive === true, canModify: isActive === true }
}