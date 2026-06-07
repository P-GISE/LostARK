# Navigation UI Review Design

## Goal

Reduce top navigation clutter and improve mobile usability across the core raid management screens.

## Design

The app shell will split navigation into primary work tabs and account/utility actions. Primary tabs are the frequent daily workflow: dashboard, availability, schedules, and members. Template and notification pages remain visible on desktop as secondary tabs and move into the account menu on mobile. Leader settings, admin, and logout move out of the main tab row into a right-side "more" menu.

Navigation links will show an active state based on the current pathname. The app shell remains server-rendered for session lookup, with a small client nav-link component responsible only for pathname-aware styling.

## Page-Level Adjustments

- Form controls should be able to shrink inside mobile grids without causing horizontal overflow.
- Schedule creation forms should use `minmax(0, 1fr)` tracks where long template labels may appear.
- Template rows should keep delete actions on the same row on mobile so repeated delete buttons do not stretch the list vertically.

## Testing

Add AppShell tests for the new navigation grouping and active link state. Existing schedule and template page tests continue to cover render safety, while browser verification checks the mobile layout.
