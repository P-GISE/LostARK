# UX Bugfix Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix unauthenticated protected-page errors and add planning UI improvements across sync, boss checklist, schedule creation, and availability overview.

**Architecture:** Keep server-side authorization in existing page/server modules, add one reusable client picker for schedule template selection, and store character sync failure state on `Member`. Existing sorting and boss grouping helpers remain the source of display order.

**Tech Stack:** Next.js App Router, React client components, Prisma/PostgreSQL, Vitest, Testing Library.

---

### Task 1: Protected Page Redirect

**Files:**
- Modify: `src/server/auth-context.ts`
- Modify protected page top-level calls in `src/app/calendar/page.tsx`, `src/app/members/page.tsx`, `src/app/notifications/page.tsx`, `src/app/schedules/page.tsx`, `src/app/schedules/[scheduleId]/page.tsx`, `src/app/settings/page.tsx`, `src/app/templates/page.tsx`
- Test: `tests/server/auth-context.test.ts`

- [ ] Add a failing test that no member session redirects to `/auth/login?next=%2Fmembers`.
- [ ] Add an optional `loginRedirectPath` option to `requireCurrentMember`.
- [ ] Pass the option only from protected page entry points.
- [ ] Run the focused auth test.

### Task 2: Character Sync Failure Visibility

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260608110000_add_member_character_sync_status/migration.sql`
- Modify: `src/server/character-sync.ts`
- Modify: `src/app/members/page.tsx`
- Test: `tests/server/character-sync.test.ts`, `tests/app/members-page.test.tsx`

- [ ] Add failing tests for failure state persistence and members-page failure display.
- [ ] Add nullable `characterSyncFailedAt` and `characterSyncFailureReason` fields to `Member`.
- [ ] Clear failure state on successful sync and store failure state in the auto-sync loop.
- [ ] Render failure status in the member panel.
- [ ] Run focused sync and members-page tests.

### Task 3: Boss Checklist Planning UI

**Files:**
- Modify: `src/app/members/page.tsx`
- Test: `tests/app/members-page.test.tsx`

- [ ] Add failing tests for the boss matrix, remaining-only link, and checklist schedule link.
- [ ] Add a group-level boss check matrix.
- [ ] Add a `checklist=remaining` filter that hides completed boss groups per character.
- [ ] Add leader-only links to `/schedules?templateId=<id>` for unchecked boss variants.
- [ ] Run the focused members-page test.

### Task 4: Searchable Schedule Template Picker

**Files:**
- Create: `src/components/template-picker.tsx`
- Modify: `src/app/schedules/page.tsx`
- Test: `tests/components/template-picker.test.tsx`, `tests/app/schedules-page.test.tsx`

- [ ] Add failing component and page tests for grouped search and default template selection.
- [ ] Replace schedule template selects with the new picker.
- [ ] Read `templateId` from query params and preselect a valid matching template.
- [ ] Run focused picker and schedule-page tests.

### Task 5: Availability Coordination Summary

**Files:**
- Modify: `src/components/availability-overview.tsx`
- Test: `tests/components/availability-overview.test.tsx`

- [ ] Add a failing test for members with no available/tentative slots.
- [ ] Render a compact coordination-needed summary above the table.
- [ ] Run the focused overview test.

### Task 6: Final Verification

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Restart the local server if needed and verify `/members`, `/calendar`, `/schedules`, and unauthenticated `/members` in a browser/script.
- [ ] Commit and push the finished batch.
