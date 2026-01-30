# Copilot instructions for Mint

## Big picture architecture
- SPA built with React + Vite; no router. App navigation is a local state machine in [src/App.jsx](src/App.jsx) that swaps pages and persists the last page in localStorage (`mint_current_page`).
- Auth and onboarding flow live in [src/components/AuthForm.jsx](src/components/AuthForm.jsx), [src/pages/AuthPage.jsx](src/pages/AuthPage.jsx), and [src/pages/UserOnboardingPage.jsx](src/pages/UserOnboardingPage.jsx). `AuthForm` owns OTP/password-reset steps and calls `onSignupComplete`/`onLoginComplete` to advance.
- “Authenticated” pages are wrapped by `AppLayout` (see [src/layouts/AppLayout.jsx](src/layouts/AppLayout.jsx)), which adds the bottom `Navbar` and safe-area padding.
- Supabase is optional: [src/lib/supabase.js](src/lib/supabase.js) exports `supabase` as `null` when env vars are missing; callers guard with `if (!supabase)` and surface user-friendly messaging.

## Integrations and data flow
- Sumsub: `SumsubConnector` in [src/components/SumsubConnector.jsx](src/components/SumsubConnector.jsx) calls `POST /api/samsub/init-websdk`. In production it can be served by the Vercel serverless handler at [api/samsub/init-websdk.js](api/samsub/init-websdk.js). For local dev, `VITE_SUMSUB_API_BASE` can point to the standalone Node server in [server/index.js](server/index.js) (uses [server/samsubServices.js](server/samsubServices.js) for signing).
- Biometrics (native only): logic centralized in [src/lib/biometrics.js](src/lib/biometrics.js). UI hooks live in [src/components/BiometricPromptModal.jsx](src/components/BiometricPromptModal.jsx) and are invoked from [src/components/AuthForm.jsx](src/components/AuthForm.jsx) and [src/pages/MorePage.jsx](src/pages/MorePage.jsx). Biometrics state is stored in localStorage keys `biometricsEnabled`, `biometricsUserEmail`, and `hasLoggedInBefore`.

## Developer workflows
- Frontend dev/build/preview/deploy scripts are defined in [package.json](package.json): `npm run dev`, `npm run build`, `npm run preview`, `npm run deploy`.
- The Sumsub backend is a separate Node package under [server/package.json](server/package.json); run it with `npm install` and `npm start` from the server folder.

## Project-specific conventions
- Styling is Tailwind-first with additional scoped CSS in [src/styles](src/styles) (notably auth and onboarding animations in [src/styles/auth.css](src/styles/auth.css) and [src/styles/onboarding-process.css](src/styles/onboarding-process.css)).
- Avoid introducing React Router; follow the `currentPage` switch pattern in [src/App.jsx](src/App.jsx) for new top-level screens.
- When touching auth flows, keep recovery-token handling in the hash fragment (see `isRecoveryMode` and `getTokensFromHash` in [src/App.jsx](src/App.jsx)).

## Environment configuration
- Frontend expects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see [src/lib/supabase.js](src/lib/supabase.js) and [README.md](README.md)).
- Sumsub server reads `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`/`SUMSUB_APP_SECRET`, `SUMSUB_BASE_URL`, `SUMSUB_DEFAULT_LEVEL`, `SUMSUB_DEFAULT_TTL`, and `CORS_ORIGIN` from `.env` (see [server/index.js](server/index.js) and [server/samsubServices.js](server/samsubServices.js)).
