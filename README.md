# Resto Hub — Design & Onboarding Work

Arabic restaurant management UI. This repository contains the design work built on top of the `resto-hub-arabica` project: the guided onboarding tours and the backend-free preview (demo) mode for role logins.

## What's included

### Onboarding tour system (dashboard + ops)

- `src/components/DashboardTour.tsx` — 7-step dashboard tour (orders → menu → tables → analytics → ops → reviews → settings)
- `src/components/OpsTour.tsx` — 3-step operations tour over the real `/ops`, `/ops/inventory`, `/ops/recipes` routes
- `src/components/TourAnnotation.tsx` — annotation bubble anchored with `@floating-ui/react-dom` (CSS rotated-square arrow via `middlewareData.arrow`, MutationObserver re-query for lazy-mounted targets)
- `src/components/DashboardOnboarding.tsx` — first-visit onboarding screen
- Tour param convention: `?tour=1` activates, `?tour=0` disables; numeric values because TanStack Router JSON-serializes string search values with quotes

### Preview (mock) mode — no backend required

- `src/lib/preview-mode.ts` — preview restaurant (`مطعم السهل`), `mock_` token detection, 24h expiry
- `src/routes/waiter-login.tsx` — opens preview session when no `?rid=` param (mock waiters أمين / سارة)
- `src/routes/kitchen-login.tsx` — preview session with mock chef الشيف يوسف
- `src/routes/cashier-login.tsx` — preview session when no `?r=` param
- `src/routes/waiter-screen.tsx`, `kitchen-screen.tsx`, `cashier.tsx` — mock orders / Z-report in preview mode, each labelled "وضع معاينة — بدون اتصال"
- Also fixes the real cashier login bug: tokens were stored in `localStorage` but the screen reads `sessionStorage`

### Redesigned screens & UI primitives

- `src/routes/index.tsx`, `login.tsx`, `signup.tsx`, `AuthShell.tsx` — redesigned landing/auth pages (gold `#D4A853` primary, Cairo font, RTL)
- `src/routes/dashboard.*.tsx` — `data-annotate` targets, tour integration across all sub-pages
- `src/routes/ops*.tsx` — annotated real operations sections
- `src/components/ui/` — `animated-counter`, `floating-input`, `glow-button`, `gradient-text`, `section-header`, `tilt-card`
- `src/styles.css` — full redesign theme

## Run

```bash
npm install
npm run dev
```

Preview links (no backend): `/waiter-login`, `/kitchen-login`, `/cashier-login`, `/dashboard`, `/login`, `/signup`.
