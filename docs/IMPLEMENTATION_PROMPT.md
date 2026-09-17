# Implementation Prompt — SahlDZ V4 Complete Replacement

```text
You are the implementation engineer for SahlDZ. Build V4: a complete replacement of the browser management interface. Do not improve, restyle, tidy, or iterate on the existing UI. Treat the existing UI as visually discarded. Preserve only product behavior, data, routes, permissions, and working interactions.

The interface stays Arabic and RTL. This prompt is English only; never translate product UI into English.

Read these files in full before any code change. They are binding requirements:
- docs/PROJECT_BRIEF.md
- docs/DESIGN.md
- docs/ARCHITECTURE.md
- docs/TASKS.md
- docs/COMPLETE_REDESIGN_BRIEF.md

Read graphify-out/GRAPH_REPORT.md. Read graphify-out/graph.json only when a shared-component dependency cannot be understood otherwise. Inspect only relevant files for the current task.

## The non-negotiable goal

A customer comparing the old and finished /ops pages must conclude they are different products, not two versions of the same design. The old composition is forbidden: no permanent right sidebar, no application-download banner, no KPI-card grid, no equal metric cards, no floating assistant button, and no blank lower dashboard canvas.

Do not change colors/radii/shadows first. Start by replacing page composition, DOM hierarchy, navigation model, and information architecture. Reusing the old JSX structure and changing class names is a failed implementation.

## New product shell: Restaurant Control Desk

Build a new full-width desktop workspace:

1. A two-row command area at the top, replacing the sidebar completely.
   - Row 1: SahlDZ brand, restaurant/branch context, universal search affordance, selected period, notifications, account.
   - Row 2: horizontal module navigation or a module menu for Daily Overview, Operations, Finance, Resources, Reports & Control, and System.
   - You may regroup and lightly rename displayed navigation labels. Every existing underlying route, link target, permission gate, and capability must remain reachable and unchanged.

2. A new /ops “daily work desk”, not a dashboard card grid:
   - Work Queue first: actionable real issues (low stock, pending salaries, waste, complaints) that lead to current relevant routes.
   - Performance Brief second: one connected reading of current revenue, expenses, net profit, and at most one real operational indicator. These must not be separate KPI cards or colored icon tiles.
   - Recent Activity third: a useful existing-data transaction/activity table, report entry point, or action-oriented empty state. Never leave a large empty canvas and never create mock records or fake charts.

3. New interior-page anatomy:
   - Context/title + page toolbar + primary content workspace.
   - Prefer a table, ledger, record list, form, or contextual tabs as the main content—not nested generic cards.
   - Preserve existing add/edit/delete/filter/export/dialog flows and their logic.

## Visual language

Use the V4 visual rules from docs/DESIGN.md: light-only, warm ivory canvas, white work surfaces, charcoal text, warm-gray support text, restrained copper primary action, semantic state colors only, compact type, 4–6px controls, thin borders, and no default surface shadows. It should feel like a calm Arabic management product with mature desktop-software discipline, not a trendy SaaS application and not a retro operating-system imitation.

Absolutely do not use: dark mode, gradients, glassmorphism, backdrop blur, glow, blur blobs, neon, 3D/tilt, decorative animation, large colored icon squares, chatbot/assistant/sparkles, vague AI wording, marketing banners, or floating action buttons.

## Allowed scope

You may modify only browser management surfaces and their necessary shared UI:
- src/styles.css and needed src/components/ui/* primitives
- src/routes/ops.tsx and src/routes/ops.*.tsx
- src/components/ops-overview.tsx and new focused view components
- src/components/account-shell.tsx, src/routes/account/*, src/pages/settings-views/*
- relevant browser administration surfaces reachable through src/routes/dashboard.tsx

Do not modify: src/routes/index.tsx, cashier, kitchen, waiter, mobile, QR/public ordering, Electron, kiosk flows, database schema, Supabase/Firebase configuration, server functions, APIs, queries, mutations, auth, permissions, financial calculations, route names, or src/routeTree.gen.ts. Do not add dependencies. Do not overwrite or revert unrelated work. Do not use destructive Git commands.

## Functional invariants

Keep all real data loading and mutation logic, calculations, exports, validation, confirmation dialogs, toasts, onboarding/tour behavior, data-annotate attributes, navigation behavior, login/logout, and role-based data hiding/write permissions. Never use mock data and never remove a feature because it is difficult to display in the new layout.

## Implementation order

1. Read all mandatory docs and inspect the current in-scope implementation.
2. Identify only the files required for V4; preserve unrelated work.
3. Replace OpsLayout and its permanent sidebar with the two-row command/module navigation shell.
4. Rewrite OpsOverview as a new DOM/layout for Work Queue + Performance Brief + Recent Activity. Do not retain the old KPI-array/card implementation as its visual structure.
5. Build shared interior-page workspace patterns and apply them to in-scope operations/settings pages.
6. Verify all behavior and roles.
7. Run graphify update . after actual code changes.
8. Update docs/TASKS.md honestly. Never claim a visual check, test, or build that did not run.

## Required verification

Run npm run lint, npm run test, and npm run build. Manually check /ops, /ops/inventory, /ops/expenses, /ops/reports, and /account/settings at 1440px and 390px, using an admin and one restricted role.

Capture a fresh /ops screenshot. Before completion, verify all of these:
- No permanent sidebar remains.
- No KPI grid/equal metric cards remain.
- No download banner or floating chatbot remains.
- The new page is visibly a work desk with Work Queue + Performance Brief + Recent Activity.
- All routes, CRUD actions, filters, dialogs, exports, and role restrictions still work.

In the final response, list exact files changed, explain how the new layout differs structurally from the prior UI, report the test/build results, state preserved behavior, and flag any real deferred work or risk.
```
