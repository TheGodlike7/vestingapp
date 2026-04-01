/// <reference types="https://deno.land/x/edge_runtime@v1.36.0/index.d.ts" />
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUSINESS_WALLET = Deno.env.get('BUSINESS_WALLET')!
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const REQUIRED_AMOUNT = 99 * 1_000_000 // 99 USDC in micro-units
const HELIUS_SECRET = Deno.env.get('HELIUS_WEBHOOK_SECRET')!

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const signature = req.headers.get("authorization")

    if (!signature || signature !== HELIUS_SECRET) {
  return new Response("Unauthorized", { status: 401 })
}
    if (!tx.signature || !tx.tokenTransfers) continue
    if (transfer.tokenAmount < REQUIRED_AMOUNT) continue

    // Helius sends an array of transactions
    for (const tx of body) {
      const signature = tx.signature
      const memo = tx.description || ''

      // Check token transfers
      const tokenTransfers = tx.tokenTransfers || []

      for (const transfer of tokenTransfers) {
        const isUSDC = transfer.mint === USDC_MINT
        const isToUs = transfer.toUserAccount === BUSINESS_WALLET
        const isEnough = transfer.tokenAmount >= REQUIRED_AMOUNT

        if (isUSDC && isToUs && isEnough) {
          // Extract user ID from memo
          // memo format: vestingapp-starter-USERID
          const memoMatch = memo.match(/^vestingapp-starter-([a-zA-Z0-9]+)$/)

          if (memoMatch) {
            const userIdPrefix = memoMatch[1]

            // Find the user by ID prefix
            const { data: owners } = await supabase
              .from('project_owners')
              .select('id')
              .ilike('id', `${userIdPrefix}%`)
              .limit(1)

            if (owners && owners.length > 0) {
              const ownerId = owners[0].id

              // Check if this transaction was already processed
              const { data: existing } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('transaction_signature', signature)
                .single()

              if (!existing) {
                // Activate subscription
                const expiresAt = new Date()
                expiresAt.setDate(expiresAt.getDate() + 30)

                await supabase.from('subscriptions').insert({
                  owner_id: ownerId,
                  status: 'active',
                  plan: 'starter',
                  amount_usd: 99,
                  transaction_signature: signature,
                  expires_at: expiresAt.toISOString()
                })

                console.log(`✅ Subscription activated for user ${ownerId}`)
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Webhook error:', err)
    const error = err as Error
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})