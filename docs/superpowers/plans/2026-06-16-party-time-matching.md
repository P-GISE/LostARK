# Party Time Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a party-first scheduling flow that recommends times for actual raid sets, groups signup applicants by availability overlap, and lets leaders confirm schedules from those recommendations.

**Architecture:** Add one server-side party matching service that reads existing availability, raid set, signup, and schedule records. Wire that service into set cards, signup assignment, the availability page, and party-specific reminder jobs while keeping `Schedule` as the only finalized raid run model.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Vitest, Testing Library, existing Discord notification jobs.

---

## File Structure

- Create `src/server/party-time-matching.ts`: shared service for member-scoped availability scoring, summary labels, conflict checks, and signup grouping helpers.
- Create `tests/server/party-time-matching.test.ts`: unit tests for scoring, missing availability, explicit unavailable, conflicts, and deterministic sorting.
- Modify `src/server/raid-sets.ts`: load recommendations for sets and validate conflicts during confirmation.
- Modify `tests/server/raid-sets.test.ts`: set confirmation and recommendation tests.
- Modify `src/components/set-builder/raid-set-card.tsx`: display party recommendations and confirmation controls.
- Modify `src/components/set-builder/set-builder-board.tsx`: pass recommendation and confirmation props to cards.
- Modify `src/app/sets/page.tsx`: fetch recommendations, add recommended-time confirmation server action, and revalidate affected pages.
- Modify `tests/components/set-builder.test.tsx`: recommendation display and confirm button tests.
- Modify `tests/app/sets-page.test.tsx`: page-level wiring test for recommendation data and confirm action.
- Modify `src/server/signups.ts`: replace application-order slicing with deterministic availability-aware grouping.
- Modify `tests/server/signups.test.ts`: grouping tests that prove overlap-based parties are generated.
- Modify `src/app/signup/page.tsx`: decorate signup assignments with generated set recommendations.
- Modify `src/components/signup/signup-board.tsx`: show assigned/generated party readiness when signup assignments exist.
- Modify `tests/components/signup-board.test.tsx`: assigned party readiness display tests.
- Modify `src/app/calendar/page.tsx`: load party-scoped recommendations for current week.
- Modify `src/components/availability-overview.tsx`: render optional party views below the current group heatmap.
- Modify `tests/app/calendar-page.test.tsx`: page passes party recommendation data to the overview.
- Modify `tests/components/availability-overview.test.tsx`: party-scoped view rendering.
- Modify `src/server/notifications.ts`: queue party availability coordination jobs for composed draft sets.
- Modify `tests/server/notifications.test.ts`: notification jobs target only members who need action.

No Prisma migration is planned. Existing uncommitted `prisma/schema.prisma` work must not be staged unless the executor owns that change.

---

### Task 1: Shared Party Time Matching Service

**Files:**
- Create: `src/server/party-time-matching.ts`
- Test: `tests/server/party-time-matching.test.ts`

- [ ] **Step 1: Write failing tests for party-specific scoring**

Create `tests/server/party-time-matching.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createCharacter } from "@/server/characters";
import { createRaidTemplate } from "@/server/raid-templates";
import { createScheduleFromTemplate } from "@/server/schedules";
import { setAvailabilitySlot } from "@/server/availability";
import { getPartyTimeMatches } from "@/server/party-time-matching";

describe("party time matching", () => {
  it("ranks all-available party slots before tentative and unavailable slots", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Party Match",
      leaderNickname: "Leader",
    });
    const memberA = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Alpha",
    });
    const memberB = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Beta",
    });

    for (const member of [leader, memberA, memberB]) {
      await setAvailabilitySlot({
        memberId: member.id,
        date: "2030-06-05",
        hour: 21,
        status: "AVAILABLE",
      });
    }
    await setAvailabilitySlot({
      memberId: leader.id,
      date: "2030-06-05",
      hour: 22,
      status: "AVAILABLE",
    });
    await setAvailabilitySlot({
      memberId: memberA.id,
      date: "2030-06-05",
      hour: 22,
      status: "TENTATIVE",
    });
    await setAvailabilitySlot({
      memberId: memberB.id,
      date: "2030-06-05",
      hour: 22,
      status: "AVAILABLE",
    });
    await setAvailabilitySlot({
      memberId: memberA.id,
      date: "2030-06-05",
      hour: 23,
      status: "UNAVAILABLE",
    });

    const matches = await getPartyTimeMatches({
      dates: ["2030-06-05"],
      groupId: group.id,
      hours: [21, 22, 23],
      memberIds: [leader.id, memberA.id, memberB.id],
      now: new Date("2030-06-05T00:00:00.000Z"),
    });

    expect(matches.map((match) => match.hour)).toEqual([21, 22, 23]);
    expect(matches[0]).toMatchObject({
      availableMembers: ["Leader", "Alpha", "Beta"],
      summaryLabel: "전원 가능",
      unavailableMembers: [],
    });
    expect(matches[1]).toMatchObject({
      summaryLabel: "1명 조율",
      tentativeMembers: ["Alpha"],
    });
    expect(matches[2]).toMatchObject({
      summaryLabel: "1명 불가",
      unavailableMembers: ["Alpha"],
    });
  });

  it("keeps missing availability separate from explicit unavailable", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Missing Match",
      leaderNickname: "Leader",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "NoInput",
    });
    await setAvailabilitySlot({
      memberId: leader.id,
      date: "2030-06-05",
      hour: 21,
      status: "AVAILABLE",
    });

    const matches = await getPartyTimeMatches({
      dates: ["2030-06-05"],
      groupId: group.id,
      hours: [21],
      memberIds: [leader.id, member.id],
      now: new Date("2030-06-05T00:00:00.000Z"),
    });

    expect(matches[0]).toMatchObject({
      availableMembers: ["Leader"],
      missingMembers: ["NoInput"],
      summaryLabel: "1명 미입력",
      unavailableMembers: [],
    });
  });

  it("reports confirmed schedule conflicts for assigned members", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Conflict Match",
      leaderNickname: "Leader",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Booked",
    });
    const character = await createCharacter({
      className: "Sorceress",
      itemLevel: 1640,
      memberId: member.id,
      name: "BookedChar",
      notes: "",
      preferredRole: "DPS",
    });
    const template = await createRaidTemplate({
      difficulty: "Hard",
      gates: "1",
      groupId: group.id,
      name: "Akkan",
      notes: "",
      requiredPlayers: 1,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "DPS 1",
          notes: "",
          required: true,
          role: "DPS",
        },
      ],
    });
    const schedule = await createScheduleFromTemplate({
      createdByMemberId: leader.id,
      groupId: group.id,
      startsAt: "2030-06-05T21:00:00+09:00",
      templateId: template.id,
      title: "Booked run",
    });
    await import("@/server/schedules").then(({ assignScheduleSlot }) =>
      assignScheduleSlot({
        characterId: character.id,
        memberId: member.id,
        slotId: schedule.slots[0].id,
      }),
    );

    const matches = await getPartyTimeMatches({
      dates: ["2030-06-05"],
      groupId: group.id,
      hours: [21],
      memberIds: [leader.id, member.id],
      now: new Date("2030-06-05T00:00:00.000Z"),
    });

    expect(matches[0].conflictedMembers).toEqual(["Booked"]);
    expect(matches[0].summaryLabel).toBe("1명 일정충돌");
  });
});
```

