# Production V1 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current prototype-style planner into a deployable v1 that supports real group onboarding, leader settings, invite control, editable operational data, and deployment verification.

**Architecture:** Keep the existing Next.js App Router and Prisma structure, but move deploy-critical behavior into server services with tests first. Pages should compose those services through server actions and never depend on local-only hardcoded invite codes.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Vitest, Testing Library, Playwright.

---

## Task 1: Group Onboarding And Settings

**Files:**
- Modify: `src/server/groups.ts`
- Modify: `src/app/page.tsx`
- Create: `src/app/groups/new/page.tsx`
- Create: `src/app/settings/page.tsx`
- Modify: `src/components/app-shell.tsx`
- Test: `tests/server/groups.test.ts`
- Test: `tests/app/home-page.test.tsx`
- Test: `tests/components/app-shell.test.tsx`

- [ ] Add service tests for creating a group with a leader, leader-only settings updates, and invite-code rotation.
- [ ] Add unauthenticated home tests that expect a deploy-safe create-group entry point instead of `/invite/test-code`.
- [ ] Implement `createGroupWithLeader`, `updateGroupSettings`, `rotateGroupInviteCode`, and leader permission checks.
- [ ] Add `/groups/new` for group creation and leader session cookie creation.
- [ ] Add `/settings` for group name, invite enabled toggle, invite URL display, and invite rotation.
- [ ] Add settings navigation for leaders only.

## Task 2: Editable Characters

**Files:**
- Modify: `src/server/characters.ts`
- Modify: `src/app/members/page.tsx`
- Test: `tests/server/characters.test.ts`

- [ ] Add service tests for character update/delete ownership checks.
- [ ] Implement update and delete functions.
- [ ] Add edit/delete controls to the members page.

## Task 3: Editable Raid Templates

**Files:**
- Modify: `src/server/raid-templates.ts`
- Modify: `src/app/templates/page.tsx`
- Create: `src/components/template-form.tsx`
- Test: `tests/server/raid-templates.test.ts`

- [ ] Add service tests for creating custom templates, updating metadata, and deleting templates without cross-group access.
- [ ] Replace single hardcoded template creation with a deploy-ready form.
- [ ] Add delete controls for templates not used by schedules.

## Task 4: Editable Schedules And Slot Operations

**Files:**
- Modify: `src/server/schedules.ts`
- Modify: `src/app/schedules/page.tsx`
- Modify: `src/app/schedules/[scheduleId]/page.tsx`
- Test: `tests/server/schedules.test.ts`

- [ ] Add service tests for schedule update/cancel and slot unassignment.
- [ ] Implement update/cancel/unassign functions.
- [ ] Add schedule detail controls for canceling a schedule and clearing an assigned slot.

## Task 5: Deployment Verification

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/production-flow.spec.ts`
- Create: `.env.vps.example`
- Modify: `docker-compose.yml`

- [ ] Add browser smoke test for create group, add character, create template, create schedule, assign slot.
- [ ] Add VPS environment example and deployment compose config without requiring local Docker use.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and the browser smoke test.
