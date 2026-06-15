# LoaGuard Group Suite Design

## Goal

Add LoaGuard-like group operations to this app for these feature areas:

- weekly schedule board
- party/set composition
- availability management
- homework status
- signup/application flow
- group settings

The selected scope is the full B option: build real DB-backed features, not only a visual shell. The rollout standard is local verification first, then production deployment to the PC server and public domain.

## Reference Evidence

The private LoaGuard URL `https://loaguard.com/groups/480` redirects to `/login` in a real browser, so the exact private group state cannot be clicked without credentials.

The public LoaGuard bundles expose enough feature surface to design equivalent workflows:

- Group tabs: dashboard, `sets`, `availability`, `homework`, `signup`, and `settings`.
- Availability: default week, week overrides, four-week preview, member heatmap, presets, weekly presets, N-day cycle presets, and warnings when confirmed schedules fall outside new availability.
- Sets: raid set creation, slot assignment, attendance/absence state, slot order, moving characters across sets, raid set deletion, and set duplication.
- Homework: member incomplete homework, all characters, raid completion checks, and leader/scheduler permission to check for others.
- Signup: raid application creation, character entry, cancellation, assignment, finalization, and automatic next-week scheduling.
- Settings: group name, invite link, timetable display range, Discord reminders, availability-change notification, member permissions, transfer/leave/delete actions, and activity logs.

The design intentionally does not copy LoaGuard code. It adapts the observed workflows to this app's existing Next.js, Prisma, PostgreSQL, and Discord notification architecture.

## Product Structure

The app should move from a small set of pages to a group-operations suite:

- `/weekly`: weekly schedule board and unscheduled set queue.
- `/sets`: party/set composition before a schedule is finalized.
- `/calendar`: availability input and group availability analysis. Keep this existing route; optionally add `/availability` as an alias later.
- `/homework`: weekly raid homework status by member and character.
- `/signup`: raid signup/application boards.
- `/settings`: group settings, permissions, notifications, invite link, and activity logs.

The primary nav should stay compact and operational:

- Dashboard
- Weekly
- Sets
- Availability
- Homework
- Signup
- More: templates, notifications, members, settings, admin

On small screens, less frequent pages should stay behind the existing More menu.

## Data Model

### Group Settings

Extend `Group` or add a one-to-one `GroupSettings` table for operational settings:

- timetable start hour
- timetable end hour
- daily Discord summary enabled
- daily Discord summary time
- raid reminder lead minutes
- availability-change notification enabled
- Discord channel or webhook identifier, if channel delivery is added

Keep existing DM notification jobs. Channel delivery can be layered on top through the same `NotificationJob` queue.

### Permissions And Logs

Current roles are `LEADER` and `MEMBER`. Full LoaGuard-like operations need at least one middle permission set.

Use a separate `MemberPermission` or equivalent fields instead of overloading the role enum:

- can manage sets
- can confirm schedules
- can edit schedules
- can manage homework for others
- can manage settings

Add `GroupActivityLog`:

- group id
- actor member id
- action type
- target type
- target id
- summary
- created at

Settings should display recent logs for membership, set, schedule, signup, and settings changes.

### Party/Set Composition

Add draft composition models separate from final schedules:

- `RaidSet`: group, raid template, label, week start date, status, pinned flag, scheduled start time, created by member.
- `RaidSetSlot`: set, order, label, role, assigned member, assigned character, absence flag, absence reason, role override.

`RaidSet` is the planning layer. `Schedule` remains the finalized dated raid run. Confirming a set creates or updates a `Schedule` and its `ScheduleSlot` rows.

This separation avoids forcing every tentative composition to become a real schedule too early.

### Availability Presets And Week Overrides

Keep existing `AvailabilityBlock` as the expanded availability data used by current pages and schedule logic.

Add preset/override metadata:

- `AvailabilityPreset`: member, name, mode (`WEEKLY` or `CYCLE`), cycle days, anchor date.
- `AvailabilityPresetSlot`: preset, day of week or cycle day, start time, end time.
- `AvailabilityWeekOverride`: member, week start date, created at, updated at.

Saving a default weekly pattern or a week override should update the relevant expanded `AvailabilityBlock` rows. This preserves compatibility with the current availability overview while enabling LoaGuard-style presets and exceptions.

### Homework Status

Reuse `CharacterRaidCheck` for completed weekly raid homework. The homework page needs grouped read models rather than a new completion table:

- by member
- by character
- by raid template
- by Lost Ark week start

Leaders and members with homework permission can update checks for any group member. Other members can update only their own characters.

### Signup/Application Flow

Add signup models:

- `RaidSignup`: group, raid template, title, week start date, party size, max parties, status (`OPEN`, `ASSIGNING`, `FINALIZED`, `CANCELED`), created by member.
- `RaidSignupEntry`: signup, member, character, status (`APPLIED`, `CANCELED`, `ASSIGNED`, `FAILED`), memo.
- `RaidSignupAssignment`: signup, raid set, generated party number, created at.

Assignment should create `RaidSet` rows first. Scheduling those sets into actual raid times remains a separate action so leaders can review before final confirmation.

## Workflows

### Weekly Schedule Board

The weekly board shows:

- confirmed schedules by day and time
- draft raid sets not yet scheduled
- pinned schedules
- copied schedules from the prior week
- warnings for members with conflicting availability or missing homework