- [ ] **Step 2: Run the service test to verify it fails**

Run:

```bash
npm test -- tests/server/party-time-matching.test.ts
```

Expected: FAIL because `@/server/party-time-matching` does not exist.

- [ ] **Step 3: Add the party matching service**

Create `src/server/party-time-matching.ts`:

```ts
import { AvailabilityStatus } from "@prisma/client";
import {
  formatKstSlotDateTime,
  kstSlotDate,
  formatKstDate,
} from "@/server/availability";
import { isKstAvailabilitySlotInPast } from "@/lib/time-slots";
import { db } from "@/server/db";

type AvailabilityState = keyof typeof AvailabilityStatus | "MISSING";

export type PartyTimeMatch = {
  readonly date: string;
  readonly hour: number;
  readonly startsAt: string;
  readonly score: number;
  readonly summaryLabel: string;
  readonly availableMembers: readonly string[];
  readonly tentativeMembers: readonly string[];
  readonly unavailableMembers: readonly string[];
  readonly missingMembers: readonly string[];
  readonly conflictedMembers: readonly string[];
  readonly totalMembers: number;
  readonly recommended: boolean;
};

type MemberRef = {
  readonly id: string;
  readonly nickname: string;
};

function slotKey(date: string, hour: number) {
  return `${date}:${hour}`;
}

function kstHour(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours();
}

function summaryLabel(input: {
  readonly available: number;
  readonly conflicted: number;
  readonly missing: number;
  readonly tentative: number;
  readonly unavailable: number;
  readonly total: number;
}) {
  if (input.conflicted > 0) return `${input.conflicted}명 일정충돌`;
  if (input.unavailable > 0) return `${input.unavailable}명 불가`;
  if (input.missing > 0) return `${input.missing}명 미입력`;
  if (input.tentative > 0) return `${input.tentative}명 조율`;
  if (input.available === input.total && input.total > 0) return "전원 가능";
  return "추천 없음";
}

function scoreSlot(input: {
  readonly available: number;
  readonly conflicted: number;
  readonly missing: number;
  readonly tentative: number;
  readonly unavailable: number;
}) {
  return (
    input.available * 100 +
    input.tentative * 30 -
    input.missing * 10 -
    input.unavailable * 1000 -
    input.conflicted * 2000
  );
}

function memberNames(
  members: readonly MemberRef[],
  statuses: ReadonlyMap<string, AvailabilityState>,
  status: AvailabilityState,
) {
  return members
    .filter((member) => statuses.get(member.id) === status)
    .map((member) => member.nickname);
}

export async function getPartyTimeMatches(input: {
  readonly dates: readonly string[];
  readonly excludeScheduleId?: string;
  readonly groupId: string;
  readonly hours: readonly number[];
  readonly limit?: number;
  readonly memberIds: readonly string[];
  readonly now?: Date;
}): Promise<PartyTimeMatch[]> {
  const memberIds = Array.from(new Set(input.memberIds));
  if (memberIds.length === 0 || input.dates.length === 0 || input.hours.length === 0) {
    return [];
  }

  const members = await db.member.findMany({
    where: { groupId: input.groupId, id: { in: memberIds } },
    orderBy: { nickname: "asc" },
    select: { id: true, nickname: true },
  });
  if (members.length === 0) return [];

  const minHour = Math.min(...input.hours);
  const maxHour = Math.max(...input.hours);
  const from = kstSlotDate(input.dates[0], minHour);
  const to = kstSlotDate(input.dates[input.dates.length - 1], maxHour + 1);
  const statusBySlot = new Map<string, Map<string, AvailabilityState>>();

  for (const date of input.dates) {
    for (const hour of input.hours) {
      statusBySlot.set(slotKey(date, hour), new Map());
    }
  }

  const blocks = await db.availabilityBlock.findMany({
    where: {
      memberId: { in: members.map((member) => member.id) },
      startsAt: { lt: to },
      endsAt: { gt: from },
    },
    orderBy: [{ startsAt: "asc" }, { updatedAt: "asc" }],
  });

  for (const block of blocks) {
    const baseDate = formatKstDate(block.date);
    let cursor = new Date(block.startsAt);
    while (cursor < block.endsAt) {
      const startsAtDate = formatKstDate(cursor);
      const hour = kstHour(cursor) + (startsAtDate === baseDate ? 0 : 24);
      const responses = statusBySlot.get(slotKey(baseDate, hour));
      if (responses) responses.set(block.memberId, block.status);
      cursor = new Date(cursor.getTime() + 60 * 60 * 1000);
    }
  }

  const schedules = await db.schedule.findMany({
    where: {
      groupId: input.groupId,
      id: input.excludeScheduleId ? { not: input.excludeScheduleId } : undefined,
      startsAt: { gte: from, lt: to },
      status: { not: "CANCELED" },
      slots: { some: { assignedMemberId: { in: members.map((member) => member.id) } } },
    },
    select: {
      startsAt: true,
      slots: {
        where: { assignedMemberId: { in: members.map((member) => member.id) } },
        select: { assignedMemberId: true },
      },
    },
  });
  const conflictsBySlot = new Map<string, Set<string>>();
  for (const schedule of schedules) {
    const date = formatKstDate(schedule.startsAt);
    const key = slotKey(date, kstHour(schedule.startsAt));
    const conflicted = conflictsBySlot.get(key) ?? new Set<string>();
    for (const slot of schedule.slots) {
      if (slot.assignedMemberId) conflicted.add(slot.assignedMemberId);
    }
    conflictsBySlot.set(key, conflicted);
  }

  const matches = input.dates.flatMap((date) =>
    input.hours
      .filter((hour) => !isKstAvailabilitySlotInPast(date, hour, input.now))
      .map((hour) => {
        const key = slotKey(date, hour);
        const rawStatuses = statusBySlot.get(key) ?? new Map<string, AvailabilityState>();
        const statuses = new Map<string, AvailabilityState>();
        for (const member of members) {
          statuses.set(member.id, rawStatuses.get(member.id) ?? "MISSING");
        }
        const conflictedIds = conflictsBySlot.get(key) ?? new Set<string>();
        const conflictedMembers = members
          .filter((member) => conflictedIds.has(member.id))
          .map((member) => member.nickname);
        const availableMembers = memberNames(members, statuses, "AVAILABLE");
        const tentativeMembers = memberNames(members, statuses, "TENTATIVE");
        const unavailableMembers = memberNames(members, statuses, "UNAVAILABLE");
        const missingMembers = memberNames(members, statuses, "MISSING");
        const score = scoreSlot({
          available: availableMembers.length,
          conflicted: conflictedMembers.length,
          missing: missingMembers.length,
          tentative: tentativeMembers.length,
          unavailable: unavailableMembers.length,
        });

        return {
          availableMembers,
          conflictedMembers,
          date,
          hour,
          missingMembers,
          recommended: conflictedMembers.length === 0 && unavailableMembers.length === 0,
          score,
          startsAt: formatKstSlotDateTime(date, hour),
          summaryLabel: summaryLabel({
            available: availableMembers.length,
            conflicted: conflictedMembers.length,
            missing: missingMembers.length,
            tentative: tentativeMembers.length,
            total: members.length,
            unavailable: unavailableMembers.length,
          }),
          tentativeMembers,
          totalMembers: members.length,
          unavailableMembers,
        } satisfies PartyTimeMatch;
      }),
  );

  return matches
    .toSorted((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      return a.date === b.date ? a.hour - b.hour : a.date.localeCompare(b.date);
    })
    .slice(0, input.limit ?? matches.length);
}
```

