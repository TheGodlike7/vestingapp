# VestingApp Design Map

Editable design map for the current product, UI routes, subscription payment system, backend automation, and core data model.

## Product Shape

VestingApp has three main product tracks:

- Marketing and authentication: landing page, login, password reset.
- Issuer/admin workspace: dashboard, organizations, projects, schedules, analytics, subscription, fraud/webhook monitoring.
- Recipient/claimer workspace: wallet-based claim portal for viewing and claiming vested tokens.

## Route Map

```mermaid
flowchart TD
  Root["/"] --> Landing["Landing / Index"]
  Root --> Login["/login AuthPage"]
  Root --> Reset["/reset-password ResetPasswordPage"]

  Login --> Dashboard["/dashboard AdminDashboard"]
  Dashboard --> Subscription["/subscription SubscriptionPage"]
  Dashboard --> Organization["/organization OrganizationPage"]
  Dashboard --> Project["/project/:projectId ProjectPage"]
  Dashboard --> Analytics["/analytics AnalyticsDashboard"]
  Analytics --> BackendActivity["/analytics/activity AnalyticsActivityPage"]
  Analytics --> ProjectAnalytics["/analytics/project/:projectId AnalyticsProjectPage"]
  Dashboard --> SuperAdmin["/superadmin SuperAdmin"]
  Dashboard --> AdminPanel["/admin AdminPanel"]
  Dashboard --> Webhooks["/webhooks WebhookDashboard"]
  Dashboard --> Fraud["/fraud FraudDashboard"]

  Root --> Claim["/claim ClaimPage"]
  Claim --> ClaimerAnalytics["/claim/analytics/project/:projectId ClaimerProjectAnalyticsPage"]
  Claim --> ClaimerOrgs["ClaimerDashboard"]
  ClaimerOrgs --> ClaimerProjects["ClaimerProjectsPage"]
  ClaimerProjects --> ClaimerVestings["ClaimerVestingsPage"]
```

## Primary User Flows

```mermaid
flowchart LR
  Visitor["Visitor"] --> Landing["Landing Page"]
  Landing --> Login["Login / Sign Up"]
  Login --> Dashboard["Issuer Dashboard"]
  Dashboard --> Subscribe["Subscription Checkout"]
  Subscribe --> Active["Active Subscription"]
  Active --> CreateOrg["Create Organization + KYC"]
  CreateOrg --> CreateProject["Create Project"]
  CreateProject --> CreateSchedule["Create Vesting Schedule"]
  CreateSchedule --> Recipient["Recipient Claims Tokens"]
```

```mermaid
flowchart LR
  Recipient["Recipient"] --> ClaimPage["Claim Page"]
  ClaimPage --> ConnectWallet["Connect Wallet"]
  ConnectWallet --> ViewSchedules["View Active Schedules"]
  ViewSchedules --> Claimable["Check Claimable Amount"]
  Claimable --> SignClaim["Sign Claim Transaction"]
  SignClaim --> ClaimHistory["Claim History Updated"]
```

## Claim Portal Onboarding

The landing page now gives recipients a direct `Claim Tokens` action into `/claim`. The claim route has its own localStorage-first guide because recipients may not have a `project_owners` row.

```mermaid
flowchart TD
  Landing["Landing hero"] --> ClaimCta["Claim Tokens button"]
  ClaimCta --> ClaimRoute["/claim ClaimPage"]
  ClaimRoute --> ClaimGuide{"claim guide completed locally?"}
  ClaimGuide -- "No" --> Briefing["Open ClaimOnboardingGuide"]
  ClaimGuide -- "Yes" --> Portal["Show claim portal"]

  Briefing --> Connect["Spotlight: wallet connect"]
  Connect --> Schedules["Spotlight: schedule list"]
  Schedules --> Amounts["Spotlight: total, vested, claimable"]
  Amounts --> Claim["Spotlight: claim action"]
  Claim --> History["Spotlight: status and history"]
  History --> Complete["Store completion globally and per wallet"]
```

## Gamified Dashboard Onboarding

The dashboard carries the first-run quest. It uses a localStorage-first check for instant UX, then syncs the `project_owners.onboarding_completed` flag when a database owner row exists.

