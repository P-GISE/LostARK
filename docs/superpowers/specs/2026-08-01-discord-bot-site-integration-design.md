# Discord Bot Site Integration Design

## Goal

Connect the existing Lost Ark Discord bot to this site without making the bot a
second source of truth. The site owns group, member, character, signup,
availability, schedule, and notification data. The bot owns Discord commands,
buttons, embeds, and channel delivery.

This design explicitly excludes per-gate clear/save tracking.

## Current State

Site:

- Stores groups, members, Discord user IDs, characters, raid templates, raid
  signups, schedules, availability blocks, availability presets, and notification
  jobs in Prisma.
- Can connect member Discord accounts through OAuth.
- Can send Discord DMs through the bot token.
- Has settings fields for Discord channels and summaries, but channel posting is
  not yet fully wired through the existing bot.

Bot:

- Lives at
  `D:\코덱스\focusai\focusai\focusai-webapp\lostark-discord-bot`.
- Uses `discord.js` with slash commands and button interactions.
- Already has `/party` recruitment cards, homework reminders, roster lookup,
  merchant alerts, and TTS.
- Stores party recruitment state in `data/party-recruitments.json`, separate
  from the site database.

## Scope

### 1. Raid Readiness

Add a readiness view that checks characters against structured raid requirements.
The first version should use data the site already stores:

- item level
- combat power
- preferred role
- last synced time
- Discord/account linkage

The UI should show whether each applicant or assigned character is ready,
warning, or blocked for a selected raid template. Phase 4 can enrich this with
OpenAPI armory data such as gems, engravings, cards, equipment, and Ark Passive.

### 3. Party Recruitment Export

Generate Discord-ready recruitment text and embeds from site data:

- raid template name, difficulty, gates, and player count
- proficiency label
- requirement summary
- week range based on Lost Ark Wednesday reset
- signup or party link back to the site
- current applicants and open slots

Recruitment content should be available from the site as a copyable block and as
an API response that the bot can post to a Discord channel.

### 4. Availability Presets

Finish the availability preset flow:

- create a preset with editable day/time slots
- apply a preset to the selected Lost Ark week
- save the current week as a preset
- delete or rename presets
- keep weekly overrides separate from reusable defaults

This should replace inactive buttons in the current preset panel with real
server actions and visible result states.

### 5. Official Content Sync

Add a read-only content sync layer for official Lost Ark data:

- fetch current notices/content metadata using the official Lost Ark OpenAPI
  where available
- suggest raid template updates instead of silently overwriting group templates
- flag stale default preset notes and requirements
- keep manual group customizations intact

The sync should be safe to fail. If OpenAPI is unavailable or the API key is
missing, the app should keep using local templates and show a clear operator
message.

## Discord Integration Approach

Use a site-owned Bot API plus a bot-side client.

### Site Responsibilities

- Add bot-authenticated API routes under `/api/bot/*`.
- Authenticate bot calls with a shared server token such as
  `LOSTARK_BOT_API_TOKEN`.
- Map Discord guild IDs to site groups.
- Map Discord user IDs to site members through existing `Member.discordUserId`.
- Create and update raid signups, availability entries, and recruitment payloads
  in the site database.
- Provide Discord embed/message payloads for the bot to send.
- Expose a bot outbox for site-triggered channel messages.

### Bot Responsibilities

- Add site connection env vars:
  - `LOSTARK_PARTY_SITE_URL`
  - `LOSTARK_PARTY_BOT_API_TOKEN`
- Replace `/party` JSON recruitment storage with site API calls when the site
  connection is configured.
- Keep Discord interaction handling local: slash commands, buttons, ephemeral
  errors, message edits, and channel sends.
- Show clear messages when a Discord user is not linked to a site member.
- Keep the existing homework, merchant, roster, Abidos, and TTS features
  independent.

## Data Model Implications

Site schema additions should be small and explicit:

- Group Discord mapping:
  - `discordGuildId`
  - `discordRecruitmentChannelId`
  - optional `discordAnnouncementChannelId`
- Bot outbox:
  - target Discord guild ID
  - target Discord channel ID
  - message content/embed payload
  - sent/error status
