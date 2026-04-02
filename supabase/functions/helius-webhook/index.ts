import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUSINESS_WALLET = Deno.env.get('BUSINESS_WALLET')!
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const REQUIRED_AMOUNT = 99 * 1_000_000
const HELIUS_SECRET = Deno.env.get('HELIUS_WEBHOOK_SECRET')!

Deno.serve(async (req: Request) => {
  try {
    // 🔐 Verify webhook
    const authHeader = req.headers.get('authorization')

    if (!authHeader || authHeader !== HELIUS_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // ✅ Ensure body is array
    if (!Array.isArray(body)) {
      return new Response('Invalid payload', { status: 400 })
    }

    for (const tx of body) {
      // ✅ Validate tx
      if (!tx?.signature || !tx?.tokenTransfers) continue

      const txSignature = tx.signature
      const memo = tx.description || ''
      const tokenTransfers = tx.tokenTransfers

      for (const transfer of tokenTransfers) {
        // ✅ Validate transfer
        if (!transfer?.tokenAmount) continue

        const isUSDC = transfer.mint === USDC_MINT
        const isToUs = transfer.toUserAccount === BUSINESS_WALLET
        const isEnough = transfer.tokenAmount >= REQUIRED_AMOUNT

        if (!(isUSDC && isToUs && isEnough)) continue

        // ✅ Strict memo validation
        const memoMatch = memo.match(/^vestingapp-starter-([a-zA-Z0-9]+)$/)
        if (!memoMatch) continue

        const userIdPrefix = memoMatch[1]

        // 🔍 Find user
        const { data: owners } = await supabase
          .from('project_owners')
          .select('id')
          .ilike('id', `${userIdPrefix}%`)
          .limit(1)

        if (!owners || owners.length === 0) continue

        const ownerId = owners[0].id

        // 🔁 Idempotency check
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('transaction_signature', txSignature)
          .maybeSingle()

        if (existing) continue

        // ✅ Activate subscription
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

        await supabase.from('subscriptions').insert({
          owner_id: ownerId,
          status: 'active',
          plan: 'starter',
          amount_usd: 99,
          transaction_signature: txSignature,
          expires_at: expiresAt.toISOString(),
        })

        console.log(`✅ Subscription activated for user ${ownerId}`)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Webhook error:', err)
    const error = err as Error

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})