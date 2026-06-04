# Lost Ark Party Planner Design

## Goal

Build a server-hosted web app for managing a fixed Lost Ark raid group. The app replaces the limits of a Discord-only bot by giving the raid leader and members a persistent calendar, availability grid, roster, character list, raid templates, schedule management, and Discord DM reminders.

The first version is not a public party recruitment platform. It is a private operating tool for one fixed group, entered through invite links.

## Target Users

- Raid leader: creates templates and schedules, reviews availability, assigns slots, confirms party composition, and monitors missing responses.
- Member: joins through an invite link, maintains nickname and characters, marks availability, selects participation status and character per schedule, and optionally connects Discord for DM reminders.

## Product Scope

### Included

- Upcoming schedule dashboard.
- Calendar-centered availability management.
- Drag-based daily time block input with states: available, unavailable, tentative.
- Member and multi-character management.
- Raid templates with role composition and operating requirements.
- Schedule creation from templates.
- Schedule detail view with slots, assigned member, selected character, and confirmation status.
- Invite-link based entry with nickname.
- Optional Discord account connection for personal DM reminders.
- Discord DM notifications for reminders, missing responses, and missing availability.
- VPS deployment with Docker Compose.

### Excluded From MVP

- Public listing/search for unknown users.
- Reporting, moderation, and anti-spam systems for public recruitment.
- Payments.
- Mobile push notifications.
- KakaoTalk/SMS notifications.
- Redis or separate queue infrastructure unless PostgreSQL-backed notification jobs become insufficient.

## Navigation

The app has six primary sections.

### Home

The home screen focuses on near-term operational work.

It shows:

- Next raid schedule and countdown.
- Participants, absences, tentative responses, and no-response members.
- Missing roles or slots.
- Members who have not selected a character.
- Members who have not entered availability.
- Discord connection or DM delivery problems.

### Calendar

The calendar shows group availability and schedules.

Core interactions:

- Members paint daily time blocks as available, unavailable, or tentative.
- Raid leader compares overlapping availability.
- Raid schedules appear on the same calendar.
- Calendar views should support at least weekly and daily views.

### Schedules

Schedules are actual raid runs created from templates.

Schedule detail shows:

- Raid name, difficulty, gate range, date, and time.
- Slots from the template.
- Assigned member and selected character per slot.
- Participation state: pending, accepted, declined, tentative.
- Warnings for duplicate character assignment, missing role, or missing confirmation.

### Members

Member management includes:

- Nickname.
- Role: raid leader or member.
- Invite-link join state.
- Discord connection state.
- Character list.
- Activity and response status.

### Templates

Raid templates make schedule creation fast.

Templates include:

- Raid name.
- Difficulty.
- Gate range.
- Required party size.
- Slot composition, such as DPS/support counts.
- Required or preferred roles, classes, synergies, or notes.
- Operating requirements, such as experience, gems, transcendence, elixir, consumables, and free-form memo.

### Notifications

Notification management includes:

- Discord DM connection state.
- Notification rules.
- Pending jobs.
- Send history.
- Failure reason and retry state.

## Data Model

### Group

Represents a fixed raid group.

Fields:

- id
- name
- invite_code
- invite_enabled
- created_at
- updated_at

### Member

Represents a person in a group.

Fields:

- id
- group_id
- nickname
- role: leader or member
- discord_user_id, nullable
- discord_connected_at, nullable
- created_at
- updated_at

Rules:

- Nickname must be unique within a group.
- Discord connection is optional but required for personal DM notifications.

### Character

Represents a Lost Ark character owned by a member.

Fields:

- id
- member_id
- name
- class_name
- item_level
- preferred_role
- notes
- created_at
- updated_at

Rules:

- A member can have multiple characters.
- Character can be selected per schedule.

### AvailabilityBlock

Represents one member's availability for a time range.

Fields:

- id
- member_id
- date
- starts_at
- ends_at
- status: available, unavailable, tentative
- memo, nullable
- created_at
- updated_at

Rules:

- Blocks for the same member and date must not overlap in contradictory ways.
- Server validates that ends_at is after starts_at.
- Timezone is Asia/Seoul by default for display and scheduling.

### RaidTemplate

Represents a reusable raid setup.

Fields:

- id
- group_id
- name
- difficulty
- gates
- required_players
- requirements
- notes
- created_at
- updated_at

### RaidTemplateSlot

Represents one slot in a template.

Fields:

- id
- template_id
- label
- role: dps, support, flex, other
- required
- class_preference, nullable
- notes

### Schedule

Represents a concrete raid run.

Fields:

- id
- group_id
- template_id
- title
- starts_at
- ends_at, nullable
- status: draft, open, confirmed, completed, canceled
- notes
- created_by_member_id
- created_at
- updated_at

### ScheduleSlot

Represents an actual slot in a schedule.

Fields:

- id
- schedule_id
- template_slot_id, nullable
- label
- role
- assigned_member_id, nullable
- assigned_character_id, nullable
- confirmation_status: pending, accepted, declined, tentative
- notes

Rules:

- assigned_character_id must belong to assigned_member_id.
- A character cannot be assigned twice to the same schedule.

### NotificationJob

Represents a Discord DM or system notification.

Fields:

- id
- group_id
- member_id
- schedule_id, nullable
- type
- send_after
- status: pending, sent, failed, canceled
- failure_reason, nullable
- attempts
- created_at
- updated_at

Rules:

- Notification failure must not modify schedule data.
- Failed jobs are visible to the raid leader.

## Architecture

Use a single full-stack web app plus a worker.

### Services

- Caddy: HTTPS, domain routing, reverse proxy.
- Web: Next.js app for UI and API routes.
- Worker: background process for Discord DM jobs and scheduled reminders.
- PostgreSQL: persistent database.

### Deployment

Deploy to a VPS with Docker Compose.

Initial VPS requirements:

- Ubuntu Linux.
- Docker and Docker Compose.
- Git.
- Firewall allowing ports 80 and 443.
- Domain pointed to VPS public IP.

Redis is not part of the MVP. The worker can poll PostgreSQL notification jobs. Add Redis later only if queue throughput or reliability needs justify it.

## Authentication And Access

MVP access uses invite link plus nickname.

Flow:

1. Raid leader creates or shares a group invite link.
2. Member opens invite link.
3. Member enters nickname.
4. Site creates member record.
5. Member can optionally connect Discord to receive DM reminders.

Permissions:

- Raid leader can manage invite links, members, templates, schedules, slot assignments, and notification rules.
- Member can manage their own profile, characters, availability, schedule response, and Discord connection.
- Unknown visitor can only access the invite join flow.

## Discord Integration

Discord is a secondary notification channel, not the primary product surface.

The site remains the source of truth. Discord bot responsibilities:

- Link Discord user to member.
- Send personal DM reminders.
- Send missing-response or missing-availability reminders.
- Report delivery failures back to the app.

The Discord bot should not own schedule state.

## Error Handling

Required handling:

- Invalid or disabled invite link shows a clear blocked join screen.
- Duplicate nickname in a group is rejected.
- Overlapping contradictory availability blocks are rejected by the server.
- Schedule cannot assign a character owned by another member.
- Same character cannot be assigned twice in one schedule.
- Discord DM failure records a failed notification job.
- Notification worker failures do not corrupt schedule, member, or character data.
- Raid leader dashboard surfaces missing availability, missing response, missing character selection, and notification failures.

## Testing Requirements

Automated tests should cover:

- Invite-link join creates a member in the target group.
- Duplicate nickname in a group is rejected.
- Member can create multiple characters.
- Availability blocks can be saved for a day.
- Overlapping invalid availability is rejected.
- Raid leader can create a raid template with slots and requirements.
- Raid leader can create a schedule from a template.
- Schedule slots can assign a member and one of that member's characters.
- Same character cannot be assigned twice in a schedule.
- Home dashboard reports missing responses, missing character selections, missing availability, and missing roles.
- Notification worker marks Discord DM jobs as sent or failed without modifying schedule data.

## Implementation Defaults

- Frontend stack: Next.js, TypeScript, Tailwind CSS, and a compact operational UI. Use a custom availability grid for drag-based time blocks instead of forcing a generic calendar library to handle roster availability.
- Discord linking: member opens profile, clicks "Connect Discord", completes Discord OAuth, and the app stores the Discord user id for DM delivery. The invite-link nickname flow remains the primary entry path.
- Schedule creation: MVP supports one-off schedules created from raid templates. Recurring schedules can be added later after the one-off flow is stable.
- PostgreSQL backup: VPS deployment should include a daily `pg_dump` backup job with at least seven days of local retention. Off-server backup can be added after the MVP is deployed.

These defaults are part of the MVP design and should be carried into the implementation plan unless the user changes them.
