# UX Bugfix Batch Design

## Scope

This batch fixes protected-page unauthenticated access and improves three planning workflows: character sync visibility, weekly boss checklist scanning, and schedule template selection.

## Decisions

- Protected pages should redirect missing member sessions to `/auth/login?next=<path>` instead of throwing a server error. Server actions keep the existing strict requirement behavior.
- Character auto-sync should persist the latest failure on the member record. A successful sync clears that state, and the members page shows the latest failure near the sync status.
- Weekly boss checks stay grouped by boss name, with one completed difficulty allowed per boss each week. The page adds a compact group matrix and a per-character option to hide completed bosses.
- Leaders can start schedule creation from an unchecked boss/template through a preselected `/schedules?templateId=<id>` link.
- Schedule creation uses a searchable grouped template picker so long template lists are easier to scan.
- Availability overview adds a compact "coordination needed" summary for members who have no available or tentative slots in the displayed range.

## Testing

Add focused tests for redirect path behavior, sync failure persistence, member checklist/matrix UI, schedule template preselection, template picker filtering, and availability coordination summary. Run the full unit suite, lint, build, and browser smoke checks before commit.