- [ ] **Step 4: Run the service test to verify it passes**

Run:

```bash
npm test -- tests/server/party-time-matching.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/party-time-matching.ts tests/server/party-time-matching.test.ts
git commit -m "feat: add party time matching service"
```

---

### Task 2: RaidSet Server Integration

**Files:**
- Modify: `src/server/raid-sets.ts`
- Test: `tests/server/raid-sets.test.ts`

- [ ] **Step 1: Write failing RaidSet recommendation and conflict tests**

Append to `tests/server/raid-sets.test.ts`:

```ts
import { setAvailabilitySlot } from "@/server/availability";
import { getRaidSetTimeRecommendations } from "@/server/raid-sets";
```

Add inside the existing `describe("raid sets", () => { ... })` block:

```ts
  it("returns party-specific time recommendations for assigned draft sets", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "세트 추천 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "딜러",
    });
    const character = await createCharacter({
      className: "소서리스",
      itemLevel: 1640,
      memberId: member.id,
      name: "추천소서",
      notes: "",
      preferredRole: "DPS",
    });
    const template = await createRaidTemplate({
      difficulty: "하드",
      gates: "1",
      groupId: group.id,
      name: "아칸",
      notes: "",
      requiredPlayers: 1,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "딜러 1",
          notes: "",
          required: true,
          role: "DPS",
        },
      ],
    });
    const raidSet = await createRaidSetFromTemplate({
      actorMemberId: leader.id,
      label: "아칸 1파티",
      templateId: template.id,
      weekStartDate: "2030-06-05",
    });
    await import("@/server/raid-set-slots").then(({ assignRaidSetSlot }) =>
      assignRaidSetSlot({
        actorMemberId: leader.id,
        characterId: character.id,
        slotId: raidSet.slots[0].id,
      }),
    );
    await setAvailabilitySlot({
      memberId: member.id,
      date: "2030-06-05",
      hour: 21,
      status: "AVAILABLE",
    });

    const recommendations = await getRaidSetTimeRecommendations({
      dates: ["2030-06-05"],
      hours: [21],
      now: new Date("2030-06-05T00:00:00.000Z"),
      raidSetId: raidSet.id,
    });

    expect(recommendations[0]).toMatchObject({
      availableMembers: ["딜러"],
      hour: 21,
      summaryLabel: "전원 가능",
    });
  });

  it("rejects confirming a set when an assigned member has a schedule conflict", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "세트 충돌 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "겹침",
    });
    const character = await createCharacter({
      className: "바드",
      itemLevel: 1640,
      memberId: member.id,
      name: "겹침바드",
      notes: "",
      preferredRole: "SUPPORT",
    });
    const template = await createRaidTemplate({
      difficulty: "하드",
      gates: "1",
      groupId: group.id,
      name: "아칸",
      notes: "",
      requiredPlayers: 1,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "서폿 1",
          notes: "",
          required: true,
          role: "SUPPORT",
        },
      ],
    });
    const existingSchedule = await createScheduleFromTemplate({
      createdByMemberId: leader.id,
      groupId: group.id,
      startsAt: "2030-06-05T21:00:00+09:00",
      templateId: template.id,
      title: "기존 일정",
    });
    await import("@/server/schedules").then(({ assignScheduleSlot }) =>
      assignScheduleSlot({
        characterId: character.id,
        memberId: member.id,
        slotId: existingSchedule.slots[0].id,
      }),
    );
    const raidSet = await createRaidSetFromTemplate({
      actorMemberId: leader.id,
      label: "아칸 1파티",
      templateId: template.id,
      weekStartDate: "2030-06-05",
    });
    await import("@/server/raid-set-slots").then(({ assignRaidSetSlot }) =>
      assignRaidSetSlot({
        actorMemberId: leader.id,
        characterId: character.id,
        slotId: raidSet.slots[0].id,
      }),
    );

    await expect(
      confirmRaidSetSchedule({
        actorMemberId: leader.id,
        raidSetId: raidSet.id,
        startsAt: "2030-06-05T21:00:00+09:00",
      }),
    ).rejects.toThrow("이미 같은 시간에 확정된 일정이 있는 공대원이 있습니다");
  });
```

- [ ] **Step 2: Run RaidSet tests to verify they fail**

Run:

```bash
npm test -- tests/server/raid-sets.test.ts
```

Expected: FAIL because `getRaidSetTimeRecommendations` is not exported and confirmation does not check conflicts.

- [ ] **Step 3: Add RaidSet recommendation helper and confirmation conflict validation**

Modify imports in `src/server/raid-sets.ts`:

```ts
import { formatKstDate } from "@/server/availability";
import {
  getPartyTimeMatches,
  type PartyTimeMatch,
} from "@/server/party-time-matching";
```

