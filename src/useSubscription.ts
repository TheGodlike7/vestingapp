import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useSubscription(userId: string | null) {
  const [isActive, setIsActive] = useState<boolean | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    checkSubscription(userId)
  }, [userId])

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

  return { isActive, subscription, loading }
}