# Party Matching Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public usage guide for the availability-based party matching workflow.

**Architecture:** Create one static App Router page under `src/app/guides/party-matching/page.tsx`, expose it from public navigation, and include it in the sitemap. Tests lock page discoverability, navigation, and sitemap coverage.

**Tech Stack:** Next.js App Router, React Server Components, Vitest, Testing Library.

---

### Task 1: Public Guide Discoverability

**Files:**
- Modify: `tests/app/public-content.test.tsx`
- Modify: `tests/components/app-shell.test.tsx`

- [ ] **Step 1: Write failing tests**

Add `/guides/party-matching` to public content expectations, sitemap expectations, and unauthenticated public navigation expectations.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm test -- tests/app/public-content.test.tsx tests/components/app-shell.test.tsx
```

Expected: fail because `src/app/guides/party-matching/page.tsx` and the nav/sitemap route do not exist yet.

### Task 2: Static Guide Page

**Files:**
- Create: `src/app/guides/party-matching/page.tsx`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Implement page and links**

Use existing `PageHeader`, `SectionPanel`, `Badge`, and button class names. Add the new route to `publicNavItems` and `PUBLIC_PATHS`.

- [ ] **Step 2: Verify green**

Run:

```bash
npm test -- tests/app/public-content.test.tsx tests/components/app-shell.test.tsx
npm run lint
npm run build
```

Expected: all commands pass.

### Task 3: Commit And Deploy

**Files:**
- Commit changed docs, tests, and app files.

- [ ] **Step 1: Commit**

```bash
git add docs/superpowers/specs/2026-06-17-party-matching-guide-design.md docs/superpowers/plans/2026-06-17-party-matching-guide.md tests/app/public-content.test.tsx tests/components/app-shell.test.tsx src/app/guides/party-matching/page.tsx src/components/app-shell.tsx src/app/sitemap.ts
git commit -m "feat: add party matching guide"
```

- [ ] **Step 2: Push to deploy**

```bash
git push origin main
```

Expected: GitHub Actions `Deploy VPS` succeeds and the new guide route returns HTTP 200.