Add these helpers before `createRaidSetFromTemplate`:

```ts
function kstHour(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours();
}

function assignedMemberIds(slots: readonly { assignedMemberId: string | null }[]) {
  return Array.from(
    new Set(
      slots
        .map((slot) => slot.assignedMemberId)
        .filter((memberId): memberId is string => Boolean(memberId)),
    ),
  );
}

export async function getRaidSetTimeRecommendations(input: {
  readonly dates: readonly string[];
  readonly hours: readonly number[];
  readonly limit?: number;
  readonly now?: Date;
  readonly raidSetId: string;
}): Promise<PartyTimeMatch[]> {
  const raidSet = await db.raidSet.findUnique({
    where: { id: input.raidSetId },
    include: { slots: { orderBy: { order: "asc" } } },
  });
  if (!raidSet) {
    throw new RaidSetError("공대 편성을 찾을 수 없습니다");
  }

  const memberIds = assignedMemberIds(raidSet.slots);
  if (memberIds.length === 0) return [];

  return getPartyTimeMatches({
    dates: input.dates,
    groupId: raidSet.groupId,
    hours: input.hours,
    limit: input.limit,
    memberIds,
    now: input.now,
  });
}
```

Inside `confirmRaidSetSchedule`, after parsing and validating `startsAt`, insert:

```ts
  const memberIds = assignedMemberIds(raidSet.slots);
  if (memberIds.length > 0) {
    const matches = await getPartyTimeMatches({
      dates: [formatKstDate(startsAt)],
      groupId: raidSet.groupId,
      hours: [kstHour(startsAt)],
      memberIds,
    });
    if ((matches[0]?.conflictedMembers.length ?? 0) > 0) {
      throw new RaidSetError(
        "이미 같은 시간에 확정된 일정이 있는 공대원이 있습니다",
      );
    }
  }
```

- [ ] **Step 4: Run RaidSet tests to verify they pass**

Run:

```bash
npm test -- tests/server/raid-sets.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/raid-sets.ts tests/server/raid-sets.test.ts
git commit -m "feat: connect raid sets to time matching"
```

---

### Task 3: Set Card Recommendation UI And Confirmation Action

**Files:**
- Modify: `src/components/set-builder/raid-set-card.tsx`
- Modify: `src/components/set-builder/set-builder-board.tsx`
- Modify: `src/app/sets/page.tsx`
- Test: `tests/components/set-builder.test.tsx`
- Test: `tests/app/sets-page.test.tsx`

- [ ] **Step 1: Write failing component tests**

Append to `tests/components/set-builder.test.tsx`:

```ts
  it("renders party time recommendations and confirm controls", () => {
    render(
      <SetBuilderBoard
        canManageSets
        confirmScheduleAction={async () => undefined}
        raidSets={[
          {
            id: "set-1",
            label: "Akkan 1",
            slots: [],
            status: "DRAFT",
            template: { difficulty: "Hard", gates: "1", name: "Akkan" },
            timeRecommendations: [
              {
                availableMembers: ["Helper"],
                conflictedMembers: [],
                date: "2030-06-05",
                hour: 21,
                missingMembers: [],
                recommended: true,
                score: 100,
                startsAt: "2030-06-05T21:00:00+09:00",
                summaryLabel: "전원 가능",
                tentativeMembers: [],
                totalMembers: 1,
                unavailableMembers: [],
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("추천 시간")).toBeInTheDocument();
    expect(screen.getByText("2030-06-05 21:00")).toBeInTheDocument();
    expect(screen.getByText("전원 가능")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이 시간 확정" }),
    ).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run component tests to verify they fail**

Run:

```bash
npm test -- tests/components/set-builder.test.tsx
```

Expected: FAIL because set card types do not include recommendations or confirm controls.

- [ ] **Step 3: Update `RaidSetCard` types and rendering**

In `src/components/set-builder/raid-set-card.tsx`, add:

```ts
export type RaidSetTimeRecommendationView = {
  readonly availableMembers: readonly string[];
  readonly conflictedMembers: readonly string[];
  readonly date: string;
  readonly hour: number;
  readonly missingMembers: readonly string[];
  readonly recommended: boolean;
  readonly score: number;
  readonly startsAt: string;
  readonly summaryLabel: string;
  readonly tentativeMembers: readonly string[];
  readonly totalMembers: number;
  readonly unavailableMembers: readonly string[];
};
```

Extend `RaidSetCardView`:

```ts
  readonly timeRecommendations?: readonly RaidSetTimeRecommendationView[];
```

Add helper functions:

```ts
function recommendationTimeText(recommendation: RaidSetTimeRecommendationView) {
  return `${recommendation.date} ${String(recommendation.hour).padStart(2, "0")}:00`;
}

