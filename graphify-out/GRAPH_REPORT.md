# Graph Report - .  (2026-08-01)

## Corpus Check
- 96 files · ~55,183 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 776 nodes · 1381 edges · 106 communities (24 shown, 82 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.55)
- Token cost: 2,500 input · 4,200 output

## Community Hubs (Navigation)
- UI Dialog Components
- Server Functions & Delivery
- Chat & Onboarding
- Auth & QR System
- Reports & Notifications
- Route Tree
- Documentation
- Ops Tours
- TypeScript Config
- Waiter Functions
- Cashier Functions
- Preview Mode
- Chef Functions
- UI Card Components
- Package Dependencies
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103

## God Nodes (most connected - your core abstractions)
1. `FileRoutesByPath` - 32 edges
2. `Button` - 26 edges
3. `cn()` - 25 edges
4. `compilerOptions` - 20 edges
5. `supabase` - 19 edges
6. `useRestaurantId()` - 17 edges
7. `Card` - 14 edges
8. `formatDZD()` - 13 edges
9. `tx()` - 11 edges
10. `previewExpiry()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `exportAnalyticsPDF()` --references--> `jspdf`  [EXTRACTED]
  src/lib/exportReports.ts → package.json
- `TableCard()` --references--> `qrcode`  [EXTRACTED]
  src/routes/dashboard.tables.tsx → package.json
- `DropdownMenuShortcut()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dropdown-menu.tsx → src/lib/utils.ts
- `Page()` --indirect_call--> `beep()`  [INFERRED]
  src/routes/kitchen-screen.tsx → src/hooks/useNewOrderNotifications.ts
- `ReviewsPage()` --calls--> `useRestaurantId()`  [EXTRACTED]
  src/routes/dashboard.reviews.tsx → src/lib/restaurant.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Onboarding Tour Component Set** — readme_dashboardtour, readme_opstour, readme_tourannotation, readme_dashboardonboarding [EXTRACTED 1.00]
- **Preview Mode Login Routes** — readme_waiterlogin, readme_kitchenlogin, readme_cashierlogin, readme_previewmode [EXTRACTED 1.00]
- **Arabic Restaurant Theme Elements** — readme_cairofont, readme_rtl, readme_arabic, readme_goldcolor [EXTRACTED 1.00]

## Communities (106 total, 82 thin omitted)

### Community 0 - "UI Dialog Components"
Cohesion: 0.06
Nodes (63): ConfirmDialog(), ConfirmDialogProps, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+55 more)

### Community 1 - "Server Functions & Delivery"
Cohesion: 0.06
Nodes (49): DialogDescription, getDailySummaryStatus, sendDailySummaryNow, setDailySummaryEnabled, addDeliveryDriver, listDeliveryDrivers, removeDeliveryDriver, toggleDeliveryDriver (+41 more)

### Community 2 - "Chat & Onboarding"
Cohesion: 0.06
Nodes (41): AdminChatBot(), BOT_REPLIES, Message, DashboardOnboarding(), hasCompletedOnboarding(), OnboardingStep, steps, Annotation (+33 more)

### Community 3 - "Auth & QR System"
Cohesion: 0.07
Nodes (28): qrcode, qrcode, AuthShell(), AnimatedCounter(), key, supabase, url, appOrigin() (+20 more)

### Community 4 - "Reports & Notifications"
Cohesion: 0.07
Nodes (36): jspdf, jspdf, PopoverContent, beep(), useNewOrderNotifications(), AnalyticsExportPayload, exportAnalyticsExcel(), exportAnalyticsPDF() (+28 more)

### Community 5 - "Route Tree"
Cohesion: 0.05
Nodes (40): CashierLoginRoute, CashierRoute, DashboardAnalyticsRoute, DashboardMenuRoute, DashboardOrdersRoute, DashboardReviewsRoute, DashboardRoute, DashboardRouteChildren (+32 more)

