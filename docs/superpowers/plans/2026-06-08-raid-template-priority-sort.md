# Raid Template Priority Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sort template lists and weekly boss checks by the requested raid priority: 지평, 세르카, 종막, 4막, 3막, 2막, 1막, 서막.

**Architecture:** Update the shared `compareRaidTemplateDisplay` helper so every caller receives the same order. Match priorities by trimmed raid name substring and keep existing fallback ordering for unlisted bosses.

**Tech Stack:** TypeScript, Vitest, Next.js App Router.

---

### Task 1: Failing Sort Test

**Files:**
- Modify: `tests/lib/raid-template-display.test.ts`

- [x] Add a test that mixes 지평, 세르카, 종막, 4막, 3막, 2막, 1막, 서막, and an unlisted boss.
- [x] Run `npm test -- tests/lib/raid-template-display.test.ts` and confirm it fails with the current alphabetical order.

### Task 2: Shared Comparator

**Files:**
- Modify: `src/lib/raid-template-display.ts`

- [x] Add boss priority rules to `compareRaidTemplateDisplay`.
- [x] Preserve difficulty and gate ordering within the same boss.
- [x] Run `npm test -- tests/lib/raid-template-display.test.ts` and confirm it passes.

### Task 3: Verification

- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Restart `http://localhost:3000` and verify `/templates` and `/members` order with Playwright.
- [ ] Commit and push.