function recommendationTone(recommendation: RaidSetTimeRecommendationView) {
  if (recommendation.conflictedMembers.length > 0 || recommendation.unavailableMembers.length > 0) {
    return "danger";
  }
  if (recommendation.missingMembers.length > 0 || recommendation.tentativeMembers.length > 0) {
    return "warning";
  }
  return "success";
}
```

Update the `RaidSetCard` props:

```ts
  confirmScheduleAction,
}: {
  readonly confirmScheduleAction?: (formData: FormData) => Promise<void>;
```

Render this block below the slot list:

```tsx
      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="text-sm font-semibold text-slate-950">추천 시간</div>
        {raidSet.timeRecommendations?.length ? (
          <div className="mt-2 grid gap-2">
            {raidSet.timeRecommendations.map((recommendation) => (
              <form
                action={confirmScheduleAction}
                className="grid gap-2 rounded-md border border-slate-200 bg-slate-50/70 p-2 sm:grid-cols-[1fr_auto]"
                key={`${raidSet.id}:${recommendation.startsAt}`}
              >
                <input name="raidSetId" type="hidden" value={raidSet.id} />
                <input name="startsAt" type="hidden" value={recommendation.startsAt} />
                <div>
                  <div className="font-medium text-slate-900">
                    {recommendationTimeText(recommendation)}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <Badge tone={recommendationTone(recommendation)}>
                      {recommendation.summaryLabel}
                    </Badge>
                    <span className="text-slate-500">
                      가능 {recommendation.availableMembers.length}/
                      {recommendation.totalMembers}
                    </span>
                  </div>
                </div>
                {canManageSets && raidSet.status !== "CONFIRMED" ? (
                  <button
                    className={secondaryButtonClassName}
                    disabled={recommendation.conflictedMembers.length > 0}
                  >
                    이 시간 확정
                  </button>
                ) : null}
              </form>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            배정된 인원 기준 추천 시간이 아직 없습니다.
          </p>
        )}
      </div>
```

- [ ] **Step 4: Pass confirmation props through `SetBuilderBoard`**

In `src/components/set-builder/set-builder-board.tsx`, import the new view type and add prop:

```ts
  confirmScheduleAction,
}: {
  readonly confirmScheduleAction?: (formData: FormData) => Promise<void>;
```

Pass it to `RaidSetCard`:

```tsx
                confirmScheduleAction={confirmScheduleAction}
```

- [ ] **Step 5: Wire recommendations and confirmation in `src/app/sets/page.tsx`**

Modify imports:

```ts
import { availabilityHours } from "@/lib/availability-hours";
import { buildLostArkWeekDays } from "@/lib/lostark-week";
import {
  confirmRaidSetSchedule,
  createRaidSetFromTemplate,
  deleteRaidSet,
  getRaidSetTimeRecommendations,
  listRaidSetsForWeek,
} from "@/server/raid-sets";
```

After `raidSets` loads, add:

```ts
  const days = buildLostArkWeekDays();
  const raidSetsWithRecommendations = await Promise.all(
    raidSets.map(async (raidSet) => ({
      ...raidSet,
      timeRecommendations: await getRaidSetTimeRecommendations({
        dates: days.map((day) => day.date),
        hours: availabilityHours,
        limit: 3,
        now: new Date(),
        raidSetId: raidSet.id,
      }),
    })),
  );
```

Add server action:

```ts
  async function confirmSetSchedule(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await confirmRaidSetSchedule({
      actorMemberId: current.id,
      raidSetId: String(formData.get("raidSetId") ?? ""),
      startsAt: String(formData.get("startsAt") ?? ""),
    });
    revalidateSetSurfaces();
    revalidatePath("/schedules");
  }
```

Pass props:

```tsx
        confirmScheduleAction={confirmSetSchedule}
        raidSets={raidSetsWithRecommendations}
```

- [ ] **Step 6: Run set UI tests**

Run:

```bash
npm test -- tests/components/set-builder.test.tsx tests/app/sets-page.test.tsx
```

Expected: PASS after updating `tests/app/sets-page.test.tsx` mocks for `getRaidSetTimeRecommendations` and `confirmRaidSetSchedule`.

- [ ] **Step 7: Commit**

```bash
git add src/components/set-builder/raid-set-card.tsx src/components/set-builder/set-builder-board.tsx src/app/sets/page.tsx tests/components/set-builder.test.tsx tests/app/sets-page.test.tsx
git commit -m "feat: show raid set time recommendations"
```

---

### Task 4: Availability-Aware Signup Assignment

**Files:**
- Modify: `src/server/party-time-matching.ts`
- Modify: `src/server/signups.ts`
- Test: `tests/server/signups.test.ts`

- [ ] **Step 1: Write failing signup grouping test**

Append to `tests/server/signups.test.ts`:

```ts
import { setAvailabilitySlot } from "@/server/availability";
import { listRaidSetsForWeek } from "@/server/raid-sets";
```

Add inside the existing `describe("signups", () => { ... })` block:

```ts
  it("groups signup applicants by overlapping availability before signup order", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "시간 기반 신청 공대",
      leaderNickname: "리더",
    });
    const template = await createRaidTemplate({
      difficulty: "하드",
      gates: "1",
      groupId: group.id,
      name: "아칸",
      notes: "",
      requiredPlayers: 2,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "딜러 1",
          notes: "",
          required: true,
          role: "DPS",
        },
        {
          classPreference: "",
          label: "딜러 2",
          notes: "",
          required: true,
          role: "DPS",
        },
      ],
    });
    const applicants = [];
    for (const nickname of ["A", "B", "C", "D"]) {
      const member = await joinGroupByInvite({
        inviteCode: group.inviteCode,
        nickname,
      });
      const character = await createCharacter({
        className: "소서리스",
        itemLevel: 1640,
        memberId: member.id,
        name: `${nickname}캐릭`,
        notes: "",
        preferredRole: "DPS",
      });
      applicants.push({ character, member });
    }
    for (const entry of [applicants[0], applicants[2]]) {
      await setAvailabilitySlot({
        memberId: entry.member.id,
        date: "2030-06-05",
        hour: 21,
        status: "AVAILABLE",
      });
    }
    for (const entry of [applicants[1], applicants[3]]) {
      await setAvailabilitySlot({
        memberId: entry.member.id,
        date: "2030-06-05",
        hour: 23,
        status: "AVAILABLE",
      });
    }
    const signup = await createRaidSignup({
      actorMemberId: leader.id,
      maxParties: 2,
      partySize: 2,
      templateId: template.id,
      title: "아칸 수강",
      weekStartDate: "2030-06-05",
    });
    for (const applicant of applicants) {
      await applyToRaidSignup({
        characterId: applicant.character.id,
        memberId: applicant.member.id,
        signupId: signup.id,
      });
    }

    await assignRaidSignup({ actorMemberId: leader.id, signupId: signup.id });
    const sets = await listRaidSetsForWeek(group.id, "2030-06-05");
    const partyNicknames = sets.map((set) =>
      set.slots
        .map((slot) => slot.assignedMember?.nickname)
        .filter((nickname): nickname is string => Boolean(nickname))
        .sort(),
    );

    expect(partyNicknames).toEqual([
      ["A", "C"],
      ["B", "D"],
    ]);
  });
```

- [ ] **Step 2: Run signup tests to verify failure**

Run:

```bash
npm test -- tests/server/signups.test.ts
```

Expected: FAIL because assignment still slices applicants in application order.

- [ ] **Step 3: Add grouping helper to `party-time-matching.ts`**

Append:

```ts
export type SignupGroupingEntry = {
  readonly characterId: string;
  readonly createdAt: Date;
  readonly id: string;
  readonly memberId: string;
};

function sharedAvailableCount(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
) {
  let count = 0;
  for (const key of left) {
    if (right.has(key)) count += 1;
  }
  return count;
}

