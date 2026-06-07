# Template List Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group same-boss raid templates into collapsible sections on the templates page.

**Architecture:** Keep `src/app/templates/page.tsx` as a server component. Add a small local grouping helper and render `<details>` groups around the existing template rows.

**Tech Stack:** Next.js App Router, React server components, Testing Library, Vitest, Tailwind CSS.

---

### Task 1: Regression Test

**Files:**
- Modify: `tests/app/templates-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test where `listRaidTemplates` returns two `카멘` templates and one `카제로스 2막: 아브렐슈드` template. Assert that `카멘 템플릿 2개` exists, `카멘` is visible once, and both exact template labels still exist.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/app/templates-page.test.tsx`

Expected: fail because the current page renders repeated flat rows, not a labeled boss group.

### Task 2: Grouped Template Rendering

**Files:**
- Modify: `src/app/templates/page.tsx`

- [ ] **Step 1: Add grouping helper**

Create a local helper that receives the sorted templates and returns `{ name, templates }[]`, preserving display order.

- [ ] **Step 2: Render `<details>` groups**

Replace the flat list with boss groups. Put the boss name and count in the summary, keep each template row's delete form and full `aria-label`.

- [ ] **Step 3: Run focused test**

Run: `npm test -- tests/app/templates-page.test.tsx`

Expected: pass.

### Task 3: Verification

**Files:**
- Verify only

- [ ] **Step 1: Run quality checks**

Run: `npm test -- tests/app/templates-page.test.tsx`

Run: `npm run lint`

Run: `npm run build`

- [ ] **Step 2: Commit**

Run: `git add docs/superpowers/specs/2026-06-07-template-list-groups-design.md docs/superpowers/plans/2026-06-07-template-list-groups.md tests/app/templates-page.test.tsx src/app/templates/page.tsx`

Run: `git commit -m "Improve raid template list grouping"`
