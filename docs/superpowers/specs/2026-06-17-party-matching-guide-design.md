# Party Matching Guide Design

## Goal

Add a public guide page that explains how to use the new availability-based party matching workflow.

## Audience

The page is for raid leaders and static group members who need a quick operational checklist before using availability, raid signups, draft sets, recommended times, and final schedule confirmation.

## Route And Navigation

- Add `/guides/party-matching` as a public, crawlable Next.js page.
- Add the page to the unauthenticated public navigation as `편성 가이드`.
- Add the route to the sitemap.

## Content Structure

The guide should use the existing guide page visual language:

1. Header: what the guide is for.
2. Workflow sections:
   - Enter availability.
   - Open a raid signup.
   - Let the signup assignment group applicants by overlapping availability.
   - Review recommended times on draft raid sets.
   - Confirm the final schedule.
3. Practical checklist for raid leaders.
4. Quick links to `/calendar`, `/signup`, and `/sets`.

## Constraints

- Keep the page static and public.
- Use existing shared UI primitives from `src/components/ui.tsx`.
- Do not add database or auth behavior.
- Keep files under the 250 pure LOC ceiling.

## Verification

- Add tests proving the page exists as crawlable public content.
- Add tests proving public navigation links to the guide.
- Add tests proving sitemap includes the new route.
- Run targeted tests, lint, and build.
