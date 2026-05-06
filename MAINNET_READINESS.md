# Mainnet Readiness

This codebase is prepared for mainnet configuration, but mainnet launch is intentionally gated by environment variables and operational checks.

## Launch Gates

- `VITE_SOLANA_NETWORK=mainnet-beta`
- `VITE_SOLANA_RPC_URL` points to dedicated/private mainnet RPC infrastructure.
- `VITE_USDC_MINT` and `USDC_MINT` are the canonical mainnet USDC mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.
- `VITE_BUSINESS_WALLET` and `BUSINESS_WALLET` are the production treasury wallet.
- Subscription amount is code-locked by network: `99 USDC` on `mainnet-beta`, `0.1 USDC` on `devnet`.
- `SOLANA_NETWORK=mainnet-beta`
- `SOLANA_RPC_URL` points to the same trusted mainnet RPC provider used by the webhook verifier.
- `HELIUS_WEBHOOK_SECRET` is rotated and configured in Helius and Supabase.
- Supabase auth site URL and redirect URLs point to `https://vest.onlineonchain.cloud`.
- All public tables have RLS enabled and production policies verified.
- All base schema migrations are committed and applied in the production Supabase project.

## Claims Status

Token claiming is intentionally disabled with a source-level readiness gate plus `VITE_CLAIMS_ENABLED=false`.

The claim portal remains useful for viewing vesting schedules, but it will not build or submit claim transactions until a secure on-chain claim path is implemented. Do not enable claims until:

- A real claim program or secure treasury authority flow exists.
- Claim authorization is enforced server-side/on-chain.
- Claim amount calculations are verified against canonical on-chain or trusted backend state.
- Duplicate claim prevention is enforced transactionally.
- Claim history and schedule claimed amounts are updated atomically.

## Function Deployment Notes

- `helius-webhook` has Supabase JWT verification disabled so Helius can call it directly.
- The webhook still requires `HELIUS_WEBHOOK_SECRET` via `x-api-key` or `Authorization: Bearer`.
- `create-subscription-payment` and `cancel-subscription-payment` keep Supabase JWT verification enabled.
- `retry-webhooks` and `expire-subscriptions` are intended for trusted scheduled execution.