### Community 6 - "Documentation"
Cohesion: 0.07
Nodes (32): 24h Token Expiry, Animated Counter, Arabic Language Support, Cairo Font, Cashier Route, Cashier Login Route, DashboardOnboarding Component, DashboardTour Component (+24 more)

### Community 7 - "Ops Tours"
Cohesion: 0.08
Nodes (25): Annotation, OPS_PATHS, OpsPath, OpsTour(), OpsTourStep, opsTourSteps, STATIC_SIDE, TourAnnotation() (+17 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, ES2022, src, vite/client, vite.config.ts, compilerOptions, allowImportingTsExtensions (+19 more)

### Community 9 - "Waiter Functions"
Cohesion: 0.13
Nodes (19): addWaiter, deleteWaiter, getPublicWaiterList, getWaiterContext, listWaiters, toggleWaiter, updateWaiterPin, verifyWaiterPin (+11 more)

### Community 10 - "Cashier Functions"
Cohesion: 0.16
Nodes (17): cashierListReady, cashierLogout, cashierLookupTable, cashierMarkPaid, cashierZReport, disableCashier, getCashierContext, getCashierStatus (+9 more)

### Community 11 - "Preview Mode"
Cohesion: 0.16
Nodes (13): getPublicCashierLoginInfo, verifyCashierPin, getPublicChefList, verifyIndividualChefPin, PREVIEW_RESTAURANT, previewExpiry(), PreviewRestaurant, Page() (+5 more)

### Community 12 - "Chef Functions"
Cohesion: 0.15
Nodes (17): addIndividualChef, deleteIndividualChef, getIndividualChefContext, individualChefListActive, individualChefLogout, individualChefMarkReady, individualChefStartPreparing, listIndividualChefs (+9 more)

### Community 13 - "UI Card Components"
Cohesion: 0.20
Nodes (9): Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Route (+1 more)

### Community 14 - "Package Dependencies"
Cohesion: 0.12
Nodes (17): class-variance-authority, framer-motion, i18next-browser-languagedetector, dependencies, class-variance-authority, framer-motion, i18next-browser-languagedetector, @radix-ui/react-collapsible (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (12): Route, Route, Route, Route, Route, Route, Route, Route (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (13): eslint, eslint-config-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, eslint, eslint-config-prettier, eslint-plugin-react-hooks (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (9): engines, node, name, entities, pnpm, overrides, private, sideEffects (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (6): getRouter(), Register, @tanstack/react-router, Register, routeTree, startInstance

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (7): scripts, build, build:dev, dev, format, lint, preview

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (4): Filter, Review, ReviewsPage(), Route

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (4): CountItem, CountRow, Ingredient, Route

## Knowledge Gaps
- **292 isolated node(s):** `name`, `private`, `sideEffects`, `type`, `node` (+287 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **82 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Package Dependencies` to `Auth & QR System`, `Reports & Notifications`, `Community 17`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 40`, `Community 41`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 73`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 81`, `Community 82`, `Community 83`, `Community 84`, `Community 85`, `Community 86`, `Community 87`, `Community 88`, `Community 89`, `Community 90`, `Community 91`, `Community 92`, `Community 93`, `Community 94`, `Community 95`?**
  _High betweenness centrality (0.371) - this node is a cross-community bridge._
- **Why does `TableCard()` connect `Auth & QR System` to `UI Dialog Components`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Why does `qrcode` connect `Auth & QR System` to `Package Dependencies`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **What connects `name`, `private`, `sideEffects` to the rest of the system?**
  _292 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Dialog Components` be split into smaller, more focused modules?**
  _Cohesion score 0.0576592082616179 - nodes in this community are weakly interconnected._
- **Should `Server Functions & Delivery` be split into smaller, more focused modules?**
  _Cohesion score 0.06110102843315184 - nodes in this community are weakly interconnected._
- **Should `Chat & Onboarding` be split into smaller, more focused modules?**
  _Cohesion score 0.06108597285067873 - nodes in this community are weakly interconnected._