async function availableSlotKeysByMember(input: {
  readonly dates: readonly string[];
  readonly groupId: string;
  readonly hours: readonly number[];
  readonly memberIds: readonly string[];
}) {
  const result = new Map<string, Set<string>>();
  for (const memberId of input.memberIds) {
    result.set(memberId, new Set());
  }
  if (input.dates.length === 0 || input.hours.length === 0) return result;

  const minHour = Math.min(...input.hours);
  const maxHour = Math.max(...input.hours);
  const from = kstSlotDate(input.dates[0], minHour);
  const to = kstSlotDate(input.dates[input.dates.length - 1], maxHour + 1);
  const blocks = await db.availabilityBlock.findMany({
    where: {
      member: { groupId: input.groupId },
      memberId: { in: input.memberIds },
      startsAt: { lt: to },
      endsAt: { gt: from },
      status: "AVAILABLE",
    },
  });

  for (const block of blocks) {
    const baseDate = formatKstDate(block.date);
    let cursor = new Date(block.startsAt);
    while (cursor < block.endsAt) {
      const startsAtDate = formatKstDate(cursor);
      const hour = kstHour(cursor) + (startsAtDate === baseDate ? 0 : 24);
      if (input.dates.includes(baseDate) && input.hours.includes(hour)) {
        result.get(block.memberId)?.add(slotKey(baseDate, hour));
      }
      cursor = new Date(cursor.getTime() + 60 * 60 * 1000);
    }
  }

  return result;
}

function candidateOverlapScore(input: {
  readonly candidate: SignupGroupingEntry;
  readonly party: readonly SignupGroupingEntry[];
  readonly slotKeysByMemberId: ReadonlyMap<string, ReadonlySet<string>>;
}) {
  const candidateSlots = input.slotKeysByMemberId.get(input.candidate.memberId) ?? new Set();
  return input.party.reduce((score, partyEntry) => {
    const partySlots = input.slotKeysByMemberId.get(partyEntry.memberId) ?? new Set();
    return score + sharedAvailableCount(candidateSlots, partySlots);
  }, 0);
}

export async function groupEntriesByAvailability(input: {
  readonly dates: readonly string[];
  readonly entries: readonly SignupGroupingEntry[];
  readonly groupId: string;
  readonly hours: readonly number[];
  readonly partySize: number;
}): Promise<SignupGroupingEntry[][]> {
  const remaining = [...input.entries].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const slotKeysByMemberId = await availableSlotKeysByMember({
    dates: input.dates,
    groupId: input.groupId,
    hours: input.hours,
    memberIds: remaining.map((entry) => entry.memberId),
  });
  const parties: SignupGroupingEntry[][] = [];

  while (remaining.length >= input.partySize) {
    const seed = remaining.shift();
    if (!seed) break;
    const party = [seed];
    while (party.length < input.partySize) {
      let bestIndex = 0;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (let index = 0; index < remaining.length; index += 1) {
        const candidate = remaining[index];
        const pairScore = candidateOverlapScore({
          candidate,
          party,
          slotKeysByMemberId,
        });
        if (pairScore > bestScore) {
          bestIndex = index;
          bestScore = pairScore;
        }
      }
      const [next] = remaining.splice(bestIndex, 1);
      if (next) party.push(next);
    }
    parties.push(party);
  }

  return parties;
}
```

- [ ] **Step 4: Use grouping in `assignRaidSignup`**

Modify imports in `src/server/signups.ts`:

```ts
import { availabilityHours } from "@/lib/availability-hours";
import { buildLostArkWeekDays } from "@/lib/lostark-week";
import { groupEntriesByAvailability } from "@/server/party-time-matching";
```

Replace `fullPartyCount` and `partyEntries` slicing setup with:

```ts
  const groupedEntries = await groupEntriesByAvailability({
    dates: buildLostArkWeekDays(new Date(`${signup.weekStartDate}T00:00:00+09:00`)).map(
      (day) => day.date,
    ),
    entries,
    groupId: signup.groupId,
    hours: availabilityHours,
    partySize: signup.partySize,
  });
  const fullParties = groupedEntries.slice(0, signup.maxParties);
  if (fullParties.length < 1) {
    throw new RaidSignupError("배정할 신청 인원이 부족합니다");
  }
