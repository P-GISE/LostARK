# Discord Bot Site Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first site-backed Discord recruitment release while preserving the existing bot and excluding per-gate clear/save tracking.

**Architecture:** The Next.js site remains the source of truth. The Discord bot calls authenticated `/api/bot/*` routes, receives Discord-ready message payloads, and sends or edits Discord messages. Phase 1 fixes trust issues and adds API foundations; Phase 2 moves new `/party` recruitments to site-backed signups; Phase 3-4 finish availability/readiness/content expansion.

**Tech Stack:** Next.js App Router, React Server Components, Prisma, Vitest, TypeScript, discord.js 14.

---

## File Structure

Site files:

- Modify `prisma/schema.prisma`: add Discord mapping fields, structured readiness fields, signup Discord message metadata, and bot outbox messages.
- Create migration under `prisma/migrations/*_discord_bot_site_integration/migration.sql`.
- Modify `src/server/group-settings.ts`: persist Discord guild and recruitment channel mapping.
- Modify `src/components/group-settings/basic-settings-section.tsx`: expose Discord guild/channel fields.
- Modify `src/app/settings/page.tsx`: pass new setting values from the form.
- Modify `src/server/group-permissions.ts`: add `requireCanEditSchedules`.
- Modify `src/server/schedules.ts`: use `requireCanEditSchedules`, validate schedule updates.
- Modify `src/server/raid-sets.ts`: queue notification jobs after confirming a set into a schedule.
- Modify `src/server/signups.ts`: harden signup validation and expose bot-safe signup operations.
- Modify `src/server/availability-presets.ts`: add apply, rename, delete, and save-current-week helpers.
- Create `src/server/readiness.ts`: compute first-pass readiness from stored item level, combat power, role, last sync, and Discord link.
- Create `src/server/discord-recruitment.ts`: build Discord embed/button payloads from `RaidSignup`.
- Create `src/server/bot-api-auth.ts`: validate `Authorization: Bearer <LOSTARK_BOT_API_TOKEN>`.
- Create `src/server/bot-guilds.ts`: resolve a Discord guild to a site group.
- Create `src/server/bot-outbox.ts`: manage queued channel messages.
- Create API routes under `src/app/api/bot/**/route.ts`.
- Modify `src/app/signup/page.tsx` and `src/components/signup/signup-board.tsx`: show readiness and recruitment copy/send controls.
- Modify `src/app/calendar/page.tsx` and `src/components/availability/availability-presets-panel.tsx`: finish preset actions.
- Modify `src/server/lostark-raid-presets.ts`: update stale default requirement copy.

Bot files:

- Modify `D:\코덱스\focusai\focusai\focusai-webapp\lostark-discord-bot\src\config\env.ts`: add optional site URL/token config.
- Create `D:\코덱스\focusai\focusai\focusai-webapp\lostark-discord-bot\src\site-api\client.ts`: typed fetch client for site API.
- Modify `D:\코덱스\focusai\focusai\focusai-webapp\lostark-discord-bot\src\features\party\party.service.ts`: route new `/party` creation and button actions to the site when configured, fall back to JSON otherwise.
- Modify `D:\코덱스\focusai\focusai\focusai-webapp\lostark-discord-bot\.env.example`: document site API settings.
- Add scriptable checks in bot package if needed.

## Task 1: Trust Fixes Before Integration

**Files:**
- Modify: `src/server/signups.ts`
- Modify: `src/server/schedules.ts`
- Modify: `src/server/group-permissions.ts`
- Modify: `src/server/raid-sets.ts`
- Test: `tests/server/signups.test.ts`
- Test: `tests/server/schedules.test.ts`
- Test: `tests/server/group-permissions.test.ts`
- Test: `tests/server/raid-sets.test.ts`

- [ ] **Step 1: Write failing signup validation tests**

Add tests that assert `createRaidSignup` rejects decimal, non-finite, zero, and oversized party sizes:

```ts
await expect(
  createRaidSignup({
    actorMemberId: leader.id,
    maxParties: 1,
    partySize: 1.5,
    templateId: template.id,
    title: "잘못된 신청",
    weekStartDate: "2030-06-05",
  }),
).rejects.toThrow(RaidSignupError);
```

Run: `npm test -- tests/server/signups.test.ts`
Expected: FAIL before implementation.

- [ ] **Step 2: Implement signup validation**

Add a helper in `src/server/signups.ts`:

