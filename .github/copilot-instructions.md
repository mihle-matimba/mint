# Mint AI Coding Guide

## Architecture
- Hash-based routing in [src/App.jsx](src/App.jsx) using `currentPage` and `authStep`; no router library. Pages live in [src/pages/](src/pages/) and open via `onOpenXxx` callbacks.
- Layouts are `AuthLayout` and `AppLayout` (bottom navbar) in [src/layouts/](src/layouts/).
- Supabase client is [src/lib/supabase.js](src/lib/supabase.js); hooks under [src/lib/](src/lib/) must guard `if (!supabase)` before queries.
- Express middleware in [server/index.cjs](server/index.cjs) handles Sumsub KYC + TruID; Vite proxies `/api/*` to `localhost:3001`.
- App-wide notifications are in [src/lib/NotificationsContext.jsx](src/lib/NotificationsContext.jsx) and mounted in `main.jsx`.

## Data + Markets Flow
- Strategy prices/metrics come from `strategy_metrics` + `strategy_prices` via [src/lib/strategyData.js](src/lib/strategyData.js); never derive from securities.
- Flow: [src/pages/MarketsPage.jsx](src/pages/MarketsPage.jsx) → [src/pages/FactsheetPage.jsx](src/pages/FactsheetPage.jsx) → [src/pages/OpenStrategiesPage.jsx](src/pages/OpenStrategiesPage.jsx).
- Recharts pattern is in [src/components/StrategyReturnChart.jsx](src/components/StrategyReturnChart.jsx).

## Auth, Biometrics, Payments
- Auth flow lives in [src/components/AuthForm.jsx](src/components/AuthForm.jsx): rate limits, 6-digit OTP (180s), resend cooldowns.
- Biometrics must check `isNativeIOS() || isNativeAndroid()` from [src/lib/biometrics.js](src/lib/biometrics.js); Android needs `USE_BIOMETRIC` + `USE_FINGERPRINT` (see [ANDROID_QUICK_REFERENCE.md](ANDROID_QUICK_REFERENCE.md)).
- Paystack SDK is loaded in [index.html](index.html); [src/pages/PaymentPage.jsx](src/pages/PaymentPage.jsx) uses `window.PaystackPop()`.
- Sumsub Web SDK is in [src/components/SumsubVerification.jsx](src/components/SumsubVerification.jsx); tokens come from [server/index.cjs](server/index.cjs).

## Conventions
- Tailwind CSS only; no CSS modules or styled-components. Shared inputs use `forwardRef` + class merging (see [src/components/TextInput.jsx](src/components/TextInput.jsx)).
- UI components live in [src/components/ui/](src/components/ui/) and import via `@/components/ui/*`.
- Data hooks use `isMounted` to prevent setState after unmount; `.maybeSingle()` for optional rows; auto-create missing rows (see `useRequiredActions` in [src/lib/useRequiredActions.js](src/lib/useRequiredActions.js)).
- localStorage keys: `biometricsEnabled`, `biometricsUserEmail`, `hasLoggedInBefore`, `activeApplicationId`.
- Strategy data is cached in-memory for 60s; price history cache key `${strategy_id}_${timeframe}`.

## Workflows
- `npm run dev` runs Vite + [server/index.cjs](server/index.cjs) on `localhost:5000` (API on `3001`).
- `npm run build` outputs `dist/` (Capacitor `webDir`); then `npx cap sync ios|android`.
- `npm run preview` for production build; `npm run deploy` for GitHub Pages.
- Android debug APK: `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`.

## Env
- Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYSTACK_PUBLIC_KEY`.
- Server-side: `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_LEVEL_NAME`.

