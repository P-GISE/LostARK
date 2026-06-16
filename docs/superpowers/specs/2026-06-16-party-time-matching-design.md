# Party Time Matching Design

## Goal

Improve the scheduling flow so availability, signup assignment, party/set
composition, and schedule confirmation work as one connected workflow.

The core product question changes from "which time has the most available
members in the whole group?" to "can this specific party actually depart at
this time, and who still needs coordination?"

This should support both existing paths:

- `RaidSet`: a leader has already composed a party and needs to choose the best
  start time.
- `RaidSignup`: members apply with characters, the organizer assigns parties,
  and each generated party needs a realistic schedule candidate.

The first implementation should keep leaders in control. The system recommends
and explains party/time matches, but does not silently finalize schedules.

## Current Context

The app already has the main building blocks:

- `/calendar` lets members paint hourly availability as available, tentative,
  or unavailable.
- `getGroupAvailabilityOverview` and `recommendScheduleSlots` rank future time
  slots for the whole group.
- `/signup` lets organizers open raid signups, accept character applications,
  and generate `RaidSet` rows.
- `/sets` lets organizers create draft raid sets, assign characters to slots,
  mark absence, and confirm a set into a real `Schedule`.
- `Schedule` remains the finalized dated raid run.

The gap is that these pieces are not scored around the actual party. Current
recommendations can show a strong group-wide time even when the specific people
in a generated party cannot all attend. Signup assignment is also deterministic
by application order instead of availability overlap.

## Product Principles

- Party-first: after a party exists, all time recommendations should be scoped
  to that party's assigned members.
- Explainable automation: every recommendation must show who is available,
  tentative, unavailable, or missing.
- Leader approval: automated assignment produces a reviewable draft, not a
  confirmed schedule.
- Reuse existing models first: extend read models and services before adding
  new database tables.
- Missing is not unavailable: the UI should distinguish explicit unavailable
  from no submitted availability when possible.

## Recommended Scope

### Phase 1: Party Time Recommendations

Add a shared party-time matching service that can score candidate slots for a
given list of members.

Inputs:

- group id
- target member ids
- optional target character ids
- week/date range
- candidate hours
- optional existing schedule/set id for conflict context

Output per candidate slot:

- date and hour
- score
- available members
- tentative members
- unavailable members
- missing members
- schedule-conflicted members
- summary label, such as `전원 가능`, `1명 조율`, `2명 미입력`, or `불가 포함`

Scoring:

- available: strong positive
- tentative: weak positive
- missing: warning and small negative
- unavailable: strong negative
- existing schedule conflict: excluded or strongest warning
- all target members available: top priority
- no unavailable members and only tentative/missing issues: still recommendable
- any unavailable member: show lower or behind a warning threshold

This service should live beside the existing availability logic and reuse
`AvailabilityBlock` expansion. It should not depend on React components.

### Phase 2: RaidSet Integration

Each `RaidSet` card should show a compact recommendation strip:

- best party time
- next 2-3 alternatives
- counts for available, tentative, unavailable, and missing
- names that need coordination

The card should support choosing a recommended time and confirming the set into
a `Schedule`. Before confirmation, the UI should show a final warning if any
assigned member is tentative, unavailable, missing availability, or already
scheduled elsewhere.

This makes `/sets` the operational center for already composed parties.

### Phase 3: Signup Assignment Improvements

Change signup assignment from simple application-order slicing to
availability-aware draft grouping.

The first version should remain deterministic:

1. Build candidate entries from active signup applications.
2. Score member-pair overlap using the same availability data.
3. Form full parties that maximize shared availability while preserving signup
   order as a tie-breaker.
4. Create draft `RaidSet` rows as today.
5. Attach recommendation summaries to generated parties so the organizer can
   review them immediately.

The algorithm should prefer complete, explainable parties over mathematically
perfect but opaque results. If role constraints or support/DPS balancing are
not yet reliable in character data, keep the first pass availability-focused
and expose role warnings separately.

### Phase 4: Availability Page Upgrade

Keep the group-wide heatmap, but add party-scoped views:

- all group availability
- each draft `RaidSet`
- each open/assigning signup's generated parties
- current member's own parties

This lets members understand why they are being asked to respond. The page
should show "you are blocking these party candidates" when a member has not
submitted availability for relevant party times.

### Phase 5: Notifications

After a party is composed, notifications should narrow from group-wide reminders
to party-specific coordination:

- missing availability for your party
- proposed party times that need response
- schedule confirmed for your party
- schedule conflicts created by availability changes

Existing Discord DM jobs can be reused. Channel notifications can remain out of
scope unless the group settings already enable them later.

## Data Model

No new tables are required for the first implementation.

Use existing models:

- `AvailabilityBlock` for member availability.
- `RaidSignup`, `RaidSignupEntry`, and `RaidSignupAssignment` for applications.
- `RaidSet` and `RaidSetSlot` for draft party composition.
- `Schedule` and `ScheduleSlot` for confirmed runs.
- `NotificationJob` for reminders.

