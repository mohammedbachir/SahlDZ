# Graph Report - /home/raider/Desktop/SahelDZ/SahlDZ (2026-08-02)

## Corpus Check

- 108 files · ~61,667 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 824 nodes · 1454 edges · 118 communities (29 shown, 89 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.71)
- Token cost: 9,420 input · 7,230 output

## Community Hubs (Navigation)

- UI Dialog Components
- Daily Summary Server Functions
- Shared UI & PDF Helpers
- Project Architecture Docs
- Route Modules & Tree
- Auth Shell & QR Codes
- TypeScript Lib Types
- App Bar Controls
- Shared Hooks & Utilities
- Cashier Server Functions
- Role Auth & Preview Mode
- Chef Server Functions
- Waiter Server Functions
- Key Runtime Dependencies
- Dashboard Route Modules
- Dashboard Onboarding Tour
- ESLint Dev Dependencies
- Firebase Adapter Core
- UI Card Components
- Package Metadata
- Social Login Removal
- Chatbot & Theme Controls
- TanStack Router Setup
- NPM Scripts
- Onboarding Flow
- i18n & Root Layout
- Ops Overview KPIs
- FloatingInput Primitive
- GlowButton Primitive
- GradientText Primitive
- SectionHeader Primitive
- TiltCard Primitive
- Reviews Route
- Ops Complaints Route
- Ops Employees Route
- Ops Expenses Route
- Ops Reports Route
- Ops Staff Performance Route
- Ops Suppliers Route
- Ops Waste Route
- Server Entrypoint
- File Routing Design
- Cloudflare Vite Plugin
- clsx Dependency
- cmdk Dependency
- date-fns Dependency
- Website Issues & Solutions
- Embla Carousel Dependency
- ESLint JS Config
- ESLint Prettier Plugin
- exceljs Dependency
- Firebase Dependency
- Floating UI Dependency
- globals Dependency
- Hookform Resolvers
- i18next Dependency
- input-otp Dependency
- jspdf-autotable Dependency
- Lovable Cloud Auth
- Lovable Email JS
- Lovable Vite TanStack Config
- Lovable Webhooks
- Lucide Icons
- Radix Accordion
- Radix Alert Dialog
- Radix Aspect Ratio
- Radix Avatar
- Radix Checkbox
- Radix Collapsible
- Radix Context Menu
- Radix Dialog
- Radix Dropdown Menu
- Radix Hover Card
- Radix Label
- Radix Menubar
- Radix Navigation Menu
- Radix Popover
- Radix Progress
- Radix Radio Group
- Radix Scroll Area
- Radix Select
- Radix Separator
- Radix Slot
- Radix Switch
- Radix Tabs
- Radix Toggle
- Radix Tooltip
- React Core
- React DOM
- React Day Picker
- React Email
- React Email Components
- React Hook Form
- Resizable Panels
- Recharts Charts
- Supabase JS
- Tailwind Merge
- Tailwind CSS
- Tailwind Vite Plugin
- React Router Dependency
- React Start Dependency
- Router Plugin
- tw-animate-css Dependency
- Vaul Dependency
- Vite TS Config Paths
- ws Dependency
- Zod Validation
- Prettier Formatter
- Node Types
- QRCode Types
- React DOM Types
- WS Types
- TypeScript ESLint
- Vite Bundler
- Vite React Plugin
- Auth Design & Primitives

## God Nodes (most connected - your core abstractions)

1. `FileRoutesByPath` - 32 edges
2. `Button` - 26 edges
3. `cn()` - 25 edges
4. `supabase` - 20 edges
5. `compilerOptions` - 20 edges
6. `useRestaurantId()` - 17 edges
7. `Card` - 14 edges
8. `formatDZD()` - 13 edges
9. `tx()` - 11 edges
10. `previewExpiry()` - 10 edges

## Surprising Connections (you probably didn't know these)