```ts
function assertPositiveInteger(value: number, label: string) {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new RaidSignupError(`${label} 값이 올바르지 않습니다`);
  }
}
```

Use it for `partySize` and `maxParties`, then reject `partySize > template.requiredPlayers`.

Run: `npm test -- tests/server/signups.test.ts`
Expected: PASS.

- [ ] **Step 3: Write failing schedule permission/date tests**

Add tests that a delegated member with `canEditSchedules` can update a schedule, invalid dates are rejected, and past updates are rejected.

Run: `npm test -- tests/server/schedules.test.ts tests/server/group-permissions.test.ts`
Expected: FAIL before implementation.

- [ ] **Step 4: Implement schedule edit permission and validation**

Create `requireCanEditSchedules(memberId)` in `src/server/group-permissions.ts`.
Use it in `requireScheduleManager`: leaders, schedule creators, and delegated editors may edit. In `updateSchedule`, parse `startsAt`, reject invalid dates, and reject past dates with `isDateTimeInPast`.

Run: `npm test -- tests/server/schedules.test.ts tests/server/group-permissions.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing raid-set notification test**

Add a test that connects Discord users, confirms a raid set, and expects `NotificationJob` records for that schedule.

Run: `npm test -- tests/server/raid-sets.test.ts`
Expected: FAIL before implementation.

- [ ] **Step 6: Queue notifications after raid-set confirmation**

Import `queueScheduleNotificationJobs` in `src/server/raid-sets.ts` and call it after the transaction succeeds, using the created schedule template fields.

Run: `npm test -- tests/server/raid-sets.test.ts`
Expected: PASS.

## Task 2: Site Schema And Settings

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/*_discord_bot_site_integration/migration.sql`
- Modify: `src/server/group-settings.ts`
- Modify: `src/components/group-settings/basic-settings-section.tsx`
- Modify: `src/app/settings/page.tsx`
- Test: `tests/server/group-settings.test.ts`
- Test: `tests/app/settings-page.test.tsx`

- [ ] **Step 1: Add failing group settings tests**

Assert operational settings round-trip these values:

```ts
discordGuildId: "791362292523466822",
discordRecruitmentChannelId: "1234567890",
discordAnnouncementChannelId: "9876543210",
```

Run: `npm test -- tests/server/group-settings.test.ts`
Expected: FAIL before schema/service changes.

- [ ] **Step 2: Add schema fields and migration**

Add nullable string fields to `GroupSettings`:

```prisma
discordGuildId                 String?
discordRecruitmentChannelId    String?
discordAnnouncementChannelId   String?
```

Add nullable readiness fields to `RaidTemplate`:

```prisma
minimumItemLevel     Float?
minimumCombatPower   Int?
readinessNotes       String @default("")
```

Add nullable Discord metadata to `RaidSignup`:

```prisma
discordGuildId     String?
discordChannelId   String?
discordMessageId   String?
discordPostedAt    DateTime?
discordClosedAt    DateTime?
```

Add `BotOutboxMessage`:

```prisma
model BotOutboxMessage {
  id               String   @id @default(cuid())
  groupId          String
  group            Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  discordGuildId   String
  discordChannelId String
  payloadJson      String
  status           String   @default("PENDING")
  failureReason    String?
  sentAt           DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([status, createdAt])
}
```

Run: `npx prisma migrate dev --name discord_bot_site_integration`
Expected: migration created and Prisma client generated.

- [ ] **Step 3: Wire settings service and UI**

Extend `GroupOperationalSettingsInput`, defaults, upsert data, settings form props, and `settings/page.tsx` form parsing for the three Discord mapping fields.

Run: `npm test -- tests/server/group-settings.test.ts tests/app/settings-page.test.tsx`
Expected: PASS.

## Task 3: Bot API Foundation

**Files:**
- Create: `src/server/bot-api-auth.ts`
- Create: `src/server/bot-guilds.ts`
- Create: `src/server/bot-outbox.ts`
- Create: `src/app/api/bot/health/route.ts`
- Create: `src/app/api/bot/guilds/[discordGuildId]/context/route.ts`
- Create: `src/app/api/bot/outbox/route.ts`
- Create: `src/app/api/bot/outbox/[messageId]/mark-sent/route.ts`
- Create: `src/app/api/bot/outbox/[messageId]/mark-failed/route.ts`
- Test: `tests/app/bot-api-routes.test.ts`
- Test: `tests/server/bot-outbox.test.ts`

- [ ] **Step 1: Write failing auth and health route tests**

