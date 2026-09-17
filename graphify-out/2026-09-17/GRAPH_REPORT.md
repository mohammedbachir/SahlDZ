# Graph Report - SahlDZ  (2026-09-17)

## Corpus Check
- 223 files · ~189,136 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1680 nodes · 3799 edges · 169 communities (76 shown, 93 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `30484a22`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- Vite Configuration
- default-menu.ts
- manager-db.functions.ts
- mobile-inventory.tsx
- preview-server.mjs
- summary-bot.functions.ts
- seed-cloud-data.mjs
- start-emulators.js
- DeliverySettingsPageView
- account.settings.index.tsx
- TakeawaySettingsPageView
- WelcomeSettingsPageView
- EmployeesSettingsPageView
- account.settings.restaurant.tsx
- push-env.sh
- seed-auth-emulator.js
- qrcode
- dashboard.settings.tsx
- ops.accounting.tsx
- r.$token.tsx
- t.$token.tsx
- class-variance-authority
- eslint-config-prettier
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh
- firebase-tools
- framer-motion
- i18next-browser-languagedetector
- @radix-ui/react-slider
- @radix-ui/react-toggle-group
- react-i18next
- sonner
- vite-plugin-pwa
- workbox-window
- @types/react
- typescript
- electron-env.d.ts
- dashboard.menu.tsx
- dashboard.orders.tsx
- mobile.index.tsx
- mobile.inventory.tsx
- mobile.reports.tsx
- vercel.json
- @radix-ui/react-dropdown-menu
- @radix-ui/react-popover
- @tanstack/react-query
- mobile.daily-summary.tsx

## God Nodes (most connected - your core abstractions)
1. `getFirebaseDb()` - 87 edges
2. `supabase` - 73 edges
3. `FileRoutesByPath` - 69 edges
4. `tx()` - 63 edges
5. `useRestaurantId()` - 55 edges
6. `formatDZD()` - 46 edges
7. `Button` - 37 edges
8. `cn()` - 28 edges
9. `Input` - 25 edges
10. `requireOpsAccess()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Preview (Mock) Mode` --semantically_similar_to--> `Backend-Free Preview Mode`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `useCountUp()` --indirect_call--> `tick()`  [INFERRED]
  src/pages/analytics.tsx → scripts/delivery-bot-poll.mjs
- `Supabase-Compatible Firebase Adapter` --conceptually_related_to--> `Firebase Adapter Redesign`  [INFERRED]
  CLAUDE.md → Docs/website-solutions.md
- `Firebase Adapter Social-Auth Cleanup` --conceptually_related_to--> `Supabase-Compatible Firebase Adapter`  [INFERRED]
  Docs/remove-social-login-prompt.md → CLAUDE.md
- `Backend-Free Preview Mode` --conceptually_related_to--> `Authenticated Preview Fallback`  [INFERRED]
  CLAUDE.md → Docs/website-issues.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Google/Apple Social Login Removal Decision** — docs_remove_social_login_prompt_prompt, docs_remove_social_login_prompt_email_password_auth, docs_remove_social_login_prompt_signinwithoauth_removal, docs_website_issues_oauth_not_implemented, docs_website_issues_oauth_callback_missing, docs_website_solutions_oauth_realtime [EXTRACTED 1.00]
- **Backend-Free Preview Mode Architecture and Risks** — claude_preview_mode, readme_preview_mode, docs_website_issues_authenticated_preview_fallback, docs_website_issues_static_preview_tokens, docs_website_solutions_preview_separation, docs_website_solutions_preview_token_security [INFERRED 0.85]
- **Supabase-Compatible Firebase Adapter Boundary** — claude_supabase_firebase_adapter, docs_website_issues_supabase_compat_naming, docs_website_issues_firebase_adapter_query_semantics, docs_website_issues_any_usage, docs_website_solutions_adapter_redesign, docs_website_solutions_backend_decision [INFERRED 0.85]

## Communities (169 total, 93 thin omitted)

### Community 0 - "UI Dialog Components"
Cohesion: 0.15
Nodes (19): ConfirmDialogProps, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay (+11 more)

### Community 1 - "Daily Summary Server Functions"
Cohesion: 0.09
Nodes (25): generateActivationCode(), getDailySummaryStatus, sendDailySummaryNow, setDailySummaryEnabled, createRestaurant, bearerOf(), FIREBASE_API_KEY, getAuthedUserId() (+17 more)

### Community 2 - "Shared UI & PDF Helpers"
Cohesion: 0.05
Nodes (65): jspdf, jspdf, AccountingPeriod, AccountingReport, ChannelStat, chunkIds(), DailyRow, loadAccountingReport() (+57 more)

### Community 3 - "Project Architecture Docs"
Cohesion: 0.05
Nodes (44): Arabic RTL i18n, Auth Guards and Post-Auth Routing, Dashboard and Operations Surfaces, Domain Operations Modules, Backend-Free Preview Mode, SahlDZ/Resto Hub, Supabase-Compatible Firebase Adapter, React 19 / TanStack Start / Vite / Tailwind / Radix Stack (+36 more)

### Community 4 - "Route Modules & Tree"
Cohesion: 0.02
Nodes (88): Route, Route, Route, AccountIndexRoute, AccountSettingsAppearanceRoute, AccountSettingsDeliveryRoute, AccountSettingsEmployeesRoute, AccountSettingsIndexRoute (+80 more)

### Community 5 - "Auth Shell & QR Codes"
Cohesion: 0.18
Nodes (14): CanWrite(), Textarea, analyzeReceipt, ReceiptItem, useAreaPermission(), emptyReceiptMeta, Ingredient, OpsInventory() (+6 more)

### Community 6 - "TypeScript Lib Types"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, ES2022, src, vite/client, vite.config.ts, compilerOptions, allowImportingTsExtensions (+19 more)

### Community 7 - "App Bar Controls"
Cohesion: 0.06
Nodes (36): DashboardOnboarding(), hasCompletedOnboarding(), OnboardingStep, steps, Annotation, DashboardTour(), TourStep, tourSteps (+28 more)

### Community 8 - "Shared Hooks & Utilities"
Cohesion: 0.06
Nodes (34): qrcode, qrcode, AuthShell(), DownloadBanner(), ManagerDownloadBanner(), AnimatedCounter(), appOrigin(), freshCachedTarget() (+26 more)

### Community 9 - "Cashier Server Functions"
Cohesion: 0.12
Nodes (23): CashierCategory, cashierCreateOrder, cashierGetMenu, cashierListActiveOrders, cashierListReady, cashierLogout, cashierLookupTable, cashierMarkPaid (+15 more)

### Community 10 - "Role Auth & Preview Mode"
Cohesion: 0.07
Nodes (45): RestaurantCodeStep(), BackHomeLink(), LoginLogo(), PinBackButton(), RestaurantPill(), StaffAccountButton(), StaffAvatar(), StaffPinInput() (+37 more)

### Community 11 - "Chef Server Functions"
Cohesion: 0.13
Nodes (22): getFirebaseDb(), getIndividualChefContextCore(), individualChefMarkReadyCore(), individualChefStartPreparingCore(), IngredientRow, RestaurantRow, sendLowStockAlert(), sendLowStockAlertFn (+14 more)

### Community 12 - "Waiter Server Functions"
Cohesion: 0.08
Nodes (31): disableCashierCore(), setCashierPinCore(), getPublicChefListCore(), listIndividualChefsCore(), createStaffAccount, deleteStaffAccount, deleteStaffAccountCore(), getSplashSettings (+23 more)

### Community 14 - "Dashboard Route Modules"
Cohesion: 0.05
Nodes (29): Route, Route, Route, Route, Route, Route, Route, Route (+21 more)

### Community 15 - "Dashboard Onboarding Tour"
Cohesion: 0.10
Nodes (28): ConfirmDialog(), DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle, Label (+20 more)

### Community 16 - "ESLint Dev Dependencies"
Cohesion: 0.13
Nodes (15): eslint, eslint-config-prettier, eslint-plugin-prettier, devDependencies, eslint, eslint-config-prettier, eslint-plugin-prettier, @types/qrcode (+7 more)

### Community 17 - "Firebase Adapter Core"
Cohesion: 0.28
Nodes (14): authWrapper(), buildQuery(), createFirebaseClient(), createRealtimeChannel(), createStubProxy(), executeFilterChain(), firestoreQueryChain(), makeDeleteChain() (+6 more)

### Community 18 - "UI Card Components"
Cohesion: 0.14
Nodes (16): Button, ButtonProps, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle (+8 more)

### Community 19 - "Package Metadata"
Cohesion: 0.20
Nodes (9): engines, node, name, entities, pnpm, overrides, private, sideEffects (+1 more)

### Community 20 - "Social Login Removal"
Cohesion: 0.28
Nodes (9): Email/Password Authentication, Remove Google and Apple Login Prompt, signInWithOAuth Removal, Lint/tsc/Build Validation, Missing OAuth Callback Route (Closed), OAuth Not Implemented (Closed), Realtime Not Implemented, OAuth Callback Fix (Obsolete) (+1 more)

### Community 21 - "Chatbot & Theme Controls"
Cohesion: 0.15
Nodes (12): 1. الملخص التنفيذي (Executive Summary), 2. النظام البصري «SahlDZ Administrative Ledger», 3. إعادة هندسة الهيكل والتنقل الإداري (Application Frame), 4. إعادة بناء صفحة المدير `/ops` المرجعية (Information Architecture), 5. تعميم نمط الأدوات والجداول على الصفحات التشغيلية, 6. قائمة الملفات المعدلة بدقة (Exact Files Changed), 7. نتائج الفحص والتحقق الفني (Verification Results), 8. الخلاصة (+4 more)

### Community 22 - "TanStack Router Setup"
Cohesion: 0.33
Nodes (5): getRouter(), Register, @tanstack/react-router, Register, routeTree

### Community 23 - "NPM Scripts"
Cohesion: 0.15
Nodes (13): scripts, bot:poll, build, build:apk, build:dev, dev, dev:emulators, format (+5 more)

### Community 24 - "Onboarding Flow"
Cohesion: 0.12
Nodes (29): AdminChatBot(), BotMessage, fallbackReply(), AiConfig, askAssistantAI, AFFIXES, AssistantMatch, bestMatches() (+21 more)

### Community 25 - "i18n & Root Layout"
Cohesion: 0.12
Nodes (15): SahlDZ Web Design System, الأزرار, البطاقات والملخصات, التنقل, الجداول, الخط والمسافات, الرموز البصرية المقترحة, الشخصية (+7 more)

### Community 26 - "Ops Overview KPIs"
Cohesion: 0.15
Nodes (12): 1. الملخص التنفيذي (Executive Summary), 2. النظام البصري «SahlDZ Administrative Ledger», 3. إعادة هندسة الهيكل والتنقل الإداري (Application Frame), 4. إعادة بناء صفحة المدير `/ops` المرجعية (Information Architecture), 5. تعميم نمط الأدوات والجداول على الصفحات التشغيلية, 6. قائمة الملفات المعدلة بدقة (Exact Files Changed), 7. نتائج الفحص والتحقق الفني (Verification Results), 8. الخلاصة (+4 more)

### Community 27 - "FloatingInput Primitive"
Cohesion: 0.08
Nodes (25): getPublicOrderStatus, getTableMenu, getTakeawayMenu, PlaceOrderContext, placeTableOrder, PlaceTableOrderInput, placeTakeawayOrder, PlaceTakeawayOrderInput (+17 more)

### Community 28 - "GlowButton Primitive"
Cohesion: 0.13
Nodes (22): hasArea(), hasInterface(), hasWrite(), INTERFACE_ICONS, PermissionsSelect(), Props, allowedInterfacePaths(), allowedStaffPaths() (+14 more)

### Community 29 - "GradientText Primitive"
Cohesion: 0.11
Nodes (32): ALL, AREA_LABELS, AREA_PATHS, AreaAccess, areasForRole(), build(), canViewArea(), canWriteArea() (+24 more)

### Community 30 - "SectionHeader Primitive"
Cohesion: 0.11
Nodes (25): addIndividualChef, assertOwnedKitchenStaff(), ChefListRow, deleteIndividualChef, deleteIndividualChefCore(), getIndividualChefContext, individualChefListActive, individualChefListActiveCore() (+17 more)

### Community 32 - "Reviews Route"
Cohesion: 0.23
Nodes (21): finalize(), findRestaurantByName(), findStaffByChat(), fromFields(), fsAdd(), fsDelete(), fsGet(), fsQuery() (+13 more)

### Community 33 - "Ops Complaints Route"
Cohesion: 0.10
Nodes (42): fmt(), HIDDEN_KPIS, Kpis, OpsOverview(), RecentEntry, resolveRestaurantId(), Badge(), BadgeProps (+34 more)

### Community 35 - "Ops Expenses Route"
Cohesion: 0.22
Nodes (10): MENU_LAYOUTS, MENU_THEMES, MenuAppearance, MenuLayoutId, MenuThemeId, parseMenuAppearance(), serializeMenuAppearance(), AppearanceSettingsPageView() (+2 more)

### Community 36 - "Ops Reports Route"
Cohesion: 0.08
Nodes (37): supabase, CsvMenuRow, importMenuItems, formatDZD(), numberFormat, useRestaurantId(), buildWeeklyReport(), WeeklyDailyRow (+29 more)

### Community 37 - "Ops Staff Performance Route"
Cohesion: 0.22
Nodes (10): beep(), useNewOrderNotifications(), ColumnDef, COLUMNS, getNextStatus(), Order, OrderCard(), OrderItem (+2 more)

### Community 38 - "Ops Suppliers Route"
Cohesion: 0.31
Nodes (6): updateSplashSettings, getServerAuthHeaders(), SplashFeature, WelcomeSettingsPageView(), Route, Route

### Community 39 - "Ops Waste Route"
Cohesion: 0.16
Nodes (18): addIndividualChefCore(), verifyIndividualChefPinCore(), effectiveStaffPermissions(), generateUniquePin(), generateUniqueSerial(), isStaffSessionExpired(), makeStaffSessionToken(), parseStaffSessionToken() (+10 more)

### Community 42 - "Cloudflare Vite Plugin"
Cohesion: 0.14
Nodes (20): clearKioskRole(), staffLoginFailPath(), getWaiterContext, waiterClaimOrder, waiterListReadyOrders, waiterLogout, waiterMarkServed, waiterUnclaimOrder (+12 more)

### Community 49 - "ESLint Prettier Plugin"
Cohesion: 0.18
Nodes (10): SahlDZ — موجز إعادة تصميم واجهة الويب, الشخصية المعتمدة: SahlDZ Administrative Ledger, القرار, المستخدم والسياق, الهدف, تفويض إعادة التأليف البنيوي, خارج النطاق, ما هو داخل النطاق (+2 more)

### Community 50 - "exceljs Dependency"
Cohesion: 0.17
Nodes (21): createFirebaseUser(), createStaffAccountCore(), addStaff, addStaffCore(), assertOwnedStaff(), cleanPermissions(), deleteStaff, deleteStaffCore() (+13 more)

### Community 61 - "Lovable Webhooks"
Cohesion: 0.22
Nodes (13): grantedInterfaces(), clearAllStaffSessions(), hasActivePreviewStaffSession(), individualChefTokenKey(), lastOpenTab(), LEGACY_KEYS, LegacyKeys, read() (+5 more)

### Community 64 - "Radix Alert Dialog"
Cohesion: 0.25
Nodes (8): getCashierStatusCore(), getPublicCashierLoginInfoCore(), loadCashierConfig(), parseCashierToken(), verifyCashierPinCore(), hmacSign(), hmacVerify(), mintCashierToken()

### Community 65 - "Radix Aspect Ratio"
Cohesion: 0.25
Nodes (6): addDeliveryDriver, listDeliveryDrivers, notifyDriversForOrder, removeDeliveryDriver, StaffRow, toggleDeliveryDriver

### Community 68 - "Radix Collapsible"
Cohesion: 0.12
Nodes (17): exceljs, dependencies, exceljs, @radix-ui/react-collapsible, @radix-ui/react-dialog, @radix-ui/react-progress, @radix-ui/react-slider, react-email (+9 more)

### Community 70 - "Radix Dialog"
Cohesion: 0.10
Nodes (19): المرحلة 2 — التحول إلى SahlDZ Administrative Ledger [مكتملة بنجاح ✅], المرحلة 3 — إعادة تأليف الواجهة بالكامل [مطلوبة], المهمة 0 — حصر أثر التنفيذ [مكتملة], المهمة 1 — أساس التصميم المشترك [مكتملة], المهمة 2.1 — إطار برنامج ERP مكتبي [مكتملة], المهمة 2.2 — إعادة بناء `/ops` كصفحة متابعة ودفتر أستاذ [مكتملة], المهمة 2.3 — تعميم نمط الأدوات والجداول [مكتملة], المهمة 2 — الهيكل والتنقل الإداري [مكتملة] (+11 more)

### Community 71 - "Radix Dropdown Menu"
Cohesion: 0.19
Nodes (13): cashierCreateOrderCore(), cashierListActiveOrdersCore(), cashierListReadyCore(), cashierLookupTableCore(), cashierMarkPaidCore(), CashierNewOrderInput, cashierUpdateOrderStatusCore(), cashierZReportCore() (+5 more)

### Community 76 - "Radix Popover"
Cohesion: 0.29
Nodes (11): DriverSession, finalizeDriver(), findRestaurantByName(), findStaffByChat(), getDeliveryBotStatus, linkedDriverReply(), nextDriverSerial(), processDeliveryBotUpdates (+3 more)

### Community 77 - "Radix Progress"
Cohesion: 0.22
Nodes (12): ar, getAutoScreenPath(), getUnifiedAutoScreenPath(), isStaffTokenActive(), KIOSK_ROLES, KioskRole, listActiveStaffSessions(), read() (+4 more)

### Community 81 - "Radix Separator"
Cohesion: 0.20
Nodes (9): cashierGetMenuCore(), getMenuOptionsForItem, getMenuOptionsForItemsCore(), MenuOption, OptionChoice, saveMenuOptions, fetchMenu(), buildMenuImagePath() (+1 more)

### Community 91 - "React Email Components"
Cohesion: 0.25
Nodes (7): الحالة التقنية الحالية, الحدود الوظيفية, ثوابت لا تمس, حدود إعادة الهيكلة المصرح بها, خريطة الواجهة المعمارية — SahlDZ, طبقات التغيير المسموح بها, ملاحظات تقنية ظاهرة قبل التنفيذ

### Community 98 - "Tailwind Vite Plugin"
Cohesion: 0.25
Nodes (9): hasUnifiedStaffSessionEver(), cashierFailPath(), escapeHtml(), fmtOrderNo(), OrderTrackingView(), Page(), printHtml(), printOrderTicket() (+1 more)

### Community 100 - "React Start Dependency"
Cohesion: 0.22
Nodes (8): fs, hubContent, newHub, path, routesDir, srcDir, views, viewsDir

### Community 104 - "Vite TS Config Paths"
Cohesion: 0.19
Nodes (13): NotificationManager(), firebaseConfig, getFirebaseApp(), initializeFCM(), onForegroundMessage(), removeFCMToken(), saveFCMToken(), COLOR_MAP (+5 more)

### Community 109 - "QRCode Types"
Cohesion: 0.22
Nodes (8): fs, hubContent, newHub, path, routesDir, srcDir, views, viewsDir

### Community 111 - "WS Types"
Cohesion: 0.28
Nodes (4): AccountShell(), Restaurant, Route, Route

### Community 112 - "TypeScript ESLint"
Cohesion: 0.25
Nodes (6): clientDir, config, configPath, out, root, staticDir

### Community 113 - "Vite Bundler"
Cohesion: 0.27
Nodes (10): INTERFACE_TAB_DEFS, OPS_AREA_ICONS, StaffTabs(), TabDef, allowedOpsAreaPaths(), grantedOpsAreas(), opsAreaLabel(), opsAreaPath() (+2 more)

### Community 118 - "default-menu.ts"
Cohesion: 0.25
Nodes (8): buildDefaultCashierMenu(), DEFAULT_CATEGORIES, DEFAULT_MENU_ITEMS, DefaultCategory, DefaultMenuItem, DefaultOption, DefaultOptionChoice, NewOrderView()

### Community 119 - "manager-db.functions.ts"
Cohesion: 0.32
Nodes (3): listRestaurantManagers, RestaurantManagerRow, Route

### Community 121 - "preview-server.mjs"
Cohesion: 0.29
Nodes (5): CLIENT_DIR, __dirname, MIME, PORT, server

### Community 123 - "seed-cloud-data.mjs"
Cohesion: 0.47
Nodes (5): fieldValue(), main(), NOW, putDoc(), tokenPath

### Community 124 - "start-emulators.js"
Cohesion: 0.53
Nodes (5): __dirname, isPortOpen(), main(), ROOT, waitForPort()

### Community 125 - "DeliverySettingsPageView"
Cohesion: 0.33
Nodes (4): DeliverySettingsPageView(), getServerAuthHeaders(), Route, Route

### Community 126 - "account.settings.index.tsx"
Cohesion: 0.47
Nodes (3): SettingsHubView(), Route, Route

### Community 127 - "TakeawaySettingsPageView"
Cohesion: 0.33
Nodes (4): getServerAuthHeaders(), TakeawaySettingsPageView(), Route, Route

### Community 129 - "EmployeesSettingsPageView"
Cohesion: 0.40
Nodes (3): EmployeesSettingsPageView(), Route, Route

### Community 130 - "account.settings.restaurant.tsx"
Cohesion: 0.38
Nodes (4): Restaurant, RestaurantSettingsPageView(), Route, Route

### Community 131 - "push-env.sh"
Cohesion: 0.50
Nodes (3): NO_UPDATE_NOTIFIER, push-env.sh script, VERCEL_FORCE_NO_UPDATE

### Community 132 - "seed-auth-emulator.js"
Cohesion: 0.67
Nodes (3): createUser(), main(), USERS

### Community 138 - "class-variance-authority"
Cohesion: 0.15
Nodes (17): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, buildMenuImagePath() (+9 more)

## Knowledge Gaps
- **582 isolated node(s):** `fs`, `path`, `srcDir`, `routesDir`, `viewsDir` (+577 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **93 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Radix Collapsible` to `WelcomeSettingsPageView`, `Shared UI & PDF Helpers`, `qrcode`, `ops.accounting.tsx`, `Shared Hooks & Utilities`, `Key Runtime Dependencies`, `framer-motion`, `i18next-browser-languagedetector`, `@radix-ui/react-slider`, `@radix-ui/react-toggle-group`, `Package Metadata`, `react-i18next`, `sonner`, `vite-plugin-pwa`, `workbox-window`, `mobile.index.tsx`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-popover`, `@tanstack/react-query`, `clsx Dependency`, `cmdk Dependency`, `date-fns Dependency`, `Embla Carousel Dependency`, `Firebase Dependency`, `Floating UI Dependency`, `Hookform Resolvers`, `i18next Dependency`, `input-otp Dependency`, `jspdf-autotable Dependency`, `Lovable Cloud Auth`, `Lovable Email JS`, `Lucide Icons`, `Radix Accordion`, `Radix Avatar`, `Radix Checkbox`, `Radix Context Menu`, `Radix Hover Card`, `Radix Label`, `Radix Menubar`, `Radix Navigation Menu`, `Radix Radio Group`, `Radix Scroll Area`, `Radix Select`, `Radix Slot`, `Radix Switch`, `Radix Tabs`, `Radix Toggle`, `Radix Tooltip`, `React Core`, `React DOM`, `React Day Picker`, `React Email`, `React Hook Form`, `Resizable Panels`, `Recharts Charts`, `Supabase JS`, `Tailwind Merge`, `Tailwind CSS`, `React Router Dependency`, `Router Plugin`, `tw-animate-css Dependency`, `Vaul Dependency`, `ws Dependency`, `Zod Validation`, `mobile-inventory.tsx`?**
  _High betweenness centrality (0.210) - this node is a cross-community bridge._
- **Why does `supabase` connect `Ops Reports Route` to `UI Dialog Components`, `Daily Summary Server Functions`, `Shared UI & PDF Helpers`, `account.settings.restaurant.tsx`, `Auth Shell & QR Codes`, `App Bar Controls`, `Shared Hooks & Utilities`, `Cashier Server Functions`, `Role Auth & Preview Mode`, `Chef Server Functions`, `Waiter Server Functions`, `class-variance-authority`, `Dashboard Onboarding Tour`, `Firebase Adapter Core`, `UI Card Components`, `FloatingInput Primitive`, `GradientText Primitive`, `SectionHeader Primitive`, `Ops Complaints Route`, `Ops Expenses Route`, `Ops Staff Performance Route`, `Ops Suppliers Route`, `Ops Waste Route`, `exceljs Dependency`, `Radix Aspect Ratio`, `Radix Popover`, `Radix Separator`, `Vite TS Config Paths`, `WS Types`, `manager-db.functions.ts`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `jspdf` connect `Shared UI & PDF Helpers` to `Radix Collapsible`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `srcDir` to the rest of the system?**
  _582 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Daily Summary Server Functions` be split into smaller, more focused modules?**
  _Cohesion score 0.08669354838709678 - nodes in this community are weakly interconnected._
- **Should `Shared UI & PDF Helpers` be split into smaller, more focused modules?**
  _Cohesion score 0.05403508771929825 - nodes in this community are weakly interconnected._
- **Should `Project Architecture Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.051515151515151514 - nodes in this community are weakly interconnected._