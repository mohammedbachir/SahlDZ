# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SahlDZ/Resto Hub is an Arabic, RTL restaurant-management web app built with React 19, TanStack Start/Router, Vite, Tailwind CSS, and Radix-based UI primitives. The README describes the current design work as onboarding tours plus backend-free preview mode layered onto the restaurant-management application.

Node.js 22 or newer is required.

## Common commands

```bash
npm install                 # install dependencies
npm run dev                 # start the Vite development server (without emulators)
npm run dev:emulators       # start emulators + Vite dev server (recommended)
npm run seed:auth           # re-seed auth emulator accounts
npm run build               # production build and Vercel packaging
npm run build:dev           # development-mode Vite build
npm run preview             # serve a production build locally
npm run lint                # run ESLint
npm run format              # format the repository with Prettier
```

There is no test script or test framework configured in `package.json`; run `npm run lint` and the relevant build command for validation. There is consequently no repository-supported single-test command.

Preview/demo routes work without a configured backend: `/waiter-login`, `/kitchen-login`, `/cashier-login`, `/dashboard`, `/login`, and `/signup`.

## Architecture

- **TanStack Start entrypoints:** `src/client.tsx` hydrates the app with `StartClient`; `src/server.ts` exposes the TanStack Start request handler. `src/router.tsx` creates the router from the generated `src/routeTree.gen.ts` and enables intent preloading and scroll restoration.
- **File-based routing:** Route modules live in `src/routes/`. `src/routes/__root.tsx` owns the document shell, RTL language direction, global i18n/style imports, outlet, toast provider, and not-found page. Dashboard and operations are layouts with nested route modules; dashboard content is lazy-loaded from `src/pages/`.
- **Dashboard and operations surfaces:** `/dashboard` provides the restaurant-owner/admin navigation and onboarding/tour flow. `/ops` provides role-filtered operations navigation and nested inventory, recipes, purchasing, employee, expense, waste, report, performance, and complaint screens. Authentication guards and post-auth routing are in `src/lib/auth.ts`.
- **Backend boundary:** Existing application code imports `supabase` from `src/integrations/supabase/client.ts`, which re-exports a Supabase-compatible adapter implemented over Firebase in `src/integrations/firebase/client.ts`. Firebase initialization is optional and controlled by `VITE_FIREBASE_*` variables in `src/integrations/firebase/config.ts`; when absent, the adapter returns preview-safe stubs rather than requiring a backend.
- **Domain operations:** Feature-specific server/client operations are organized as `src/lib/*.functions.ts` modules (orders, cashier, waiter, delivery, inventory receipts, menu import, settings, Telegram, summaries, and operations alerts). Shared restaurant resolution and DZD formatting are in `src/lib/restaurant.ts`; transaction label lookup is in `src/lib/ops-tx.ts`.
- **Preview mode:** `src/lib/preview-mode.ts` defines the mock restaurant and token/expiry helpers. Role login and screen routes fall back to mock data when no backend/session or restaurant query is available, so preserve the distinction between real Firebase-backed behavior and demo behavior when changing those routes.
- **UI and styling:** Reusable primitives are in `src/components/ui/`; application-level components include auth shell, onboarding/tours, notifications, language/theme controls, confirmation dialogs, and the admin chatbot. Global RTL/theme styles are in `src/styles.css`. The primary interface language is Arabic; `src/lib/i18n.ts` initializes i18next/react-i18next with Arabic as the active and fallback language, while supported language switching is handled by the UI.
- **Generated routing:** `src/routeTree.gen.ts` is generated from the file routes. When adding or renaming route modules, use the project’s TanStack/Vite development workflow so the route tree is regenerated rather than editing the generated file manually.

## Configuration notes

- TypeScript is strict, uses bundler module resolution, and defines the `@/*` alias to `src/*` in `tsconfig.json`.
- Backend configuration is optional for preview mode. Full Firebase operation requires the `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID` environment variables.
- Tour query parameters use numeric values: `?tour=1` activates/continues a tour and `?tour=0` disables it. This avoids TanStack Router search-value serialization issues documented in the README.

## Firebase Emulators Setup

- **Firebase Emulators require Java.** The system has Java 17. Firebase-tools v15+ requires Java 21 for emulators. We use firebase-tools v14.x which ships emulator JARs compatible with Java 17.
- **DO NOT upgrade firebase-tools** (`npm i -g firebase-tools@latest`). The latest version downloads Firestore emulator v1.22.0 which requires Java 21 and will break.
- The emulator config is in `firebase.json`. Auth runs on `:9099`, Firestore on `:8081`.
- Data is auto-imported from `firebase-emulator-data/` on start and auto-exported on exit (`exportOnExit` in firebase.json).
- Use `npm run dev:emulators` to start everything — it checks if emulators are already running, starts them if not, seeds auth accounts, then starts Vite.
- To manually start emulators: `firebase emulators:start --only auth,firestore --project sahldz-demo`