```mermaid
flowchart TD
  Dashboard["/dashboard loads"] --> LocalCheck{"localStorage complete?"}
  LocalCheck -- "Yes" --> SyncDb["Sync completed flag to Supabase"]
  LocalCheck -- "No" --> DbCheck{"project_owners.onboarding_completed?"}
  DbCheck -- "Yes" --> SaveLocal["Write localStorage complete"]
  DbCheck -- "No or missing row" --> Quest["Open OnboardingGuide"]

  Quest --> Welcome["Welcome briefing"]
  Welcome --> SubscriptionSpotlight["Spotlight: subscription CTA"]
  SubscriptionSpotlight --> OrganizationSpotlight["Spotlight: organization card"]
  OrganizationSpotlight --> ProjectSpotlight["Spotlight: new project action"]
  ProjectSpotlight --> RecipientSpotlight["Spotlight: projects and recipients path"]
  RecipientSpotlight --> AnalyticsSpotlight["Spotlight: analytics shortcut"]
  AnalyticsSpotlight --> Complete["Mark complete locally and in DB"]
  Complete --> HelpButton["Replay from fixed help button"]
```

## Subscription Checkout

The checkout is subscription-first: the plan remains the center of the page, and the modal only asks how the user wants to pay for the Starter subscription.

```mermaid
stateDiagram-v2
  [*] --> SubscriptionPage
  SubscriptionPage --> CheckoutModal: Pay click
  CheckoutModal --> CryptoTab: Crypto wallet
  CheckoutModal --> CardTab: Card

  CryptoTab --> SelectWallet: Select allowed wallet
  SelectWallet --> WalletConnected: Phantom / Solflare / MetaMask / Binance / OKX / Jupiter
  WalletConnected --> CreateIntent: Create server pending payment
  CreateIntent --> LocalLock: Store localStorage payment lock
  LocalLock --> WalletApproval: Sign USDC transfer with memo
  WalletApproval --> RawSend: sendRawTransaction
  RawSend --> Confirming: confirmTransaction
  Confirming --> WebhookActivation: Helius webhook validates tx
  WebhookActivation --> ActiveSubscription: Subscription active

  CardTab --> CardUnavailable: Stripe-ready placeholder
  CheckoutModal --> SubscriptionPage: Back / close
```

## Duplicate Payment Protection

```mermaid
flowchart TD
  Click["User clicks Pay"] --> Gate{"Checkout gate locked?"}
  Gate -- "No" --> Open["Open checkout immediately"]
  Gate -- "Yes" --> IgnoreClick["Ignore duplicate click"]

  Open --> FinalPay["User confirms crypto payment"]
  FinalPay --> InFlight{"Payment in flight?"}
  InFlight -- "Yes" --> IgnorePay["Ignore duplicate execution"]
  InFlight -- "No" --> LocalStorage{"Active localStorage lock?"}
  LocalStorage -- "Yes" --> BlockLocal["Block duplicate browser/session payment"]
  LocalStorage -- "No" --> EdgeIntent["create-subscription-payment"]

  EdgeIntent --> PendingUnique["pending_payments unique pending user"]
  PendingUnique --> Memo["Return memo and payment id"]
  Memo --> WalletTx["Wallet signs one USDC transaction"]
  WalletTx --> ProcessedUnique["processed_transactions unique signature"]
  ProcessedUnique --> CompleteRpc["complete_subscription_payment RPC"]
  CompleteRpc --> PendingComplete["pending_payments completed"]
  PendingComplete --> SubscriptionUpdate["Subscription created or extended once"]
```

## Backend Payment Flow

```mermaid
sequenceDiagram
  participant UI as Subscription UI
  participant Intent as create-subscription-payment
  participant Wallet as User Wallet
  participant Solana as Solana Devnet/Mainnet
  participant Helius as Helius Webhook
  participant Webhook as helius-webhook
  participant DB as Supabase DB
  participant Telegram as Telegram Alerts

  UI->>Intent: Authenticated request with wallet address
  Intent->>DB: Expire stale pending rows
  Intent->>DB: Upsert project owner wallet
  Intent->>DB: Insert pending_payments row
  Intent-->>UI: paymentId, memo, amount, mint, business wallet
  UI->>Wallet: Build USDC transfer with memo
  Wallet->>Solana: Signed raw transaction
  Solana-->>Helius: Observed transaction
  Helius->>Webhook: POST transaction payload
  Webhook->>Solana: getTransaction verification
  Webhook->>DB: Acquire processed_transactions lock
  Webhook->>DB: Load pending_payments by memo
  Webhook->>Webhook: Validate mint, recipient, amount, payer, expiry
  Webhook->>DB: complete_subscription_payment RPC
  DB->>DB: Mark pending completed and create/extend subscription
  Webhook-->>Telegram: Send payment alert
```