```

Inside the transaction loop, use:

```ts
    for (let partyIndex = 0; partyIndex < fullParties.length; partyIndex += 1) {
      const partyEntries = fullParties[partyIndex];
```

- [ ] **Step 5: Run signup tests**

Run:

```bash
npm test -- tests/server/signups.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/party-time-matching.ts src/server/signups.ts tests/server/signups.test.ts
git commit -m "feat: group signups by availability"
```

---

### Task 5: Signup Board Generated Party Readiness

**Files:**
- Modify: `src/app/signup/page.tsx`
- Modify: `src/components/signup/signup-board.tsx`
- Test: `tests/components/signup-board.test.tsx`

- [ ] **Step 1: Write failing signup board readiness test**

Append to `tests/components/signup-board.test.tsx`:

```ts
  it("shows generated party readiness after assignment", () => {
    render(
      <SignupBoard
        canManageSignups
        signups={[
          {
            assignments: [
              {
                partyNumber: 1,
                raidSet: {
                  id: "set-1",
                  label: "Akkan class 1파티",
                  status: "DRAFT",
                  timeRecommendations: [
                    {
                      availableMembers: ["Helper"],
                      conflictedMembers: [],
                      date: "2030-06-05",
                      hour: 21,
                      missingMembers: [],
                      recommended: true,
                      score: 100,
                      startsAt: "2030-06-05T21:00:00+09:00",
                      summaryLabel: "전원 가능",
                      tentativeMembers: [],
                      totalMembers: 1,
                      unavailableMembers: [],
                    },
                  ],
                },
              },
            ],
            entries: [
              {
                character: { className: "Bard", name: "BardOne" },
                id: "entry-1",
                member: { id: "member-1", nickname: "Helper" },
                status: "ASSIGNED",
              },
            ],
            id: "signup-1",
            maxParties: 1,
            partySize: 1,
            status: "ASSIGNING",
            template: { difficulty: "Hard", gates: "1", name: "Akkan" },
            title: "Akkan class",
          },
        ]}
      />,
    );

    expect(screen.getByText("배정된 파티")).toBeInTheDocument();
    expect(screen.getByText("Akkan class 1파티")).toBeInTheDocument();
    expect(screen.getByText("전원 가능")).toBeInTheDocument();
    expect(screen.getByText("2030-06-05 21:00")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run signup board tests to verify failure**

Run:

```bash
npm test -- tests/components/signup-board.test.tsx
```

Expected: FAIL because `SignupBoard` has no `assignments` view type.

- [ ] **Step 3: Extend `SignupBoard` view types**

In `src/components/signup/signup-board.tsx`, import the recommendation view type:

```ts
import type { RaidSetTimeRecommendationView } from "@/components/set-builder/raid-set-card";
```

Add:

```ts
type SignupAssignmentView = {
  readonly partyNumber: number;
  readonly raidSet: {
    readonly id: string;
    readonly label: string;
    readonly status: string;
    readonly timeRecommendations?: readonly RaidSetTimeRecommendationView[];
  };
};
```

Extend `SignupView`:

```ts
  readonly assignments?: readonly SignupAssignmentView[];
```

Add helper:

```ts
function recommendationTimeText(recommendation: RaidSetTimeRecommendationView) {
  return `${recommendation.date} ${String(recommendation.hour).padStart(2, "0")}:00`;
}
```

Render after the entry list and before the apply form:

```tsx
              {signup.assignments?.length ? (
                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50/70 p-3">
                  <div className="text-sm font-semibold text-slate-950">
                    배정된 파티
                  </div>
                  <div className="mt-2 grid gap-2">
                    {signup.assignments.map((assignment) => {
                      const best = assignment.raidSet.timeRecommendations?.[0];
                      return (
                        <div
                          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                          key={assignment.raidSet.id}
                        >
                          <div className="font-medium text-slate-950">
                            {assignment.raidSet.label}
                          </div>
                          {best ? (
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span>{recommendationTimeText(best)}</span>
                              <span>{best.summaryLabel}</span>
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-slate-500">
                              추천 시간이 아직 없습니다.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
```

- [ ] **Step 4: Decorate signup assignments in `src/app/signup/page.tsx`**

Modify imports:

```ts
import { availabilityHours } from "@/lib/availability-hours";
import { buildLostArkWeekDays } from "@/lib/lostark-week";
import { getRaidSetTimeRecommendations } from "@/server/raid-sets";
```

After loading `signups`, add:

```ts
  const days = buildLostArkWeekDays();
  const signupsWithRecommendations = await Promise.all(
    signups.map(async (signup) => ({
      ...signup,
      assignments: await Promise.all(
        signup.assignments.map(async (assignment) => ({
          ...assignment,
          raidSet: {
            ...assignment.raidSet,
            timeRecommendations: await getRaidSetTimeRecommendations({
              dates: days.map((day) => day.date),
              hours: availabilityHours,
              limit: 3,
              raidSetId: assignment.raidSet.id,
            }),
          },
        })),
      ),
    })),
  );
```

Pass:

```tsx
        signups={signupsWithRecommendations}
```

- [ ] **Step 5: Run signup board tests**

Run:

```bash
npm test -- tests/components/signup-board.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/signup/page.tsx src/components/signup/signup-board.tsx tests/components/signup-board.test.tsx
git commit -m "feat: show signup party readiness"
```

---

### Task 6: Party-Scoped Availability Views

**Files:**
- Modify: `src/app/calendar/page.tsx`
- Modify: `src/components/availability-overview.tsx`
- Test: `tests/app/calendar-page.test.tsx`
- Test: `tests/components/availability-overview.test.tsx`

- [ ] **Step 1: Write failing overview component test**

Append to `tests/components/availability-overview.test.tsx`:

```ts
  it("renders party-scoped recommendations when provided", () => {
    render(
      <AvailabilityOverview
        partyMatches={[
          {
            label: "아칸 1파티",
            recommendations: [
              {
                availableMembers: ["Alpha", "Beta"],
                conflictedMembers: [],
                date: "2030-06-05",
                hour: 21,
                missingMembers: [],
                recommended: true,
                score: 200,
                startsAt: "2030-06-05T21:00:00+09:00",
                summaryLabel: "전원 가능",
                tentativeMembers: [],
                totalMembers: 2,
                unavailableMembers: [],
              },
            ],
          },
        ]}
        slots={[]}
      />,
    );

    expect(screen.getByText("파티별 추천 시간")).toBeInTheDocument();
    expect(screen.getByText("아칸 1파티")).toBeInTheDocument();
    expect(screen.getByText("전원 가능")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run availability overview tests to verify failure**

Run:

```bash
npm test -- tests/components/availability-overview.test.tsx
```

Expected: FAIL because `partyMatches` is not a supported prop.

- [ ] **Step 3: Extend `AvailabilityOverview`**

In `src/components/availability-overview.tsx`, import `PartyTimeMatch` as a type:

```ts
import type { PartyTimeMatch } from "@/server/party-time-matching";
```

Add:

```ts
type PartyAvailabilityMatch = {
  readonly label: string;
  readonly recommendations: readonly PartyTimeMatch[];
};
```

Change props:

```ts
  partyMatches = [],
}: {
  now?: Date;
  partyMatches?: readonly PartyAvailabilityMatch[];
  slots: GroupAvailabilitySlot[];
}) {
```

Before the closing `</section>`, render:

```tsx
      {partyMatches.length > 0 ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              파티별 추천 시간
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              편성된 인원 기준으로 출발 가능한 시간을 비교합니다.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {partyMatches.map((party) => (
              <div
                className="rounded-md border border-slate-200/90 bg-white p-3 shadow-sm shadow-slate-200/70"
                key={party.label}
              >
                <div className="font-semibold text-slate-950">{party.label}</div>
                <div className="mt-2 grid gap-2">
                  {party.recommendations.map((recommendation) => (
                    <div
                      className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                      key={`${party.label}:${recommendation.startsAt}`}
                    >
                      <div className="font-medium text-slate-900">
                        {`${recommendation.date} ${String(recommendation.hour).padStart(2, "0")}:00`}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {recommendation.summaryLabel}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
```

- [ ] **Step 4: Wire party matches in `calendar/page.tsx`**

Modify imports:

```ts
import { listRaidSetsForWeek } from "@/server/raid-sets";
import { getPartyTimeMatches } from "@/server/party-time-matching";
```

Load sets with current week:

```ts
  const raidSets = await listRaidSetsForWeek(member.groupId, days[0].date);
  const partyMatches = await Promise.all(
    raidSets.map(async (raidSet) => ({
      label: raidSet.label,
      recommendations: await getPartyTimeMatches({
        dates: days.map((day) => day.date),
        groupId: member.groupId,
        hours: availabilityHours,
        limit: 3,
        memberIds: Array.from(
          new Set(
            raidSet.slots
              .map((slot) => slot.assignedMemberId)
              .filter((memberId): memberId is string => Boolean(memberId)),
          ),
        ),
        now,
      }),
    })),
  );
```

Pass:

```tsx
        <AvailabilityOverview partyMatches={partyMatches} slots={groupOverview} />
```

- [ ] **Step 5: Run calendar tests**

Run:

```bash
npm test -- tests/components/availability-overview.test.tsx tests/app/calendar-page.test.tsx
```

Expected: PASS after updating app test mocks for `listRaidSetsForWeek` and `getPartyTimeMatches`.

- [ ] **Step 6: Commit**

```bash
git add src/app/calendar/page.tsx src/components/availability-overview.tsx tests/app/calendar-page.test.tsx tests/components/availability-overview.test.tsx
git commit -m "feat: add party availability overview"
```

---

### Task 7: Party Coordination Notifications

**Files:**
- Modify: `src/server/notifications.ts`
- Modify: `src/server/signups.ts`
- Test: `tests/server/notifications.test.ts`
- Test: `tests/server/signups.test.ts`

- [ ] **Step 1: Write failing notification test**

Append to `tests/server/notifications.test.ts`:

```ts
import { queueRaidSetAvailabilityJobs } from "@/server/notifications";
import { createRaidSetFromTemplate } from "@/server/raid-sets";
import { assignRaidSetSlot } from "@/server/raid-set-slots";
```

Add inside the existing `describe("notifications", () => { ... })` block:

```ts
  it("queues party availability jobs only for assigned members with Discord", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Party Notify",
      leaderNickname: "Leader",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Target",
    });
    await connectDiscordMember({ memberId: member.id, discordUserId: "discord-target" });
    const character = await createCharacter({
      className: "Bard",
      itemLevel: 1640,
      memberId: member.id,
      name: "NotifyBard",
      notes: "",
      preferredRole: "SUPPORT",
    });
    const template = await createRaidTemplate({
      difficulty: "Hard",
      gates: "1",
      groupId: group.id,
      name: "Akkan",
      notes: "",
      requiredPlayers: 1,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "Support 1",
          notes: "",
          required: true,
          role: "SUPPORT",
        },
      ],
    });
    const raidSet = await createRaidSetFromTemplate({
      actorMemberId: leader.id,
      label: "Akkan 1",
      templateId: template.id,
      weekStartDate: "2030-06-05",
    });
    await assignRaidSetSlot({
      actorMemberId: leader.id,
      characterId: character.id,
      slotId: raidSet.slots[0].id,
    });

    const result = await queueRaidSetAvailabilityJobs({
      now: new Date("2030-06-05T00:00:00.000Z"),
      raidSetId: raidSet.id,
    });
    const jobs = await db.notificationJob.findMany({
      where: { type: "PARTY_AVAILABILITY" },
    });

    expect(result.count).toBe(1);
    expect(jobs[0]).toMatchObject({
      groupId: group.id,
      memberId: member.id,
      message: expect.stringContaining("Akkan 1"),
    });
  });
```

- [ ] **Step 2: Run notification tests to verify failure**

Run:

```bash
npm test -- tests/server/notifications.test.ts
```

Expected: FAIL because `queueRaidSetAvailabilityJobs` does not exist.

- [ ] **Step 3: Add queue function**

Append to `src/server/notifications.ts`:

```ts
export async function queueRaidSetAvailabilityJobs(input: {
  readonly now?: Date;
  readonly raidSetId: string;
}) {
  const now = input.now ?? new Date();
  const raidSet = await db.raidSet.findUnique({
    where: { id: input.raidSetId },
    include: {
      slots: {
        include: { assignedMember: true },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!raidSet) return { count: 0 };

  const members = Array.from(
    new Map(
      raidSet.slots
        .map((slot) => slot.assignedMember)
        .filter((member): member is NonNullable<typeof member> =>
          Boolean(member?.discordUserId),
        )
        .map((member) => [member.id, member]),
    ).values(),
  );

  if (members.length === 0) return { count: 0 };

  return db.notificationJob.createMany({
    data: members.map((member) => ({
      groupId: raidSet.groupId,
      memberId: member.id,
      scheduleId: null,
      sendAfter: now,
      type: "PARTY_AVAILABILITY",
      message: [
        "[로스트아크 공대관리] 편성된 파티의 가능 시간 조율이 필요합니다.",
        `파티: ${raidSet.label}`,
        "가능 시간 페이지에서 이번 주 출발 가능 시간을 확인해 주세요.",
      ].join("\n"),
    })),
  });
}
```

- [ ] **Step 4: Call queue function after signup assignment**

In `src/server/signups.ts`, import:

```ts
import { queueRaidSetAvailabilityJobs } from "@/server/notifications";
```

After the transaction in `assignRaidSignup`, store its result then queue:

```ts
  const createdSetIds = await db.$transaction(async (tx) => {
    // existing transaction body returns createdSetIds
  });

  for (const raidSetId of createdSetIds) {
    await queueRaidSetAvailabilityJobs({ raidSetId });
  }

  return createdSetIds;
```

- [ ] **Step 5: Run notification and signup tests**

Run:

```bash
npm test -- tests/server/notifications.test.ts tests/server/signups.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/notifications.ts src/server/signups.ts tests/server/notifications.test.ts tests/server/signups.test.ts
git commit -m "feat: notify parties for availability coordination"
```

---

### Task 8: Full Verification And Manual QA

**Files:**
- Modify only files required by test or build failures discovered in this task.

- [ ] **Step 1: Run focused server and component tests**

Run:

```bash
npm test -- tests/server/party-time-matching.test.ts tests/server/raid-sets.test.ts tests/server/signups.test.ts tests/server/notifications.test.ts tests/components/set-builder.test.tsx tests/components/signup-board.test.tsx tests/components/availability-overview.test.tsx tests/app/sets-page.test.tsx tests/app/calendar-page.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no new lint errors.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Manual QA through the app surface**

Start the dev server:

```bash
npm run dev
```

Open the app in a browser and verify this path:

1. Create or use a group with at least two members and characters.
2. Enter availability for different members.
3. Open a signup and apply with characters.
4. Assign the signup.
5. Go to `/sets` and confirm generated party cards show recommended times.
6. Confirm one recommended time.
7. Go to `/schedules` and verify the created schedule contains the assigned members.
8. Go to `/calendar` and verify party-specific recommendations appear below the group overview.

Expected: the leader can move from availability and signup to a confirmed schedule without using chat or a spreadsheet for the primary time decision.

- [ ] **Step 5: Report final working tree state**

Run:

```bash
git status --short
```

Expected: only files intentionally changed by the executed tasks are committed.
If this command shows unrelated pre-existing files, name them in the final report
and leave them unstaged.

---

## Execution Notes

- Keep commits scoped to each task. Do not stage the pre-existing `prisma/schema.prisma` change unless it is explicitly brought into the task by the user.
- Use `npm test -- <paths>` for focused checks after each task, then `npm run lint` and `npm run build` before calling the implementation complete.
- If browser QA reveals a layout issue in `RaidSetCard` or `AvailabilityOverview`, fix it in the same task that introduced the UI and rerun the relevant component test.
