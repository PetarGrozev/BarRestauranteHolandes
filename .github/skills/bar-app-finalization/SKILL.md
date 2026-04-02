---
name: bar-app-finalization
description: 'Use when finalizing the bar restaurant app, reviewing missing features, adding notes to ordered items, fixing the order browser toolbar while scrolling, preventing invalid order deletion after delivery or table close, limiting 10-minute alerts to employees, or revising seguridad general. Keywords: finalizar app bar restaurante, notas pedido cocina, order-browser-toolbar fijo, no borrar pedido entregado, notificacion 10 min empleados, revisar seguridad general, QR mesa, customer flow, kitchen, staff, admin.'
argument-hint: 'Describe the pending gaps or finish-work needed in the bar app, including ordering notes, toolbar behavior, deletion rules, notifications, or security concerns.'
user-invocable: true
---

# Bar App Finalization

## What This Skill Produces
- A scoped finish-pass for the bar and restaurant app focused on missing product-ordering behavior, role-safe notifications, route protection, and regression-resistant enforcement.
- Concrete code changes instead of a generic review when the request is implementable.
- A short findings list when a change is blocked by an unclear product rule.

## Use This Skill When
- The request is to finish the app, close product gaps, or do an end-to-end polish pass.
- The user asks for notes on ordered food or drinks, especially if the note must reach kitchen or staff.
- The order browser toolbar moves incorrectly on scroll and needs fixed positioning.
- The app must stop deleting orders in states that should be immutable, such as delivered orders or orders from a closed table.
- 10-minute delay alerts should reach employees only and never leak into customer-facing QR flows.
- The user asks for a general security review across admin, staff, kitchen, and customer QR routes.

## Repo Anchors
- Customer QR flow enters through `app/mesa/[tableId]/page.tsx` and route isolation is enforced in `proxy.ts`.
- Shared app chrome is injected from `app/layout.tsx` through `src/components/AppShell.tsx`.
- Ordering UI and alert orchestration live in `app/order/OrderPageClient.tsx`.
- Order polling and mutations live in `src/hooks/useOrders.ts` and the API routes under `pages/api/orders/`.
- Timer UI for the 10-minute threshold lives in `src/components/HoldTimer.tsx` and `src/lib/orderTimers.ts`.
- Server-side order creation and deletion rules live in `lib/db.ts`.
- Toolbar scroll behavior is styled in `src/styles/globals.css` under `.order-browser-toolbar`.

## Workflow
1. Convert the user request into a bounded checklist.
   - Separate functional work from security work.
   - Group items into: ordering UX, status/deletion rules, notifications, route/access control, and validation.

2. Inspect the current implementation before editing.
   - Read the route entry points, shared layouts, relevant API handlers, and database helpers.
   - Confirm whether the requested behavior already exists in UI only, server only, or neither.
   - Reuse the existing custom agent `Bar App Finalizer` for read-heavy exploration when a broad repo scan helps.

3. Decide whether the change is UI-only, API-only, or requires persistence.
   - Sticky toolbar problems are usually CSS-only.
   - Employee-only alerts usually require both UI gating and route or role checks.
   - Deletion restrictions must be enforced server-side even if the UI also hides the action.
   - Notes attached to a specific ordered line usually require persistence and API updates if no note field already exists.

4. Implement the smallest complete fix.
   - Prefer enforcing invariants in `lib/db.ts` or the API route, then align the UI with those rules.
   - Do not rely on client-side hiding alone for anything related to auth, deletion, or employee-only visibility.
   - Keep QR customer mode isolated from admin, staff, kitchen, and global navigation.

5. Verify the affected flows.
   - Re-check order creation, order deletion, status progression, and table close/reopen flows.
   - Confirm the customer QR route cannot trigger staff/admin-only affordances.
   - Validate CSS fixes on the order browser area so the toolbar remains stable during scroll.
   - Run targeted error or type checks when practical.

6. Report outcome and residual risk.
   - State what was changed.
   - Call out any assumptions that still need product confirmation.
   - Highlight remaining security or data-model gaps if a full fix was intentionally deferred.

## Decision Points

### 1. Notes On Ordered Items
- Default to a line-item note attached before the product is added to the cart.
- Put the note action on the same line where the item is being added so the workflow stays local to that product choice.
- If the note must be visible in kitchen, persist it in the order or order-item model and surface it in both order review and kitchen views.
- If the current schema has no suitable field, extend the schema deliberately and keep the API payload explicit.

### 2. Invalid Order Deletion
- If a deletion rule matters to business logic, enforce it in `lib/db.ts` and return a specific API error.
- Treat delivered orders and orders belonging to a closed table as independently non-deletable.
- If stock is restored on deletion today, make sure the new immutable states bypass that path entirely.

### 3. 10-Minute Alerts
- Distinguish between a visual timer on a card and an active notification or alert queue.
- Delayed-order notifications may be shown to staff, kitchen, and admin, but never to customer QR pages.
- If one employee view should stay silent and only show the passive timer, gate the active notification separately from the visible countdown.

### 4. Security Review
- Check admin-only APIs for session validation.
- Check QR customer flows for manual URL access to internal routes.
- Check secrets for accidental `NEXT_PUBLIC_*` exposure when the value should stay server-side.
- Check whether UI restrictions are backed by server restrictions.

## Completion Criteria
- Requested missing features are implemented end to end, not only mocked in the UI.
- Destructive actions are blocked on the server for forbidden order states.
- Customer QR flows cannot see or trigger employee-only notifications or internal navigation.
- Toolbar behavior is stable while scrolling on the ordering page.
- Any new schema or API shape is reflected in all affected views.
- Verification was attempted and either passed or any blocker was reported plainly.

## Repo-Specific Hints
- `proxy.ts` already uses customer-mode cookies to isolate `/mesa/<tableId>` traffic from internal routes.
- `pages/api/orders/create.ts` already allows either admin session or matching customer-table cookies for order creation.
- `pages/api/orders/[id].ts` currently protects deletion with admin auth, but business-rule guards still belong in `lib/db.ts`.
- `lib/auth.ts` currently falls back to `NEXT_PUBLIC_AUTH_SECRET` and `NEXT_PUBLIC_ADMIN_PASSWORD`; treat that as a security smell to review before shipping.
- Current repo database practice is Prisma with Postgres runtime, and schema changes may require the repo's existing Prisma workflow rather than assuming a clean migration flow.

## Confirmed Product Rules
- Notes are per product line and should be set before adding that line to the cart.
- Order deletion is forbidden if the order is delivered or if its table is already closed.
- The 10-minute active warning can notify staff, kitchen, and admin, but must never surface in customer mode.

## Suggested Output
- Findings or requested changes grouped by ordering, notifications, deletion rules, and security.
- The minimal file set changed.
- The verification performed.
- Any unresolved product-rule questions that need a decision.