# Weekly Boss Name Raid Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every boss name count as one weekly checklist item per character, regardless of difficulty or gate template variants.

**Architecture:** Keep the existing `CharacterRaidCheck` table. Enforce replacement in `setCharacterRaidCheck` by deleting same-character, same-week checks whose raid template has the same group and name before creating the selected row. Group checklist UI by `RaidTemplate.name`.

**Tech Stack:** Next.js App Router, Prisma, PostgreSQL, React server components, Vitest, Testing Library.

---

### Task 1: Server Replacement Rule

**Files:**
- Modify: `tests/server/character-raid-checks.test.ts`
- Modify: `src/server/character-raid-checks.ts`

- [x] Add a failing test where checking `세르카 노말`, then `세르카 하드`, leaves only the hard check for that character and week.
- [x] Implement same-boss replacement inside `setCharacterRaidCheck`.
- [x] Run `npm test -- tests/server/character-raid-checks.test.ts`.

### Task 2: Members Checklist Grouping

**Files:**
- Modify: `tests/app/members-page.test.tsx`
- Modify: `src/app/members/page.tsx`

- [x] Add a failing page test where three `카멘` variants count as one boss bucket.
- [x] Group templates by trimmed boss name in `CharacterRaidChecklist`.
- [x] Count progress by completed boss buckets.
- [x] Keep difficulty/gate variant buttons visible inside each boss group.
- [x] Run `npm test -- tests/app/members-page.test.tsx`.

### Task 3: Verification

- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Restart `http://localhost:3000` and verify `/members` with Playwright.
- [ ] Commit and push.