Possible later additions:

- `RaidSetTimeCandidate` if leaders need to save, vote on, or audit proposed
  times over multiple sessions.
- `AvailabilitySubmission` if the product needs an explicit weekly "submitted"
  state distinct from inferred missing cells.

For phase 1, candidate times can be computed live from current availability and
displayed without persistence.

## Components And Boundaries

### Server Services

`src/server/availability.ts` should keep low-level availability expansion.

Add a small service or exported functions for party matching:

- build target-member availability matrix
- score a candidate slot
- rank candidate slots for a party
- summarize warnings

`src/server/signups.ts` should call this service when assigning signup entries.
It should not duplicate scoring logic.

`src/server/raid-sets.ts` should call this service for set cards and
confirmation warnings.

### UI Components

Add reusable display components:

- `PartyTimeRecommendationList`
- `PartyTimeWarningSummary`

Use these in:

- `RaidSetCard`
- `SignupBoard` after assignment
- availability overview party tabs or filters
- weekly board schedule confirmation controls

The UI should stay dense and operational. Cards should show the decision data
first: time, readiness, and names needing action.

## Data Flow

### Existing RaidSet

1. Leader creates or edits a `RaidSet`.
2. Server loads assigned members from `RaidSetSlot`.
3. Party matching service scores this week's future slots.
4. UI shows best candidates inside the set card.
5. Leader picks a time.
6. Confirmation action validates warnings again server-side.
7. `confirmRaidSetSchedule` creates the final `Schedule`.

### Signup

1. Organizer opens a signup.
2. Members apply with characters.
3. Organizer clicks assign.
4. Server loads active entries and current availability.
5. Availability-aware grouping creates draft parties.
6. Draft `RaidSet` rows are created.
7. Signup entries are marked assigned.
8. Organizer reviews generated party cards and recommended times.
9. Organizer confirms each party into a schedule.

### Availability Change

1. Member edits availability.
2. Existing availability blocks update.
3. Any party recommendations are recomputed on next render.
4. Later notification work can enqueue warnings for affected draft or confirmed
   party times.

## Error Handling

- If a party has no assigned members, show no recommendation and explain that
  the set needs assignments first.
- If availability is missing for all members, show candidate times as low
  confidence rather than pretending everyone is unavailable.
- If a selected recommended time is now in the past, reject confirmation with
  the existing past-time validation.
- If availability changed between render and confirmation, recompute warnings
  before creating the schedule.
- If signup assignment cannot form a full party, leave remaining entries
  unapplied until finalization marks them failed as the current flow does.
- If there are conflicting confirmed schedules for a member, show the conflict
  in recommendations and block confirmation unless the existing schedule-edit
  rules intentionally allow it.

## Testing Strategy

### Unit Tests

Add tests for the party matching service:

- all members available ranks first
- tentative members rank below all-available times
- unavailable members strongly lower or exclude a slot
- missing availability is distinct from explicit unavailable
- schedule conflicts are reported
- deterministic tie-breaking by date and hour

Add signup assignment tests:

- applicants with overlapping availability are grouped together
- signup order remains the tie-breaker when scores match
- leftover incomplete parties remain unassigned until finalize
- generated `RaidSet` rows keep expected slots and assignment statuses

### Component Tests

Add or update tests for:

- `RaidSetCard` recommendation display
- warning text for tentative, unavailable, missing, and conflict states
- recommended-time confirmation form behavior
- signup board after assignment, showing generated party readiness

### Integration Tests

Cover the main leader flow:

1. Members submit availability.
2. Organizer opens a signup.
3. Members apply.
4. Organizer assigns parties.
5. Generated set shows party-specific recommended times.
6. Organizer confirms a recommended time.
7. Final schedule has the expected assigned members and characters.

## Non-Goals

- Fully automatic schedule finalization.
- A complex optimizer that hides why parties were formed.
- Public recruitment or unknown-user matchmaking.
- Channel-wide Discord coordination unless a separate notification design adds
  it.
- New persistence for candidate times in the first pass.

## Open Product Decisions

These can be decided during implementation planning:

- Whether explicit `UNAVAILABLE` cells should be stored for every painted
  unavailable slot, or whether a separate weekly submitted state is enough.
- Whether a party with one unavailable member can still be confirmed by a
  leader override.
- Whether signup grouping should consider support/DPS balance in phase 1 or
  only surface role warnings after availability grouping.
- Whether recommendation hours should use the current availability hour range
  only or the group's timetable settings.

## Approval Standard

The design is successful when a raid leader can move from member availability
and signup applications to reviewable draft parties, see each party's best
times, understand exactly who blocks each candidate, and confirm schedules
without returning to external chat or a spreadsheet for the primary decision.