Mock route requests and assert missing/incorrect bearer tokens return `401`, and correct tokens return `{ ok: true }`.

Run: `npm test -- tests/app/bot-api-routes.test.ts`
Expected: FAIL before route creation.

- [ ] **Step 2: Implement bot token auth**

`requireBotApiAuth(request)` reads `LOSTARK_BOT_API_TOKEN`, requires `Authorization: Bearer <token>`, and returns a JSON `401` helper for failures.

Run: `npm test -- tests/app/bot-api-routes.test.ts`
Expected: health tests PASS.

- [ ] **Step 3: Implement guild context and outbox helpers**

`findGroupByDiscordGuildId(discordGuildId)` uses `GroupSettings.discordGuildId`.
`listPendingBotOutboxMessages`, `markBotOutboxSent`, and `markBotOutboxFailed` operate on `BotOutboxMessage`.

Run: `npm test -- tests/server/bot-outbox.test.ts tests/app/bot-api-routes.test.ts`
Expected: PASS.

## Task 4: Recruitment Payload And Bot Signup API

**Files:**
- Create: `src/server/discord-recruitment.ts`
- Create: `src/app/api/bot/guilds/[discordGuildId]/templates/route.ts`
- Create: `src/app/api/bot/guilds/[discordGuildId]/signups/route.ts`
- Create: `src/app/api/bot/signups/[signupId]/apply/route.ts`
- Create: `src/app/api/bot/signups/[signupId]/cancel/route.ts`
- Create: `src/app/api/bot/signups/[signupId]/availability/route.ts`
- Create: `src/app/api/bot/signups/[signupId]/close/route.ts`
- Create: `src/app/api/bot/signups/[signupId]/discord-message/route.ts`
- Modify: `src/server/signups.ts`
- Test: `tests/server/discord-recruitment.test.ts`
- Test: `tests/app/bot-signup-routes.test.ts`

- [ ] **Step 1: Write failing recruitment payload tests**

Create a signup with entries and assert payload title, description, buttons, week label, raid template info, and applicant count are stable.

Run: `npm test -- tests/server/discord-recruitment.test.ts`
Expected: FAIL before implementation.

- [ ] **Step 2: Implement `buildDiscordRecruitmentMessage(signupId)`**

Return a serializable payload:

```ts
type DiscordRecruitmentMessage = {
  content?: string;
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
  }>;
  components: Array<{
    type: 1;
    components: Array<{
      type: 2;
      custom_id: string;
      label: string;
      style: number;
      disabled?: boolean;
    }>;
  }>;
};
```

Use `party:join:<signupId>`, `party:leave:<signupId>`, `party:close:<signupId>`, and `party:day:<signupId>:<dayIndex>`.

Run: `npm test -- tests/server/discord-recruitment.test.ts`
Expected: PASS.

- [ ] **Step 3: Write failing bot signup route tests**

Assert bot route can create a signup for a mapped guild, blocks unknown guilds, blocks unlinked Discord users on apply, and returns an updated Discord message payload.

Run: `npm test -- tests/app/bot-signup-routes.test.ts`
Expected: FAIL before implementation.

- [ ] **Step 4: Implement signup mutation routes**

Routes call existing signup helpers and save Discord metadata. User-action routes resolve `discordUserId` to `Member` before mutating.

Run: `npm test -- tests/app/bot-signup-routes.test.ts tests/server/signups.test.ts`
Expected: PASS.

## Task 5: Availability Presets Finish

**Files:**
- Modify: `src/server/availability-presets.ts`
- Modify: `src/components/availability/availability-presets-panel.tsx`
- Modify: `src/app/calendar/page.tsx`
- Test: `tests/server/availability-presets.test.ts`
- Test: `tests/components/availability-presets.test.tsx`
- Test: `tests/app/calendar-page.test.tsx`

- [ ] **Step 1: Write failing preset action tests**

Assert a preset can be applied to a week, renamed, deleted, and created from current availability blocks.

Run: `npm test -- tests/server/availability-presets.test.ts`
Expected: FAIL before implementation.

- [ ] **Step 2: Implement preset server actions**

Add:

```ts
applyAvailabilityPresetToWeek({ memberId, presetId, weekStartDate })
renameAvailabilityPreset({ memberId, presetId, name })
deleteAvailabilityPreset({ memberId, presetId })
createAvailabilityPresetFromWeek({ memberId, name, weekStartDate })
```

All functions verify preset/member ownership.