Actions:

- move a draft set into a weekly time slot
- confirm a draft set into a schedule
- unconfirm/cancel a schedule
- copy this week's confirmed schedules into next week
- filter by raid/template/member

### Party/Set Composition

The set builder lets a leader:

- create one or more sets from a raid template
- assign member characters to slots
- mark a member absent with a reason
- change slot order
- move a character to another set
- duplicate sets for another raid
- delete one set or all sets for a raid

The UI should be dense and operational, closer to a roster board than a marketing dashboard.

### Availability

Availability keeps the new dark operational style already added to `/calendar`.

Add:

- tabs for my availability and group availability
- default weekly pattern
- week override tabs
- preset save/apply/edit/delete
- N-day cycle preset support
- member filter for group heatmap
- warning list when availability changes conflict with confirmed schedules

The existing sparse unavailable model remains: unmarked slots are displayed as unavailable.

### Homework

The homework page shows:

- incomplete homework by member
- all characters by member
- per-character raid checklist for the current Lost Ark week
- progress counts by member and raid
- leader/scheduler controls to check for others

Use raid templates as the source of homework items. This keeps homework aligned with the app's actual raid configuration.

### Signup

The signup page supports:

- opening a raid signup from a raid template
- member character application
- cancellation while open
- organizer assignment
- finalization
- generated `RaidSet` rows from successful parties
- failed status for leftover one-person parties when finalizing

Automatic party assignment should be deterministic and reviewable. It should not directly create finalized schedules without leader confirmation.

### Settings

Settings gains sections for:

- basic group name
- invite link and invite enabled state
- timetable display range
- Discord notification settings
- member permissions
- activity log
- group transfer, leave, and delete

Danger actions stay separated and require confirmation.

## Architecture

### File Boundaries

Several current files exceed the 250 pure-LOC ceiling and must be split before adding significant logic:

- `src/app/members/page.tsx`
- `src/app/schedules/page.tsx`
- `src/app/schedules/[scheduleId]/page.tsx`
- `src/server/schedules.ts`
- `src/server/availability.ts`
- large availability components

Implementation should create small modules by ownership:

- `src/server/raid-sets.ts`
- `src/server/signups.ts`
- `src/server/group-settings.ts`
- `src/server/activity-log.ts`
- `src/server/homework.ts` if current raid-check code grows
- `src/components/weekly-board/*`
- `src/components/set-builder/*`
- `src/components/signup/*`
- `src/components/homework/*`
- `src/components/availability/*` for extracted availability subcomponents

Do not pile the new feature set into existing oversized pages.

### Server Actions

Use server actions and existing server modules for mutations. Each mutation should:

1. Load the current member.
2. Check group membership.
3. Check permission.
4. Parse inputs into typed values.
5. Execute the DB transaction.
6. Write an activity log entry where relevant.
7. Revalidate the affected paths.

### Transactions

Use Prisma transactions for multi-row operations:

- creating sets and slots
- moving slots across sets
- confirming sets into schedules
- assigning signup entries into sets
- finalizing a signup
- changing timetable range when existing schedules fall outside the new range

### Notifications

Reuse `NotificationJob` for:

- schedule creation/reminder DMs
- optional daily summary
- optional availability-change notice

Do not add a second notification queue.

## UI Direction

Use a quiet operational interface:

- dense boards
- compact controls
- tabs and segmented controls
- stable grid dimensions
- no marketing hero layout
- no decorative backgrounds
- Korean text that wraps naturally and does not clip

The availability and weekly surfaces can use the dark LoaGuard-like operational palette. Settings and signup can stay lighter if that matches current app patterns, but navigation and controls should feel consistent.

## Validation And Testing

Add or update tests at these levels:

- server tests for permissions, set creation, signup assignment, homework updates, and settings persistence
- app/page tests for the new nav and page rendering states
- component tests for set builder, signup entry, homework table, and availability preset controls
- browser verification for desktop and mobile after local implementation

Required local verification before deployment:

```powershell
npm test
npm run lint
npm run build
```

Browser verification must cover:

- `/weekly`
- `/sets`
- `/calendar`
- `/homework`
- `/signup`
- `/settings`

Deployment happens only after local checks pass. The production path is the existing PC production server on port `3001` through Cloudflare Tunnel, followed by public verification at `https://lostark-party.pigs0516.com`.

## Migration Plan

1. Add schema and Prisma migration for settings, permissions/logs, raid sets, availability presets, and signups.
2. Keep existing schedules, members, templates, characters, and availability rows intact.
3. Backfill default group settings from current behavior.
4. Treat existing `CharacterRaidCheck` rows as current homework data.
5. Do not auto-create raid sets from existing schedules; existing schedules remain finalized historical data.

## Non-Goals

- LoaGuard AI assistant behavior.
- Public LoaGuard account integration.
- Copying LoaGuard private data or private source.
- Payment/subscription features.
- Public party recruitment marketplace.

## Open Decisions Resolved

- Scope: full LoaGuard-like group feature set.
- Verification/deploy sequence: local computer first, then server deploy.
- Route compatibility: keep `/calendar` for availability and add new pages around it.
- Scheduling safety: signup assignment creates draft sets, not finalized schedules.
