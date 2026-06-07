# Navigation UI Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the top navigation and reduce mobile overflow in schedule and template workflows.

**Architecture:** Keep `AppShell` as the server session boundary. Add a small client component for active nav links. Use CSS-only `<details>` for the account menu.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Testing Library, Vitest, Playwright.

---

### Task 1: AppShell Navigation Tests

**Files:**
- Modify: `tests/components/app-shell.test.tsx`

- [ ] **Step 1: Write failing tests**

Assert that primary navigation contains only dashboard, availability, schedules, and members. Assert that the current schedules link receives `aria-current="page"`. Assert that settings and admin links are in the account menu.

- [ ] **Step 2: Run test**

Run: `npm test -- tests/components/app-shell.test.tsx`

Expected: fail because the current shell renders a single flat nav row and has no active state.

### Task 2: Navigation Implementation

**Files:**
- Create: `src/components/app-nav.tsx`
- Modify: `src/components/app-shell.tsx`

- [ ] **Step 1: Add active nav link component**

Create a client component that uses `usePathname()` and sets active styles plus `aria-current`.

- [ ] **Step 2: Split shell navigation**

Render primary work links in the main row, desktop secondary links separately, and utility actions in a details menu.

- [ ] **Step 3: Run focused test**

Run: `npm test -- tests/components/app-shell.test.tsx`

Expected: pass.

### Task 3: Mobile Overflow Cleanup

**Files:**
- Modify: `src/components/ui.tsx`
- Modify: `src/app/schedules/page.tsx`
- Modify: `src/app/templates/page.tsx`

- [ ] **Step 1: Make controls shrink safely**

Add `min-w-0 w-full` to shared input/select/textarea classes.

- [ ] **Step 2: Constrain schedule form grids**

Use `minmax(0, 1fr)` for schedule creation form columns.

- [ ] **Step 3: Compact template delete rows**

Keep template detail and delete action in a two-column row on all viewports.

### Task 4: Verification

**Files:**
- Verify only

- [ ] **Step 1: Run automated checks**

Run: `npm test`, `npm run lint`, and `npm run build`.

- [ ] **Step 2: Browser check**

Use Playwright against `http://localhost:3000` at desktop and mobile widths to verify no horizontal overflow and the nav has the intended structure.

- [ ] **Step 3: Commit and push**

Commit with message `Improve navigation and mobile layout`.
