# Mint AI Coding Guide

## Big picture (React + Vite + Capacitor)
- **Hash-based routing** is centralized in [src/App.jsx](src/App.jsx) using `currentPage` and `authStep`; no router library. Pages are feature modules under [src/pages/](src/pages/), wired via `onOpenXxx` callbacks from `App.jsx`.
- **Two layouts**: `AuthLayout` for auth flows and `AppLayout` for the main app shell (see [src/layouts/AppLayout.jsx](src/layouts/AppLayout.jsx)). Modal state is managed in `App.jsx` and passed down.
- **Supabase** is the backend (auth + data). The client lives in [src/lib/supabase.js](src/lib/supabase.js) and is used by hooks in [src/lib/](src/lib/).
- **Notifications** are app-wide state via context in [src/lib/NotificationsContext.jsx](src/lib/NotificationsContext.jsx) and are mounted in `main.jsx`.
- **Backend API** for serverless handlers lives in `/api/` (banking integration, credit checks, SumSub). Dev server in `server/dev-api.js` runs Express on port 8787 and routes requests to `/api/*` handlers.

## Critical workflows
- Dev server: `npm run dev` (Vite on localhost:5000)
- Dev API server (optional): `npm run start:api` (Express on port 8787 for `/api/` routes)
- Build: `npm run build` (output dist/; used by Capacitor webDir in capacitor.config.json)
- Mobile sync: `npx cap sync ios|android` after build

## Server-side patterns (banking, KYC, credit)
- **TruID banking integration** (`/api/banking/*`): Handles account linking via popups. Routes: `/initiate`, `/status`, `/all`, `/capture`, `/debug-profile`.
  - Uses `truidClient.js` service; requires env vars: `TRUID_API_KEY`, `TRUID_API_BASE`, `COMPANY_ID`, `BRAND_ID`, `WEBHOOK_URL`, `REDIRECT_URL`.
  - Client calls from [src/pages/CreditApplyPage.jsx](src/pages/CreditApplyPage.jsx) ConnectionStage component; collectionId stored in ref.
- **SumSub KYC** (`/api/sumsub/access-token`): Generates access tokens for identity verification. Requires `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_LEVEL_NAME`.
- **Credit checks** (`/api/credit-check`): Returns mock or real credit data; check `mock-mode.js` for mock flag.
- Server endpoints use `supabase` (anon) and `supabaseAdmin` (service role) clients; always check env vars with `readEnv()` helper.

## Project-specific patterns
- **Data hooks** use an `isMounted` flag and guard missing envs: always check `if (!supabase)` before queries (see [src/lib/useProfile.js](src/lib/useProfile.js)).
- Use `.maybeSingle()` for optional rows and auto-create missing rows (see [src/lib/useRequiredActions.js](src/lib/useRequiredActions.js)).
- **Auth logic** is consolidated in [src/components/AuthForm.jsx](src/components/AuthForm.jsx) with rate-limits and OTP flows. Recovery flow parsed from URL hash in `App.jsx`.
- **Biometrics** must check `(isNativeIOS() || isNativeAndroid())` from [src/lib/biometrics.js](src/lib/biometrics.js) — never iOS-only checks.
- **CSV data** for employer lists is imported at build time and stored in `src/assets/2025-10-16-jse-listed-companies.csv`.

## Strategy + markets data flow
- Strategy prices and metrics come from `strategy_metrics` and `strategy_prices` via [src/lib/strategyData.js](src/lib/strategyData.js). Do not compute strategy prices from securities.
- Markets/strategies views: [src/pages/MarketsPage.jsx](src/pages/MarketsPage.jsx) → factsheet in [src/pages/FactsheetPage.jsx](src/pages/FactsheetPage.jsx).

## Payments
- Paystack is used on the client; SDK is loaded in index.html and wired in [src/pages/PaymentPage.jsx](src/pages/PaymentPage.jsx).

## Styling conventions
- **Tailwind CSS only**; compose classes instead of inline styles. Shared inputs use `forwardRef` and className merging (see [src/components/TextInput.jsx](src/components/TextInput.jsx)).
- Icons from lucide-react: import `{ ChevronDown, ArrowLeft, ... }` and use as components.

## Env requirements
- **Frontend**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYSTACK_PUBLIC_KEY`
- **Server** (banking): `TRUID_API_KEY`, `TRUID_API_BASE`, `COMPANY_ID`, `BRAND_ID`, `WEBHOOK_URL`, `REDIRECT_URL`
- **Server** (KYC): `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_LEVEL_NAME`
- Server reads from env first, falls back to `VITE_*` prefixed vars for portability.

## Reference map
- Router + state: [src/App.jsx](src/App.jsx)
- Auth + rate limiting: [src/components/AuthForm.jsx](src/components/AuthForm.jsx)
- Supabase client: [src/lib/supabase.js](src/lib/supabase.js)
- Data hooks: [src/lib/useProfile.js](src/lib/useProfile.js), [src/lib/useCreditCheck.js](src/lib/useCreditCheck.js), [src/lib/useFinancialData.js](src/lib/useFinancialData.js)
- Strategy data: [src/lib/strategyData.js](src/lib/strategyData.js)
- Biometrics: [src/lib/biometrics.js](src/lib/biometrics.js)
- Server router: [server/dev-api.js](server/dev-api.js)
- Banking APIs: [api/banking/](api/banking/)
- KYC APIs: [api/sumsub/](api/sumsub/)

