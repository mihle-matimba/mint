# Mint AI Coding Guide

## Big picture (React + Vite + Capacitor hybrid app)
- Routing is hash-based and centralized in [src/App.jsx](src/App.jsx) using `currentPage`/`authStep`; there is no router library, and pages in [src/pages/](src/pages/) are wired via `onOpenXxx` callbacks.
- Navigation state uses in-memory history for non-tab pages and swipe/back handling in [src/App.jsx](src/App.jsx); avoid introducing a router without updating that logic.
- Layout split: `AuthLayout` for auth flows and `AppLayout` for the main shell with bottom nav + modal handling in [src/layouts/AppLayout.jsx](src/layouts/AppLayout.jsx).
- Backend is Supabase for auth/data via [src/lib/supabase.js](src/lib/supabase.js); always guard with `if (!supabase)` before queries.
- Server middleware is Express in [server/index.cjs](server/index.cjs) for Sumsub KYC + TruID; Vite proxies `/api` to `http://localhost:3001` per [vite.config.js](vite.config.js).
- Vite base path is `./` for static deployment; keep this in mind for asset URLs (see [vite.config.js](vite.config.js)).

## Critical workflows
- `npm run dev` starts Vite on `:5000` and the Express server on `:3001` (see [package.json](package.json)).
- `npm run build` outputs `dist/` (Capacitor `webDir`), then run `npx cap sync ios|android`.
- Android debug build: `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`.
- `npm run preview` for production build preview; `npm run deploy` pushes `dist/` to GitHub Pages.

## Project-specific patterns
- Auth logic is centralized in [src/components/AuthForm.jsx](src/components/AuthForm.jsx) with OTP (6 digits, 180s expiry), resend cooldowns, and login rate limits.
- Biometrics must check `(isNativeIOS() || isNativeAndroid())` from [src/lib/biometrics.js](src/lib/biometrics.js); Android requires `USE_BIOMETRIC` and `USE_FINGERPRINT` permissions (see [ANDROID_QUICK_REFERENCE.md](ANDROID_QUICK_REFERENCE.md)).
- Notifications are global via a singleton realtime subscription in [src/lib/NotificationsContext.jsx](src/lib/NotificationsContext.jsx); mounted in `main.jsx`.
- Strategy data is cached in-memory (60s TTL) in [src/lib/strategyData.js](src/lib/strategyData.js); price history cache key is `${strategy_id}_${timeframe}`.
- Strategy pricing source of truth is `strategy_metrics` + `strategy_prices` tables (never derive from securities). Data flow: [src/pages/MarketsPage.jsx](src/pages/MarketsPage.jsx) → [src/pages/FactsheetPage.jsx](src/pages/FactsheetPage.jsx) → [src/pages/OpenStrategiesPage.jsx](src/pages/OpenStrategiesPage.jsx).
- Tailwind-only styling; shared inputs use `forwardRef` + className merging in [src/components/TextInput.jsx](src/components/TextInput.jsx). UI kit lives in [src/components/ui/](src/components/ui/) via `@` alias (see [vite.config.js](vite.config.js)).
- Charts use Recharts (`ComposedChart`, `Area`, `Line`, `ResponsiveContainer`) and `ChartContainer` patterns (see [src/components/StrategyReturnChart.jsx](src/components/StrategyReturnChart.jsx)).
- Local storage keys: `biometricsEnabled`, `biometricsUserEmail`, `hasLoggedInBefore`, `activeApplicationId` (see [src/lib/biometrics.js](src/lib/biometrics.js) and [src/lib/loanApplication.js](src/lib/loanApplication.js)).
- Paystack SDK is loaded in [index.html](index.html) and used via `window.PaystackPop()` in payment flows.

## Environment requirements
- Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYSTACK_PUBLIC_KEY`.
- Server: `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_LEVEL_NAME` (Sumsub). Server can also read `SUPABASE_URL`/`SUPABASE_ANON_KEY` with `VITE_` fallbacks.
- Ensure the branded font file exists at [public/assets/fonts/future-earth.ttf](public/assets/fonts/future-earth.ttf).