Run: `npm test -- tests/server/availability-presets.test.ts`
Expected: PASS.

- [ ] **Step 3: Replace inactive preset panel buttons**

Render forms for apply, rename, delete, and save current week as preset. Pass server actions from `calendar/page.tsx`.

Run: `npm test -- tests/components/availability-presets.test.tsx tests/app/calendar-page.test.tsx`
Expected: PASS.

## Task 6: First-Pass Readiness

**Files:**
- Create: `src/server/readiness.ts`
- Modify: `src/components/signup/signup-board.tsx`
- Modify: `src/app/signup/page.tsx`
- Modify: `src/server/lostark-raid-presets.ts`
- Test: `tests/server/readiness.test.ts`
- Test: `tests/components/signup-board.test.tsx`
- Test: `tests/server/raid-templates.test.ts`

- [ ] **Step 1: Write failing readiness tests**

Assert readiness returns `READY`, `WARNING`, and `BLOCKED` based on item level, combat power, role, stale sync, and Discord link.

Run: `npm test -- tests/server/readiness.test.ts`
Expected: FAIL before implementation.

- [ ] **Step 2: Implement readiness computation**

`buildSignupReadiness(signupId)` loads signup entries and template thresholds, then returns per-entry status and reasons.

Run: `npm test -- tests/server/readiness.test.ts`
Expected: PASS.

- [ ] **Step 3: Surface readiness in signup UI**

Show compact readiness badges beside applicant characters and assigned entries. Update default raid requirement copy from `엘릭서/초월/보석` to `아이템 레벨, 아크 패시브, 보석, 전투력, 숙련도`.

Run: `npm test -- tests/components/signup-board.test.tsx tests/server/raid-templates.test.ts`
Expected: PASS.

## Task 7: Bot Site Client And Party Integration

**Files:**
- Modify: `D:\코덱스\focusai\focusai\focusai-webapp\lostark-discord-bot\src\config\env.ts`
- Create: `D:\코덱스\focusai\focusai\focusai-webapp\lostark-discord-bot\src\site-api\client.ts`
- Modify: `D:\코덱스\focusai\focusai\focusai-webapp\lostark-discord-bot\src\features\party\party.service.ts`
- Modify: `D:\코덱스\focusai\focusai\focusai-webapp\lostark-discord-bot\.env.example`

- [ ] **Step 1: Add optional site API config**

Expose:

```ts
lostarkPartySiteUrl: optionalEnv("LOSTARK_PARTY_SITE_URL"),
lostarkPartyBotApiToken: optionalEnv("LOSTARK_PARTY_BOT_API_TOKEN"),
```

Run: `npm run build`
Expected: PASS.

- [ ] **Step 2: Implement site API client**

Create helpers:

```ts
isSiteApiConfigured()
createSiteBackedSignup(input)
applySiteBackedSignup(input)
cancelSiteBackedSignup(input)
setSiteBackedAvailability(input)
closeSiteBackedSignup(input)
```

Every request sends `Authorization: Bearer ${token}` and returns typed Discord message payloads.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Route new party cards to the site**

When configured, `builder_create` calls `createSiteBackedSignup`, sends the returned Discord message, and does not write `data/party-recruitments.json`.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Route button mutations to the site**

When configured, `join`, `leave`, `day`, and `close` call site APIs and update the Discord message with the returned payload. `end` can delete the Discord card locally without mutating the site beyond close.

Run: `npm run build`
Expected: PASS.

## Task 8: Verification And Manual QA

**Files:**
- No new files unless failures require fixes.

- [ ] **Step 1: Site verification**

Run:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all PASS.

- [ ] **Step 2: Bot verification**

In `D:\코덱스\focusai\focusai\focusai-webapp\lostark-discord-bot`, run:

```bash
npm run build
npm run deploy:commands
```

Expected: build PASS. Deploy commands should only run when the `.env` points to the intended test guild.

- [ ] **Step 3: Browser smoke**

Start the site and inspect:

- `/settings`: Discord guild/channel fields render and save.
- `/signup`: recruitment/readiness surfaces render.
- `/calendar`: preset apply/rename/delete/save controls work.

Expected: no overlapping Korean text, no server errors.

- [ ] **Step 4: Discord smoke**

In a test guild:

- Run `/party panel`.
- Create a recruitment card.
- Join with a linked user.
- Attempt join with an unlinked user.
- Select one availability day.
- Close recruitment.
- Confirm the site `/signup` page shows the same signup and entries.

Expected: Discord and site state match.

