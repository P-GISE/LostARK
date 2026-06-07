# Default Unavailable And Raid Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Treat empty availability slots as unavailable and add weekly per-character raid completion checks.

**Architecture:** Keep availability storage sparse. Add a Prisma table for completed character/template/week checks. Render checklist controls on the members page with server actions.

**Tech Stack:** Next.js App Router, Prisma, PostgreSQL, React server components, Vitest, Testing Library.

---

### Task 1: Tests

**Files:**
- Modify: `tests/components/availability-grid.test.tsx`
- Modify: `tests/server/availability.test.ts`
- Add: `tests/server/character-raid-checks.test.ts`
- Modify: `tests/app/members-page.test.tsx`

- [x] Update availability expectations so empty cells render as unavailable.
- [x] Add server tests for setting, listing, and clearing a weekly character raid check.
- [x] Add members page checklist rendering tests.

### Task 2: Data Model And Server Logic

**Files:**
- Modify: `prisma/schema.prisma`
- Add: `prisma/migrations/20260607140500_add_character_raid_checks/migration.sql`
- Add: `src/server/character-raid-checks.ts`

- [x] Add `CharacterRaidCheck` model and relations.
- [x] Add `listCharacterRaidChecksForGroup` and `setCharacterRaidCheck`.
- [x] Apply migration.

### Task 3: UI Implementation

**Files:**
- Modify: `src/components/availability-grid.tsx`
- Modify: `src/components/availability-overview.tsx`
- Modify: `src/server/availability.ts`
- Modify: `src/app/members/page.tsx`

- [x] Change availability display and counts.
- [x] Treat missing members as unavailable in group overview.
- [x] Render checklist controls in member character cards.

### Task 4: Verification

- [x] Run focused tests.
- [x] Run `npm test`, `npm run lint`, and `npm run build`.
- [x] Restart local production server and verify with Playwright.
- [ ] Commit and push.