- Raid template structured requirements:
  - `minimumItemLevel`
  - `minimumCombatPower`
  - optional `readinessNotes`
- Bot-posted recruitment metadata:
  - Discord channel ID
  - Discord message ID
  - posted/closed timestamps

Existing `RaidSignup`, `RaidSignupEntry`, `AvailabilityPreset`, and
`AvailabilityWeekOverride` models should be reused instead of creating a
separate recruitment store.

## API Contract

Initial site Bot API:

- `GET /api/bot/health`
- `GET /api/bot/guilds/:discordGuildId/context`
- `GET /api/bot/guilds/:discordGuildId/templates`
- `POST /api/bot/guilds/:discordGuildId/signups`
- `POST /api/bot/signups/:signupId/apply`
- `POST /api/bot/signups/:signupId/cancel`
- `POST /api/bot/signups/:signupId/availability`
- `POST /api/bot/signups/:signupId/close`
- `GET /api/bot/signups/:signupId/discord-message`
- `GET /api/bot/outbox`
- `POST /api/bot/outbox/:messageId/mark-sent`
- `POST /api/bot/outbox/:messageId/mark-failed`

All mutation endpoints must validate:

- bot token
- guild-to-group mapping
- Discord user-to-member mapping for user actions
- template ownership
- signup status
- integer and range constraints for party size and max parties

## UX Direction

Keep the site as a dense operations tool:

- 공대장 surfaces: readiness warnings, recruitment send controls, stale content
  notices, preset management.
- 공대원 surfaces: linked Discord status, available presets, signup readiness
  messages, and simple fixes for blocked state.

Discord messages should stay compact:

- one embed per recruitment
- buttons for join, cancel, availability day selection, close
- ephemeral error messages for unlinked users or invalid actions
- channel messages only for group-level events

## Security

- Do not expose the site bot token to the browser.
- Do not let Discord user IDs create members implicitly.
- Do not let bot requests mutate groups that are not mapped to the request
  guild.
- Keep `.env` ignored. If any real Discord token has been shared outside the
  machine, rotate it in Discord Developer Portal before production use.
- Prefer least-privilege Discord bot permissions: application commands, send
  messages, read message history, and optional embed/link permissions.

## Rollout Plan

Phase 1:

- Fix existing functional issues that affect trust:
  - raid-set-confirmed schedules should queue notifications
  - signup creation should validate party size and max parties
  - schedule update should validate date/time
  - `canEditSchedules` should be honored by schedule edits
- Add bot API auth and health check.
- Add Discord guild mapping in settings.

Phase 2:

- Move `/party` recruitment creation and button actions to site-backed signups.
- Add recruitment embed/text generation.
- Store Discord channel/message IDs for posted recruitments.
- Leave old `data/party-recruitments.json` records as bot-only historical data;
  newly created recruitment cards use the site API.

Phase 3:

- Finish availability preset apply/save/rename/delete.
- Surface readiness checks in signups and raid sets.

Phase 4:

- Add official content sync suggestions.
- Extend character sync/readiness with richer OpenAPI armory fields.

## Testing

Site:

- Unit tests for bot auth, guild mapping, signup validation, readiness
  computation, recruitment payload generation, and availability preset actions.
- Existing lint, typecheck, tests, and build.
- Browser smoke checks for settings, signups, availability presets, and
  recruitment copy UI.

Bot:

- TypeScript build.
- Command payload generation.
- Unit-level tests or scriptable checks for the site API client and button
  custom ID handling.
- Manual Discord QA in one test guild:
  - create recruitment
  - join as linked user
  - fail as unlinked user
  - select availability
  - close recruitment
  - verify site UI reflects the same state

## Non-Goals

- Per-gate clear/save tracking.
- Rewriting the bot into the Next.js app.
- Auto-overwriting customized group raid templates.
- Public anonymous recruitment.
- Payment, ranking, or public community board features.

## Fixed Decisions

- One Discord guild maps to one site group for this implementation.
- Old bot JSON recruitment records are not migrated in the first rollout.
- Unlinked Discord users are blocked from mutating signup state and receive a
  site linking URL when the site can generate one.

## Open Questions

- Which production Discord channels should be stored as recruitment and
  announcement channels for the first mapped group?