- `Preview (Mock) Mode` --semantically_similar_to--> `Backend-Free Preview Mode` [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Supabase-Compatible Firebase Adapter` --conceptually_related_to--> `Firebase Adapter Redesign` [INFERRED]
  CLAUDE.md → Docs/website-solutions.md
- `Firebase Adapter Social-Auth Cleanup` --conceptually_related_to--> `Supabase-Compatible Firebase Adapter` [INFERRED]
  Docs/remove-social-login-prompt.md → CLAUDE.md
- `Backend-Free Preview Mode` --conceptually_related_to--> `Authenticated Preview Fallback` [INFERRED]
  CLAUDE.md → Docs/website-issues.md
- `Backend-Free Preview Mode` --conceptually_related_to--> `Predictable Preview Tokens` [INFERRED]
  CLAUDE.md → Docs/website-issues.md

## Import Cycles

- None detected.

## Hyperedges (group relationships)

- **Google/Apple Social Login Removal Decision** — docs_remove_social_login_prompt_prompt, docs_remove_social_login_prompt_email_password_auth, docs_remove_social_login_prompt_signinwithoauth_removal, docs_website_issues_oauth_not_implemented, docs_website_issues_oauth_callback_missing, docs_website_solutions_oauth_realtime [EXTRACTED 1.00]
- **Backend-Free Preview Mode Architecture and Risks** — claude_preview_mode, readme_preview_mode, docs_website_issues_authenticated_preview_fallback, docs_website_issues_static_preview_tokens, docs_website_solutions_preview_separation, docs_website_solutions_preview_token_security [INFERRED 0.85]
- **Supabase-Compatible Firebase Adapter Boundary** — claude_supabase_firebase_adapter, docs_website_issues_supabase_compat_naming, docs_website_issues_firebase_adapter_query_semantics, docs_website_issues_any_usage, docs_website_solutions_adapter_redesign, docs_website_solutions_backend_decision [INFERRED 0.85]

## Communities (118 total, 89 thin omitted)

### Community 0 - "UI Dialog Components"

Cohesion: 0.05
Nodes (69): ConfirmDialog(), ConfirmDialogProps, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+61 more)

### Community 1 - "Daily Summary Server Functions"

Cohesion: 0.06
Nodes (49): DialogDescription, getDailySummaryStatus, sendDailySummaryNow, setDailySummaryEnabled, addDeliveryDriver, listDeliveryDrivers, removeDeliveryDriver, toggleDeliveryDriver (+41 more)

### Community 2 - "Shared UI & PDF Helpers"

Cohesion: 0.07
Nodes (36): jspdf, jspdf, buttonVariants, Calendar(), CalendarProps, PopoverContent, beep(), useNewOrderNotifications() (+28 more)

### Community 3 - "Project Architecture Docs"

Cohesion: 0.05
Nodes (44): Arabic RTL i18n, Auth Guards and Post-Auth Routing, Dashboard and Operations Surfaces, Domain Operations Modules, Backend-Free Preview Mode, SahlDZ/Resto Hub, Supabase-Compatible Firebase Adapter, React 19 / TanStack Start / Vite / Tailwind / Radix Stack (+36 more)

### Community 4 - "Route Modules & Tree"

Cohesion: 0.05
Nodes (40): CashierLoginRoute, CashierRoute, DashboardAnalyticsRoute, DashboardMenuRoute, DashboardOrdersRoute, DashboardReviewsRoute, DashboardRoute, DashboardRouteChildren (+32 more)

### Community 5 - "Auth Shell & QR Codes"

Cohesion: 0.10
Nodes (28): qrcode, qrcode, AuthShell(), supabase, appOrigin(), getPostAuthRedirect(), redirectIfAuthed(), requireAuth() (+20 more)

### Community 6 - "TypeScript Lib Types"

Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, ES2022, src, vite/client, vite.config.ts, compilerOptions, allowImportingTsExtensions (+19 more)

### Community 7 - "App Bar Controls"

Cohesion: 0.11
Nodes (23): LANGS, LanguageSwitcher(), NotificationsBell(), DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem (+15 more)

### Community 8 - "Shared Hooks & Utilities"

Cohesion: 0.10
Nodes (9): AnimatedCounter(), getAuthSessionWaitMs(), waitForAuthSession(), faqs, features, plans, Route, steps (+1 more)

### Community 9 - "Cashier Server Functions"

Cohesion: 0.15
Nodes (18): cashierListReady, cashierLogout, cashierLookupTable, cashierMarkPaid, cashierZReport, disableCashier, getCashierContext, getCashierStatus (+10 more)

### Community 10 - "Role Auth & Preview Mode"

Cohesion: 0.16
Nodes (13): verifyCashierPin, getPublicChefList, verifyIndividualChefPin, PREVIEW_RESTAURANT, previewExpiry(), PreviewRestaurant, getPublicWaiterList, Page() (+5 more)

### Community 11 - "Chef Server Functions"

Cohesion: 0.15
Nodes (17): addIndividualChef, deleteIndividualChef, getIndividualChefContext, individualChefListActive, individualChefLogout, individualChefMarkReady, individualChefStartPreparing, listIndividualChefs (+9 more)

### Community 12 - "Waiter Server Functions"

Cohesion: 0.15
Nodes (17): addWaiter, deleteWaiter, getWaiterContext, listWaiters, toggleWaiter, updateWaiterPin, verifyWaiterPin, waiterClaimOrder (+9 more)

### Community 13 - "Key Runtime Dependencies"

Cohesion: 0.12
Nodes (17): class-variance-authority, framer-motion, i18next-browser-languagedetector, dependencies, class-variance-authority, framer-motion, i18next-browser-languagedetector, @radix-ui/react-slider (+9 more)

### Community 14 - "Dashboard Route Modules"

Cohesion: 0.12
Nodes (14): Route, Route, Route, Route, Route, Route, Route, Route (+6 more)

### Community 15 - "Dashboard Onboarding Tour"

Cohesion: 0.14
Nodes (13): Annotation, DashboardTour(), TourStep, tourSteps, Annotation, OPS_PATHS, OpsPath, OpsTour() (+5 more)

### Community 16 - "ESLint Dev Dependencies"

Cohesion: 0.15
Nodes (13): eslint, eslint-config-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, eslint, eslint-config-prettier, eslint-plugin-react-hooks (+5 more)

### Community 17 - "Firebase Adapter Core"

Cohesion: 0.37
Nodes (11): authWrapper(), buildQuery(), createFirebaseClient(), createStubProxy(), firestoreQueryChain(), storageChain(), firebaseConfig, getFirebaseApp() (+3 more)

### Community 18 - "UI Card Components"

Cohesion: 0.36
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 19 - "Package Metadata"

Cohesion: 0.20
Nodes (9): engines, node, name, entities, pnpm, overrides, private, sideEffects (+1 more)

### Community 20 - "Social Login Removal"

Cohesion: 0.28
Nodes (9): Email/Password Authentication, Remove Google and Apple Login Prompt, signInWithOAuth Removal, Lint/tsc/Build Validation, Missing OAuth Callback Route (Closed), OAuth Not Implemented (Closed), Realtime Not Implemented, OAuth Callback Fix (Obsolete) (+1 more)

### Community 21 - "Chatbot & Theme Controls"

Cohesion: 0.28
Nodes (6): AdminChatBot(), BOT_REPLIES, Message, ThemeToggle(), Button, ButtonProps

### Community 22 - "TanStack Router Setup"

Cohesion: 0.25
Nodes (6): getRouter(), Register, @tanstack/react-router, Register, routeTree, startInstance

### Community 23 - "NPM Scripts"

Cohesion: 0.29
Nodes (7): scripts, build, build:dev, dev, format, lint, preview

### Community 24 - "Onboarding Flow"

Cohesion: 0.29
Nodes (6): DashboardOnboarding(), hasCompletedOnboarding(), OnboardingStep, steps, DashboardLayout(), TABS

### Community 25 - "i18n & Root Layout"

Cohesion: 0.29
Nodes (3): ar, Route, FileRoutesById

### Community 26 - "Ops Overview KPIs"

Cohesion: 0.38
Nodes (6): fmt(), HIDDEN_KPIS, Kpis, OpsOverview(), resolveRestaurantId(), Route

## Knowledge Gaps

- **297 isolated node(s):** `name`, `private`, `sideEffects`, `type`, `node` (+292 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **89 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Key Runtime Dependencies` to `Shared UI & PDF Helpers`, `Auth Shell & QR Codes`, `Package Metadata`, `Cloudflare Vite Plugin`, `clsx Dependency`, `cmdk Dependency`, `date-fns Dependency`, `Embla Carousel Dependency`, `exceljs Dependency`, `Firebase Dependency`, `Floating UI Dependency`, `Hookform Resolvers`, `i18next Dependency`, `input-otp Dependency`, `jspdf-autotable Dependency`, `Lovable Cloud Auth`, `Lovable Email JS`, `Lovable Webhooks`, `Lucide Icons`, `Radix Accordion`, `Radix Alert Dialog`, `Radix Aspect Ratio`, `Radix Avatar`, `Radix Checkbox`, `Radix Collapsible`, `Radix Context Menu`, `Radix Dialog`, `Radix Dropdown Menu`, `Radix Hover Card`, `Radix Label`, `Radix Menubar`, `Radix Navigation Menu`, `Radix Popover`, `Radix Progress`, `Radix Radio Group`, `Radix Scroll Area`, `Radix Select`, `Radix Separator`, `Radix Slot`, `Radix Switch`, `Radix Tabs`, `Radix Toggle`, `Radix Tooltip`, `React Core`, `React DOM`, `React Day Picker`, `React Email`, `React Email Components`, `React Hook Form`, `Resizable Panels`, `Recharts Charts`, `Supabase JS`, `Tailwind Merge`, `Tailwind CSS`, `Tailwind Vite Plugin`, `React Router Dependency`, `React Start Dependency`, `Router Plugin`, `tw-animate-css Dependency`, `Vaul Dependency`, `Vite TS Config Paths`, `ws Dependency`, `Zod Validation`?**
  _High betweenness centrality (0.344) - this node is a cross-community bridge._
- **Why does `TableCard()` connect `Auth Shell & QR Codes` to `UI Dialog Components`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Why does `qrcode` connect `Auth Shell & QR Codes` to `Key Runtime Dependencies`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **What connects `name`, `private`, `sideEffects` to the rest of the system?**
  _297 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Dialog Components` be split into smaller, more focused modules?**
  _Cohesion score 0.051893408134642355 - nodes in this community are weakly interconnected._
- **Should `Daily Summary Server Functions` be split into smaller, more focused modules?**
  _Cohesion score 0.060496067755595885 - nodes in this community are weakly interconnected._
- **Should `Shared UI & PDF Helpers` be split into smaller, more focused modules?**
  _Cohesion score 0.06567992599444958 - nodes in this community are weakly interconnected._