## Main UI Surfaces

| Area | File | Purpose |
| --- | --- | --- |
| Landing | `src/pages/Index.tsx`, `src/LandingPage.tsx`, `src/components/landing/*` | Public marketing surface |
| Auth | `src/AuthPage.tsx`, `src/ResetPasswordPage.tsx` | Login and account recovery |
| Dashboard | `src/AdminDashboard.tsx`, `src/components/onboarding/OnboardingGuide.tsx` | Main issuer/admin workspace with replayable quest onboarding |
| Organization KYC | `src/OrganizationPage.tsx`, `src/CreateOrganization.tsx` | Subscription-gated owner wallet, organization identity, and official links form |
| Project detail | `src/ProjectPage.tsx` | Project schedules and management |
| Subscription | `src/SubscriptionPage.tsx`, `src/components/subscription/*`, `src/payments/*` | Starter plan, checkout modal, wallet payment orchestration |
| Claim portal | `src/App.tsx`, `src/ClaimerProjectAnalyticsPage.tsx`, `src/components/onboarding/ClaimOnboardingGuide.tsx`, `src/ClaimerDashboard.tsx`, `src/ClaimerProjectsPage.tsx`, `src/ClaimerVestingsPage.tsx` | Recipient token claim flow, organization/project analytics selector, and replayable local guide |
| Admin tools | `src/AdminPanel.tsx`, `src/SuperAdmin.tsx` | Elevated admin functions |
| Monitoring | `src/AnalyticsDashboard.tsx`, `src/AnalyticsActivityPage.tsx`, `src/AnalyticsProjectPage.tsx`, `src/WebhookDashboard.tsx`, `src/FraudDashboard.tsx` | Analytics, per-project analytics pages, full backend activity explorer-lite view, webhooks, risk signals |

## Core Data Model

```mermaid
erDiagram
  project_owners ||--o{ organizations : owns
  project_owners ||--o{ subscriptions : pays_for
  project_owners ||--o{ pending_payments : creates
  project_owners ||--o{ vesting_projects : owns
  organizations ||--o{ vesting_projects : groups
  vesting_projects ||--o{ vesting_schedules : contains
  vesting_schedules ||--o{ claim_history : records
  vesting_schedules ||--o{ claim_logs : audits
  pending_payments ||--o| processed_transactions : completes_with
  processed_transactions ||--o| subscriptions : activates
  wallet_risk ||--o{ fraud_logs : flags
  organizations ||--o{ organization_reviews : reviewed_by_superadmin

  project_owners {
    uuid id
    text email
    text wallet_address
    text company_name
    text plan
    boolean is_active
    boolean is_super_admin
    boolean onboarding_completed
  }

  organizations {
    uuid id
    text owner_id
    text name
    text organization_type
    text owner_full_name
    text logo_url
    text kyb_status
    text kyb_risk_level
    integer kyb_risk_score
    text country_of_operation
    text contact_email
    text representative_role
    text project_description
    text x_url
    text discord_url
    text telegram_url
    text linkedin_url
    text website_url
    boolean kyc_profile_submitted
  }

  organization_reviews {
    uuid id
    uuid organization_id
    uuid reviewed_by
    text old_status
    text new_status
    integer risk_score
    text risk_level
    text notes
  }

  pending_payments {
    uuid id
    text user_id
    text user_id_prefix
    text status
    numeric amount_usdc
    text token_mint
    text business_wallet
    text tx_signature
    timestamptz expires_at
  }

  subscriptions {
    uuid id
    uuid owner_id
    text status
    text plan
    numeric amount_usd
    text transaction_signature
    timestamptz expires_at
  }

  processed_transactions {
    text signature
    text status
    text wallet
    numeric amount
    integer retry_count
    jsonb raw_payload
  }

  vesting_projects {
    uuid id
    uuid owner_id
    uuid organization_id
    text project_name
    text token_mint
    text token_symbol
  }

  vesting_schedules {
    uuid id
    uuid project_id
    text recipient_wallet
    numeric total_amount
    numeric claimed_amount
    numeric claimable_amount
    timestamptz start_date
    integer cliff_months
    integer duration_months
    text schedule_type
  }

  claim_history {
    uuid id
    uuid schedule_id
    numeric amount
    timestamptz claimed_at
    timestamptz claim_executed_at
    numeric token_price_usd_at_claim
    numeric claim_value_usd
  }
```

## Supabase Edge Functions

```mermaid
flowchart TD
  CreatePayment["create-subscription-payment"] --> Pending["pending_payments"]
  CreatePayment --> Owners["project_owners"]

  CancelPayment["cancel-subscription-payment"] --> Pending

  HeliusWebhook["helius-webhook"] --> Pending
  HeliusWebhook --> Processed["processed_transactions"]
  HeliusWebhook --> CompleteRpc["complete_subscription_payment RPC"]
  CompleteRpc --> Subs["subscriptions"]
  HeliusWebhook --> Telegram["Telegram alerts"]

  Retry["retry-webhooks"] --> Processed
  Retry --> HeliusWebhook

  Expire["expire-subscriptions"] --> Subs
```

## Theme Modes

- `Purple Mode`: default violet and green VestingApp identity.
- `Green Mode`: green-first Solana operational mode.
- `Crimson Mode`: dark red and hot pink Solana glow mode.
- `Solar Mode`: electric yellow and chartreuse Solana glow mode with sparse yellow-green and yellow-white twinkling star dust.
- `Prism Mode`: neon purple, magenta, and orange multi-glow mode.
- The top `ThemeToggle` button cycles through all modes using the same `va-theme` localStorage and `data-theme` CSS-variable mechanism.

## Design Notes

- Keep issuer/admin screens dense, scannable, and operational.
- Keep organization creation subscription-gated and trust-profile focused: DAO profiles require X, Discord, and Telegram; company profiles require LinkedIn, website, and Meta/Facebook or Instagram. Superadmins may preview the form read-only on `/organization` without wallet, subscription, edits, or submission. Organization `logo_url` is optional and feeds project analytics circular logos for linked projects. Every organization URL box is backed by database validation through `private.is_valid_public_url` and the `organizations_validate_url_fields` trigger, so plain text or malformed URLs cannot be saved if the frontend is bypassed.
- Keep KYB as a lightweight trust profile during paid beta: deterministic risk scoring plus superadmin review controls only public trust badges, not project creation.
- Keep subscription UI plan-centered, not deposit-centered.
- Keep the claim flow wallet-first and minimal.
- Treat card payments as a separate processor-backed subscription checkout, not a fake local action.
- Treat frontend locks as UX protection only; `pending_payments` and `processed_transactions` are the durable duplicate guards.
- Keep the memo format stable: `vestingapp-starter-${userIdPrefix}`.
- Keep the dashboard onboarding replayable, dismissible, and anchored to real controls, including the visible analytics shortcut, instead of explanatory pages.
- Keep live backend activity readable: `/analytics` shows a short recent preview, while `/analytics/activity` loads processed transactions with status filters, search, 20-row pagination, and 15-character signature previews.
- Keep project analytics separated by project: `/analytics` exposes circular project identity buttons using organization logo images when available, and `/analytics/project/:projectId` owns expanded claim, recipient, and schedule graphs. Admin progress uses a pie chart for claimed, claimable, and locked/unvested allocation state.
- Keep claimer analytics personal and wallet-scoped: `/claim` lets claimers choose organizations, then active projects they participate in; `/claim/analytics/project/:projectId` shows personal claiming progress, claim execution history, and stored claim-time USD value snapshots.
- Keep the claim portal reachable from the landing page and teach it separately from issuer onboarding.

## Mainnet Readiness

- Solana network selection defaults to `mainnet-beta`; `devnet` is only used when explicitly set for testing.
- Subscription crypto amount is network-locked: `99 USDC` on `mainnet-beta`, `0.1 USDC` on `devnet`.
- Helius webhook JWT verification is disabled at the Supabase gateway and protected by `HELIUS_WEBHOOK_SECRET`.
- Claiming is intentionally disabled by source-level readiness gates until the secure on-chain claim path is implemented.

## Open Design Decisions

- Choose the final card processor configuration for the Stripe-ready placeholder.
- Decide whether MetaMask/Binance/OKX/Jupiter support needs WalletConnect in addition to Solana Wallet Standard discovery.
- Decide whether `SuperAdmin`, `WebhookDashboard`, and `FraudDashboard` stay first-level routes or move behind a unified admin tools area.
