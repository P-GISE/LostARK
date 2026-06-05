# Lost Ark Template Character Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Lostark OpenAPI character sync from a submitted main character, preserve item level and combat power for sorting, and correct the built-in raid template presets.

**Architecture:** Keep all official API calls server-side behind `LOSTARK_OPEN_API_JWT`. Add small focused modules for API parsing, character display sorting, and character sync orchestration; keep existing server actions and Prisma ownership rules. Update default raid preset import to create missing defaults and migrate exact legacy default templates without touching unrelated user-created templates.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/PostgreSQL, Vitest, Testing Library, Lostark OpenAPI.

---

## File Structure

- Modify `prisma/schema.prisma`: change `Character.itemLevel` to `Float`, add API sync metadata fields.
- Create `prisma/migrations/20260605093000_add_character_sync_fields/migration.sql`: PostgreSQL migration for character sync fields.
- Modify `.env.example`: document `LOSTARK_OPEN_API_JWT`.
- Create `src/lib/character-display.ts`: reusable character sort and formatting helpers.
- Create `tests/lib/character-display.test.ts`: unit tests for display sorting and formatting.
- Create `src/server/lostark-api.ts`: official API client and parser.
- Create `tests/server/lostark-api.test.ts`: mocked `fetch` tests for API parsing and errors.
- Modify `src/server/characters.ts`: accept optional sync metadata and sort character reads.
- Create `src/server/character-sync.ts`: import/update same-server characters from a main character.
- Create `tests/server/character-sync.test.ts`: database tests with mocked official API responses.
- Modify `src/server/members.ts`: sort included member characters with the shared helper.
- Modify `src/components/character-form.tsx`: optionally collect server name and combat power for manual entries.
- Create `src/components/character-sync-form.tsx`: main-character sync form.
- Modify `src/app/members/page.tsx`: add sync server action, display server/item level/combat power/main badge.
- Create `tests/components/character-sync-form.test.tsx`: sync form UI tests.
- Modify `tests/components/character-form.test.tsx`: manual metadata field tests.
- Modify `src/app/auth/signup/signup-form.tsx`: relabel display name to "공대 확인용 이름".
- Create `tests/app/signup-form.test.tsx`: signup label regression test.
- Modify `src/server/lostark-raid-presets.ts`: corrected preset data and legacy keys.
- Modify `src/server/raid-templates.ts`: import created/updated/skipped defaults.
- Modify `tests/server/raid-templates.test.ts`: corrected preset and legacy update tests.
- Modify `src/app/templates/page.tsx`: update import copy for corrected presets.
- Modify `tests/app/templates-page.test.tsx`: corrected labels if page copy changes.

---

### Task 1: Character Display Helpers

**Files:**
- Create: `src/lib/character-display.ts`
- Create: `tests/lib/character-display.test.ts`

- [ ] **Step 1: Write the failing sort and format tests**

Add this file:

```ts
import { describe, expect, it } from "vitest";
import {
  compareCharacterDisplay,
  formatCombatPower,
  formatItemLevel,
  sortCharactersForDisplay,
} from "@/lib/character-display";

describe("character display helpers", () => {
  const characters = [
    {
      name: "낮은본캐",
      itemLevel: 1700,
      combatPower: 5000,
      isMain: true,
    },
    {
      name: "강한부캐",
      itemLevel: 1750.33,
      combatPower: 7000,
      isMain: false,
    },
    {
      name: "동렙고전투력",
      itemLevel: 1720,
      combatPower: 6500,
      isMain: false,
    },
    {
      name: "동렙저전투력",
      itemLevel: 1720,
      combatPower: 6100,
      isMain: false,
    },
  ];

  it("sorts main first, then item level, combat power, and name", () => {
    expect(sortCharactersForDisplay(characters).map((item) => item.name)).toEqual([
      "낮은본캐",
      "강한부캐",
      "동렙고전투력",
      "동렙저전투력",
    ]);
  });

  it("formats item level and combat power for compact Korean UI", () => {
    expect(formatItemLevel(1773.33)).toBe("1773.33");
    expect(formatItemLevel(1700)).toBe("1700");
    expect(formatCombatPower(6127)).toBe("6,127");
    expect(formatCombatPower(null)).toBe("전투력 미확인");
  });

  it("can compare two display records directly", () => {
    expect(compareCharacterDisplay(characters[0], characters[1])).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test tests/lib/character-display.test.ts
```

Expected: FAIL with module resolution error for `@/lib/character-display`.

- [ ] **Step 3: Implement the helper**

Create `src/lib/character-display.ts`:

```ts
export type CharacterDisplayInput = {
  name: string;
  itemLevel: number;
  combatPower: number | null;
  isMain?: boolean;
};

export function compareCharacterDisplay(
  a: CharacterDisplayInput,
  b: CharacterDisplayInput,
) {
  if (Boolean(a.isMain) !== Boolean(b.isMain)) {
    return a.isMain ? -1 : 1;
  }

  const itemLevelComparison = b.itemLevel - a.itemLevel;
  if (itemLevelComparison !== 0) {
    return itemLevelComparison;
  }

  const aCombatPower = a.combatPower ?? -1;
  const bCombatPower = b.combatPower ?? -1;
  const combatPowerComparison = bCombatPower - aCombatPower;
  if (combatPowerComparison !== 0) {
    return combatPowerComparison;
  }

  return a.name.localeCompare(b.name, "ko");
}

export function sortCharactersForDisplay<T extends CharacterDisplayInput>(
  characters: readonly T[],
) {
  return [...characters].sort(compareCharacterDisplay);
}

export function formatItemLevel(itemLevel: number) {
  return Number.isInteger(itemLevel) ? String(itemLevel) : itemLevel.toFixed(2);
}

export function formatCombatPower(combatPower: number | null | undefined) {
  if (combatPower == null) {
    return "전투력 미확인";
  }
  return new Intl.NumberFormat("ko-KR").format(combatPower);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm test tests/lib/character-display.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/lib/character-display.test.ts src/lib/character-display.ts
git commit -m "feat: add character display sorting"
```

---

### Task 2: Character Schema And Server Metadata

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260605093000_add_character_sync_fields/migration.sql`
- Modify: `src/server/characters.ts`
- Modify: `src/server/members.ts`
- Modify: `.env.example`
- Modify: `tests/server/characters.test.ts`

- [ ] **Step 1: Write the failing character metadata test**

Append this test to `tests/server/characters.test.ts`:

```ts
  it("stores sync metadata and lists characters in display order", async () => {
    const group = await createGroup({ name: "Sync Metadata" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "SyncUser",
    });

    await createCharacter({
      memberId: member.id,
      name: "높은부캐",
      className: "브레이커",
      itemLevel: 1750.33,
      preferredRole: "DPS",
      notes: "",
      serverName: "루페온",
      combatPower: 7000,
      isMain: false,
    });
    await createCharacter({
      memberId: member.id,
      name: "본캐",
      className: "바드",
      itemLevel: 1710.83,
      preferredRole: "SUPPORT",
      notes: "대표 캐릭터",
      serverName: "루페온",
      combatPower: 6127,
      isMain: true,
    });

    const characters = await listCharactersForMember(member.id);

    expect(characters.map((character) => character.name)).toEqual([
      "본캐",
      "높은부캐",
    ]);
    expect(characters[0].serverName).toBe("루페온");
    expect(characters[0].combatPower).toBe(6127);
    expect(characters[0].isMain).toBe(true);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test tests/server/characters.test.ts
```

Expected: FAIL with TypeScript/Prisma errors because `serverName`, `combatPower`, and `isMain` are not accepted yet, or because `itemLevel` is still integer-backed.

- [ ] **Step 3: Update Prisma schema**

Change the `Character` model in `prisma/schema.prisma` to:

```prisma
model Character {
  id            String         @id @default(cuid())
  memberId      String
  member        Member         @relation(fields: [memberId], references: [id], onDelete: Cascade)
  name          String
  className     String
  serverName    String         @default("")
  itemLevel     Float
  combatPower   Int?
  isMain        Boolean        @default(false)
  lastSyncedAt  DateTime?
  preferredRole SlotRole
  notes         String         @default("")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  scheduleSlots ScheduleSlot[]
}
```

Create `prisma/migrations/20260605093000_add_character_sync_fields/migration.sql`:

```sql
ALTER TABLE "Character"
  ALTER COLUMN "itemLevel" TYPE DOUBLE PRECISION,
  ADD COLUMN "serverName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "combatPower" INTEGER,
  ADD COLUMN "isMain" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3);
```

- [ ] **Step 4: Update server character functions**

Modify `src/server/characters.ts`:

```ts
import { SlotRole } from "@prisma/client";
import { sortCharactersForDisplay } from "@/lib/character-display";
import { db } from "@/server/db";

export async function createCharacter(input: {
  memberId: string;
  name: string;
  className: string;
  serverName?: string;
  itemLevel: number;
  combatPower?: number | null;
  isMain?: boolean;
  lastSyncedAt?: Date | null;
  preferredRole: keyof typeof SlotRole;
  notes: string;
}) {
  if (input.itemLevel <= 0) {
    throw new Error("아이템 레벨은 0보다 커야 합니다");
  }
  if (input.name.trim().length < 2) {
    throw new Error("캐릭터명은 2자 이상이어야 합니다");
  }

  return db.character.create({
    data: {
      memberId: input.memberId,
      name: input.name.trim(),
      className: input.className.trim(),
      serverName: input.serverName?.trim() ?? "",
      itemLevel: input.itemLevel,
      combatPower: input.combatPower ?? null,
      isMain: input.isMain ?? false,
      lastSyncedAt: input.lastSyncedAt ?? null,
      preferredRole: input.preferredRole,
      notes: input.notes.trim(),
    },
  });
}
```

Keep the existing ownership checks in `updateCharacter`, and add the same optional metadata fields to its input and update `data`:

```ts
serverName: input.serverName?.trim() ?? "",
combatPower: input.combatPower ?? null,
isMain: input.isMain ?? false,
lastSyncedAt: input.lastSyncedAt ?? null,
```

Change `listCharactersForMember` to:

```ts
export async function listCharactersForMember(memberId: string) {
  const characters = await db.character.findMany({
    where: { memberId },
  });

  return sortCharactersForDisplay(characters);
}
```

Modify `src/server/members.ts` so `listMembers` sorts each member's characters:

```ts
import { sortCharactersForDisplay } from "@/lib/character-display";
```

and map the result:

```ts
export async function listMembers(groupId: string) {
  const members = await db.member.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    include: { characters: true },
  });

  return members.map((member) => ({
    ...member,
    characters: sortCharactersForDisplay(member.characters),
  }));
}
```

- [ ] **Step 5: Document the API token env var**

Append to `.env.example`:

```env
LOSTARK_OPEN_API_JWT=
```

- [ ] **Step 6: Generate Prisma client and run the focused test**

Run:

```bash
npm run db:generate
npm test tests/server/characters.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260605093000_add_character_sync_fields/migration.sql src/server/characters.ts src/server/members.ts .env.example tests/server/characters.test.ts
git commit -m "feat: store character sync metadata"
```

---

### Task 3: Lostark OpenAPI Client

**Files:**
- Create: `src/server/lostark-api.ts`
- Create: `tests/server/lostark-api.test.ts`

- [ ] **Step 1: Write failing API client tests**

Create `tests/server/lostark-api.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchLostArkCharacterProfile,
  fetchLostArkSiblingCharacters,
  parseLostArkNumber,
} from "@/server/lostark-api";

describe("lostark api client", () => {
  beforeEach(() => {
    vi.stubEnv("LOSTARK_OPEN_API_JWT", "jwt-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("parses formatted numeric strings", () => {
    expect(parseLostArkNumber("1,773.33")).toBe(1773.33);
    expect(parseLostArkNumber("6,127")).toBe(6127);
  });

  it("fetches sibling characters with bearer authorization", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          ServerName: "루페온",
          CharacterName: "본캐",
          CharacterClassName: "바드",
          ItemAvgLevel: "1,773.33",
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const siblings = await fetchLostArkSiblingCharacters("본캐");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://developer-lostark.game.onstove.com/characters/%EB%B3%B8%EC%BA%90/siblings",
      {
        headers: {
          accept: "application/json",
          authorization: "bearer jwt-token",
        },
      },
    );
    expect(siblings).toEqual([
      {
        serverName: "루페온",
        characterName: "본캐",
        className: "바드",
        itemLevel: 1773.33,
      },
    ]);
  });

  it("fetches profile combat power", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ServerName: "루페온",
          CharacterName: "본캐",
          CharacterClassName: "바드",
          ItemAvgLevel: "1,773.33",
          CombatPower: "6,127",
        }),
      }),
    );

    await expect(fetchLostArkCharacterProfile("본캐")).resolves.toEqual({
      serverName: "루페온",
      characterName: "본캐",
      className: "바드",
      itemLevel: 1773.33,
      combatPower: 6127,
    });
  });

  it("throws a Korean error when the API key is missing", async () => {
    vi.unstubAllEnvs();

    await expect(fetchLostArkSiblingCharacters("본캐")).rejects.toThrow(
      "로스트아크 OpenAPI 키가 설정되어 있지 않습니다",
    );
  });

  it("maps rate limit responses to a Korean error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
      }),
    );

    await expect(fetchLostArkSiblingCharacters("본캐")).rejects.toThrow(
      "로스트아크 OpenAPI 호출 제한에 도달했습니다",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test tests/server/lostark-api.test.ts
```

Expected: FAIL with module resolution error for `@/server/lostark-api`.

- [ ] **Step 3: Implement the API client**

Create `src/server/lostark-api.ts`:

```ts
const LOSTARK_API_BASE_URL = "https://developer-lostark.game.onstove.com";

export type LostArkSiblingCharacter = {
  serverName: string;
  characterName: string;
  className: string;
  itemLevel: number;
};

export type LostArkCharacterProfile = LostArkSiblingCharacter & {
  combatPower: number | null;
};

type RawSibling = {
  ServerName?: string;
  CharacterName?: string;
  CharacterClassName?: string;
  ItemAvgLevel?: string;
};

type RawProfile = RawSibling & {
  CombatPower?: string | number | null;
};

export function parseLostArkNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error("로스트아크 캐릭터 수치를 해석하지 못했습니다");
  }
  return parsed;
}

function getApiToken() {
  const token = process.env.LOSTARK_OPEN_API_JWT?.trim();
  if (!token) {
    throw new Error("로스트아크 OpenAPI 키가 설정되어 있지 않습니다");
  }
  return token;
}

async function fetchJson(path: string) {
  const response = await fetch(`${LOSTARK_API_BASE_URL}${path}`, {
    headers: {
      accept: "application/json",
      authorization: `bearer ${getApiToken()}`,
    },
  });

  if (response.status === 401) {
    throw new Error("로스트아크 OpenAPI 인증에 실패했습니다");
  }
  if (response.status === 404) {
    throw new Error("로스트아크 캐릭터를 찾을 수 없습니다");
  }
  if (response.status === 429) {
    throw new Error("로스트아크 OpenAPI 호출 제한에 도달했습니다");
  }
  if (!response.ok) {
    throw new Error("로스트아크 OpenAPI 응답을 가져오지 못했습니다");
  }

  return response.json();
}

function normalizeSibling(raw: RawSibling): LostArkSiblingCharacter {
  const serverName = raw.ServerName?.trim();
  const characterName = raw.CharacterName?.trim();
  const className = raw.CharacterClassName?.trim();
  if (!serverName || !characterName || !className) {
    throw new Error("로스트아크 캐릭터 정보가 올바르지 않습니다");
  }

  return {
    serverName,
    characterName,
    className,
    itemLevel: parseLostArkNumber(raw.ItemAvgLevel),
  };
}

export async function fetchLostArkSiblingCharacters(characterName: string) {
  const trimmed = characterName.trim();
  if (!trimmed) {
    throw new Error("본캐 캐릭터명을 입력해 주세요");
  }

  const json = (await fetchJson(
    `/characters/${encodeURIComponent(trimmed)}/siblings`,
  )) as RawSibling[];

  if (!Array.isArray(json) || json.length === 0) {
    throw new Error("같은 계정의 로스트아크 캐릭터를 찾지 못했습니다");
  }

  return json.map(normalizeSibling);
}

export async function fetchLostArkCharacterProfile(characterName: string) {
  const trimmed = characterName.trim();
  if (!trimmed) {
    throw new Error("캐릭터명을 입력해 주세요");
  }

  const json = (await fetchJson(
    `/armories/characters/${encodeURIComponent(trimmed)}/profiles`,
  )) as RawProfile;
  const sibling = normalizeSibling(json);

  return {
    ...sibling,
    combatPower:
      json.CombatPower == null ? null : Math.round(parseLostArkNumber(json.CombatPower)),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm test tests/server/lostark-api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/server/lostark-api.test.ts src/server/lostark-api.ts
git commit -m "feat: add lostark api client"
```

---

### Task 4: Character Sync Service

**Files:**
- Create: `src/server/character-sync.ts`
- Create: `tests/server/character-sync.test.ts`

- [ ] **Step 1: Write failing sync tests**

Create `tests/server/character-sync.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createCharacter, listCharactersForMember } from "@/server/characters";
import { syncLostArkCharactersForMember } from "@/server/character-sync";

function mockLostArkFetch() {
  const responses = new Map<string, unknown>([
    [
      "/characters/%EB%B3%B8%EC%BA%90/siblings",
      [
        {
          ServerName: "루페온",
          CharacterName: "본캐",
          CharacterClassName: "바드",
          ItemAvgLevel: "1,773.33",
        },
        {
          ServerName: "루페온",
          CharacterName: "부캐",
          CharacterClassName: "브레이커",
          ItemAvgLevel: "1,720.00",
        },
        {
          ServerName: "카마인",
          CharacterName: "다른서버",
          CharacterClassName: "소서리스",
          ItemAvgLevel: "1,700.00",
        },
      ],
    ],
    [
      "/armories/characters/%EB%B3%B8%EC%BA%90/profiles",
      {
        ServerName: "루페온",
        CharacterName: "본캐",
        CharacterClassName: "바드",
        ItemAvgLevel: "1,773.33",
        CombatPower: "6,127",
      },
    ],
    [
      "/armories/characters/%EB%B6%80%EC%BA%90/profiles",
      {
        ServerName: "루페온",
        CharacterName: "부캐",
        CharacterClassName: "브레이커",
        ItemAvgLevel: "1,720.00",
        CombatPower: "5,900",
      },
    ],
  ]);

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const path = new URL(url).pathname;
      if (!responses.has(path)) {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => responses.get(path) };
    }),
  );
}

describe("character sync", () => {
  beforeEach(() => {
    vi.stubEnv("LOSTARK_OPEN_API_JWT", "jwt-token");
    mockLostArkFetch();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("imports same-server siblings and marks the submitted character as main", async () => {
    const group = await createGroup({ name: "Sync Group" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "동기화",
    });

    const result = await syncLostArkCharactersForMember({
      memberId: member.id,
      mainCharacterName: "본캐",
      now: new Date("2026-06-05T12:00:00+09:00"),
    });
    const characters = await listCharactersForMember(member.id);

    expect(result).toEqual({
      importedCount: 2,
      updatedCount: 0,
      skippedOtherServerCount: 1,
      serverName: "루페온",
    });
    expect(characters.map((character) => character.name)).toEqual(["본캐", "부캐"]);
    expect(characters[0]).toMatchObject({
      className: "바드",
      serverName: "루페온",
      itemLevel: 1773.33,
      combatPower: 6127,
      isMain: true,
    });
    expect(characters[1].isMain).toBe(false);
  });

  it("updates existing local characters without creating duplicates", async () => {
    const group = await createGroup({ name: "Sync Existing" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "업데이트",
    });
    await createCharacter({
      memberId: member.id,
      name: "부캐",
      className: "낡은직업",
      serverName: "루페온",
      itemLevel: 1600,
      combatPower: 1000,
      isMain: true,
      preferredRole: "DPS",
      notes: "보존",
    });

    const result = await syncLostArkCharactersForMember({
      memberId: member.id,
      mainCharacterName: "본캐",
      now: new Date("2026-06-05T12:00:00+09:00"),
    });
    const characters = await listCharactersForMember(member.id);

    expect(result.updatedCount).toBe(1);
    expect(characters).toHaveLength(2);
    expect(characters.find((character) => character.name === "부캐")).toMatchObject({
      className: "브레이커",
      itemLevel: 1720,
      combatPower: 5900,
      isMain: false,
      notes: "보존",
    });
  });

  it("does not modify local data when the official API fails", async () => {
    const group = await createGroup({ name: "Sync Failure" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "실패",
    });
    await createCharacter({
      memberId: member.id,
      name: "기존",
      className: "바드",
      itemLevel: 1700,
      preferredRole: "SUPPORT",
      notes: "",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }),
    );

    await expect(
      syncLostArkCharactersForMember({
        memberId: member.id,
        mainCharacterName: "본캐",
      }),
    ).rejects.toThrow("로스트아크 OpenAPI 호출 제한에 도달했습니다");

    await expect(db.character.count({ where: { memberId: member.id } })).resolves.toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test tests/server/character-sync.test.ts
```

Expected: FAIL with module resolution error for `@/server/character-sync`.

- [ ] **Step 3: Implement the sync service**

Create `src/server/character-sync.ts`:

```ts
import { db } from "@/server/db";
import {
  fetchLostArkCharacterProfile,
  fetchLostArkSiblingCharacters,
  type LostArkCharacterProfile,
} from "@/server/lostark-api";

function sameCharacter(a: string, b: string) {
  return a.trim().toLocaleLowerCase("ko-KR") === b.trim().toLocaleLowerCase("ko-KR");
}

function inferPreferredRole(className: string) {
  return ["바드", "홀리나이트", "도화가", "발키리"].includes(className)
    ? "SUPPORT"
    : "DPS";
}

export async function syncLostArkCharactersForMember(input: {
  memberId: string;
  mainCharacterName: string;
  now?: Date;
}) {
  const mainCharacterName = input.mainCharacterName.trim();
  if (!mainCharacterName) {
    throw new Error("본캐 캐릭터명을 입력해 주세요");
  }

  const siblings = await fetchLostArkSiblingCharacters(mainCharacterName);
  const mainSibling = siblings.find((sibling) =>
    sameCharacter(sibling.characterName, mainCharacterName),
  );
  if (!mainSibling) {
    throw new Error("입력한 본캐를 같은 계정 캐릭터 목록에서 찾지 못했습니다");
  }

  const sameServerSiblings = siblings.filter(
    (sibling) => sibling.serverName === mainSibling.serverName,
  );
  const profiles = await Promise.all(
    sameServerSiblings.map((sibling) =>
      fetchLostArkCharacterProfile(sibling.characterName),
    ),
  );
  const now = input.now ?? new Date();

  return db.$transaction(async (tx) => {
    await tx.character.updateMany({
      where: { memberId: input.memberId },
      data: { isMain: false },
    });

    let importedCount = 0;
    let updatedCount = 0;

    for (const profile of profiles) {
      const existing = await tx.character.findFirst({
        where: {
          memberId: input.memberId,
          name: profile.characterName,
          serverName: profile.serverName,
        },
      });
      const data = {
        name: profile.characterName,
        className: profile.className,
        serverName: profile.serverName,
        itemLevel: profile.itemLevel,
        combatPower: profile.combatPower,
        isMain: sameCharacter(profile.characterName, mainCharacterName),
        lastSyncedAt: now,
      };

      if (existing) {
        await tx.character.update({
          where: { id: existing.id },
          data,
        });
        updatedCount += 1;
      } else {
        await tx.character.create({
          data: {
            ...data,
            memberId: input.memberId,
            preferredRole: inferPreferredRole(profile.className),
            notes: "",
          },
        });
        importedCount += 1;
      }
    }

    return {
      importedCount,
      updatedCount,
      skippedOtherServerCount: siblings.length - sameServerSiblings.length,
      serverName: mainSibling.serverName,
    };
  });
}

export type SyncedLostArkCharacter = LostArkCharacterProfile;
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm test tests/server/character-sync.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/server/character-sync.test.ts src/server/character-sync.ts
git commit -m "feat: sync characters from lostark api"
```

---

### Task 5: Members UI For Sync And Character Metadata

**Files:**
- Create: `src/components/character-sync-form.tsx`
- Create: `tests/components/character-sync-form.test.tsx`
- Modify: `src/components/character-form.tsx`
- Modify: `tests/components/character-form.test.tsx`
- Modify: `src/app/members/page.tsx`

- [ ] **Step 1: Write failing sync form test**

Create `tests/components/character-sync-form.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CharacterSyncForm } from "@/components/character-sync-form";

describe("CharacterSyncForm", () => {
  it("renders a main character sync form", () => {
    render(<CharacterSyncForm action={vi.fn()} />);

    expect(screen.getByPlaceholderText("본캐 캐릭터명")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "본캐로 캐릭터 불러오기" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test tests/components/character-sync-form.test.tsx
```

Expected: FAIL with module resolution error for `@/components/character-sync-form`.

- [ ] **Step 3: Implement sync form**

Create `src/components/character-sync-form.tsx`:

```tsx
"use client";

import {
  inputClassName,
  primaryButtonClassName,
} from "@/components/ui";

export function CharacterSyncForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto]">
      <input
        className={inputClassName}
        name="mainCharacterName"
        placeholder="본캐 캐릭터명"
        required
      />
      <button className={primaryButtonClassName}>
        본캐로 캐릭터 불러오기
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Add manual metadata fields to the character form test**

Extend `tests/components/character-form.test.tsx`:

```tsx
    expect(screen.getByPlaceholderText("서버")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("전투력")).toBeInTheDocument();
```

- [ ] **Step 5: Run the character form test to verify it fails**

Run:

```bash
npm test tests/components/character-form.test.tsx
```

Expected: FAIL because the server and combat power inputs are missing.

- [ ] **Step 6: Update manual character form**

Add these inputs in `src/components/character-form.tsx` after `className`:

```tsx
      <input
        name="serverName"
        className={inputClassName}
        placeholder="서버"
      />
```

Add this input after `itemLevel`:

```tsx
      <input
        name="combatPower"
        min={0}
        type="number"
        className={inputClassName}
        placeholder="전투력"
      />
```

- [ ] **Step 7: Update Members page server actions and display**

Modify imports in `src/app/members/page.tsx`:

```tsx
import { CharacterSyncForm } from "@/components/character-sync-form";
import { formatCombatPower, formatItemLevel } from "@/lib/character-display";
import { syncLostArkCharactersForMember } from "@/server/character-sync";
```

In `addCharacter`, pass the new form fields:

```ts
      serverName: String(formData.get("serverName") ?? ""),
      combatPower:
        String(formData.get("combatPower") ?? "").trim() === ""
          ? null
          : Number(formData.get("combatPower")),
```

In `editCharacter`, preserve existing values unless edit UI is expanded in the same task:

```ts
      serverName: String(formData.get("serverName") ?? ""),
      combatPower:
        String(formData.get("combatPower") ?? "").trim() === ""
          ? null
          : Number(formData.get("combatPower")),
```

Add a server action:

```ts
  async function syncCharacters(formData: FormData) {
    "use server";
    const member = await requireCurrentMember();
    await syncLostArkCharactersForMember({
      memberId: member.id,
      mainCharacterName: String(formData.get("mainCharacterName") ?? ""),
    });
    revalidatePath("/members");
  }
```

Render the sync form above the manual form:

```tsx
      <SectionPanel className="mt-6 max-w-2xl" title="본캐로 캐릭터 불러오기">
        <CharacterSyncForm action={syncCharacters} />
      </SectionPanel>
```

Update character display line:

```tsx
                    <div className="text-sm font-medium text-zinc-950">
                      {character.isMain ? "본캐 · " : ""}
                      {character.name} / {character.className} /{" "}
                      {character.serverName || "서버 미입력"} /{" "}
                      {formatItemLevel(character.itemLevel)} /{" "}
                      {formatCombatPower(character.combatPower)}
                    </div>
```

Add editable metadata inputs inside the edit form:

```tsx
                          <input
                            className={inputClassName}
                            defaultValue={character.serverName}
                            name="serverName"
                            placeholder="서버"
                          />
                          <input
                            className={inputClassName}
                            defaultValue={character.combatPower ?? ""}
                            name="combatPower"
                            placeholder="전투력"
                            type="number"
                          />
```

Keep the existing delete form and notes field.

- [ ] **Step 8: Run focused component tests**

Run:

```bash
npm test tests/components/character-sync-form.test.tsx tests/components/character-form.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/character-sync-form.tsx tests/components/character-sync-form.test.tsx src/components/character-form.tsx tests/components/character-form.test.tsx src/app/members/page.tsx
git commit -m "feat: add character sync UI"
```

---

### Task 6: Signup Display Name Copy

**Files:**
- Modify: `src/app/auth/signup/signup-form.tsx`
- Create: `tests/app/signup-form.test.tsx`

- [ ] **Step 1: Write failing signup copy test**

Create `tests/app/signup-form.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/app/auth/signup/signup-form";

vi.mock("@/app/auth/actions", () => ({
  signupAction: vi.fn(async () => ({ error: "" })),
}));

describe("SignupForm", () => {
  it("labels display name as raid-group identity", () => {
    render(<SignupForm nextPath="" />);

    expect(screen.getByLabelText("공대 확인용 이름")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("공대 확인용 이름")).toBeInTheDocument();
    expect(screen.queryByLabelText("이름")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test tests/app/signup-form.test.tsx
```

Expected: FAIL because the form still says "이름".

- [ ] **Step 3: Update signup form copy**

In `src/app/auth/signup/signup-form.tsx`, change the display name label and placeholder:

```tsx
      <label className="grid gap-1 text-sm font-medium">
        공대 확인용 이름
        <input
          autoComplete="name"
          className={inputClassName}
          minLength={2}
          name="displayName"
          placeholder="공대 확인용 이름"
          required
        />
      </label>
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm test tests/app/signup-form.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/auth/signup/signup-form.tsx tests/app/signup-form.test.tsx
git commit -m "chore: clarify signup display name copy"
```

---

### Task 7: Raid Preset Corrections And Legacy Default Updates

**Files:**
- Modify: `src/server/lostark-raid-presets.ts`
- Modify: `src/server/raid-templates.ts`
- Modify: `tests/server/raid-templates.test.ts`
- Modify: `src/app/templates/page.tsx`
- Modify: `tests/app/templates-page.test.tsx`

- [ ] **Step 1: Write failing preset coverage test**

In `tests/server/raid-templates.test.ts`, extend the default import test expectations:

```ts
    expect(templateKeys).toEqual(
      expect.arrayContaining([
        "지평의 성당 1단계 1-2",
        "지평의 성당 2단계 1-2",
        "지평의 성당 3단계 1-2",
        "그림자 레이드: 고통의 마녀 세르카 나이트메어 1-2",
        "카제로스 서막: 붉어진 백야의 나선 하드 1-2",
        "카제로스 1막: 대지를 부수는 업화의 궤적 하드 1-2",
        "카제로스 2막: 부유하는 악몽의 진혼곡 하드 1-2",
        "카제로스 2막: 아브렐슈드 익스트림 나이트메어 1",
        "카제로스 3막: 칠흑, 폭풍의 밤 하드 1-3",
        "카제로스 4막: 파멸의 성채 하드 1-2",
        "카제로스 종막: 최후의 날 하드 1-2",
        "베히모스 노말 1-2",
        "카멘 하드 1-4",
        "상아탑 하드 1-3",
        "카양겔 하드 1-3",
      ]),
    );
```

Add a legacy update test:

```ts
  it("updates exact legacy default templates instead of creating duplicates", async () => {
    const group = await createGroup({ name: "레거시 공대" });
    const leader = await db.member.create({
      data: {
        groupId: group.id,
        nickname: "리더",
        role: "LEADER",
      },
    });
    await createRaidTemplate({
      groupId: group.id,
      name: "카제로스 3막: 모르둠",
      difficulty: "하드",
      gates: "1-3",
      requiredPlayers: 8,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "딜러 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });

    const result = await importDefaultRaidTemplatesForLeader({
      actorMemberId: leader.id,
      groupId: group.id,
    });
    const matchingTemplates = (await listRaidTemplates(group.id)).filter(
      (template) =>
        template.name === "카제로스 3막: 칠흑, 폭풍의 밤" &&
        template.difficulty === "하드" &&
        template.gates === "1-3",
    );

    expect(result.updatedCount).toBeGreaterThanOrEqual(1);
    expect(matchingTemplates).toHaveLength(1);
    expect(matchingTemplates[0].slots).toHaveLength(8);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test tests/server/raid-templates.test.ts
```

Expected: FAIL because 지평의 성당 and corrected 카제로스 names are missing, and `updatedCount` is not returned.

- [ ] **Step 3: Update preset type and preset data**

In `src/server/lostark-raid-presets.ts`, extend the type:

```ts
export type LostArkRaidPreset = {
  name: string;
  difficulty: string;
  gates: string;
  requiredPlayers: 4 | 8 | 16;
  supportSlots: 1 | 2 | 4;
  requirements: string;
  notes: string;
  legacyKeys?: Array<{
    name: string;
    difficulty: string;
    gates: string;
  }>;
};
```

Replace `LOSTARK_RAID_TEMPLATE_PRESETS` with this full corrected list:

```ts
export const LOSTARK_RAID_TEMPLATE_PRESETS: LostArkRaidPreset[] = [
  preset({ name: "지평의 성당", difficulty: "1단계", gates: "1-2", requiredPlayers: 4, supportSlots: 1 }),
  preset({ name: "지평의 성당", difficulty: "2단계", gates: "1-2", requiredPlayers: 4, supportSlots: 1 }),
  preset({ name: "지평의 성당", difficulty: "3단계", gates: "1-2", requiredPlayers: 4, supportSlots: 1 }),
  preset({ name: "그림자 레이드: 고통의 마녀 세르카", difficulty: "노말", gates: "1-2", requiredPlayers: 4, supportSlots: 1 }),
  preset({ name: "그림자 레이드: 고통의 마녀 세르카", difficulty: "하드", gates: "1-2", requiredPlayers: 4, supportSlots: 1 }),
  preset({ name: "그림자 레이드: 고통의 마녀 세르카", difficulty: "나이트메어", gates: "1-2", requiredPlayers: 4, supportSlots: 1 }),
  preset({ name: "카제로스 서막: 붉어진 백야의 나선", difficulty: "노말", gates: "1-2", requiredPlayers: 8, supportSlots: 2, legacyKeys: [{ name: "에키드나", difficulty: "노말", gates: "1-2" }] }),
  preset({ name: "카제로스 서막: 붉어진 백야의 나선", difficulty: "하드", gates: "1-2", requiredPlayers: 8, supportSlots: 2, legacyKeys: [{ name: "에키드나", difficulty: "하드", gates: "1-2" }] }),
  preset({ name: "카제로스 1막: 대지를 부수는 업화의 궤적", difficulty: "노말", gates: "1-2", requiredPlayers: 8, supportSlots: 2, legacyKeys: [{ name: "카제로스 1막: 에기르", difficulty: "노말", gates: "1-2" }] }),
  preset({ name: "카제로스 1막: 대지를 부수는 업화의 궤적", difficulty: "하드", gates: "1-2", requiredPlayers: 8, supportSlots: 2, legacyKeys: [{ name: "카제로스 1막: 에기르", difficulty: "하드", gates: "1-2" }] }),
  preset({ name: "카제로스 2막: 부유하는 악몽의 진혼곡", difficulty: "노말", gates: "1-2", requiredPlayers: 8, supportSlots: 2, legacyKeys: [{ name: "카제로스 2막: 아브렐슈드", difficulty: "노말", gates: "1-2" }] }),
  preset({ name: "카제로스 2막: 부유하는 악몽의 진혼곡", difficulty: "하드", gates: "1-2", requiredPlayers: 8, supportSlots: 2, legacyKeys: [{ name: "카제로스 2막: 아브렐슈드", difficulty: "하드", gates: "1-2" }] }),
  preset({ name: "카제로스 2막: 아브렐슈드 익스트림", difficulty: "노말", gates: "1", requiredPlayers: 8, supportSlots: 2 }),
  preset({ name: "카제로스 2막: 아브렐슈드 익스트림", difficulty: "하드", gates: "1", requiredPlayers: 8, supportSlots: 2 }),
  preset({ name: "카제로스 2막: 아브렐슈드 익스트림", difficulty: "나이트메어", gates: "1", requiredPlayers: 8, supportSlots: 2 }),
  preset({ name: "카제로스 3막: 칠흑, 폭풍의 밤", difficulty: "노말", gates: "1-3", requiredPlayers: 8, supportSlots: 2, legacyKeys: [{ name: "카제로스 3막: 모르둠", difficulty: "노말", gates: "1-3" }] }),
  preset({ name: "카제로스 3막: 칠흑, 폭풍의 밤", difficulty: "하드", gates: "1-3", requiredPlayers: 8, supportSlots: 2, legacyKeys: [{ name: "카제로스 3막: 모르둠", difficulty: "하드", gates: "1-3" }] }),
  preset({ name: "카제로스 4막: 파멸의 성채", difficulty: "노말", gates: "1-2", requiredPlayers: 8, supportSlots: 2 }),
  preset({ name: "카제로스 4막: 파멸의 성채", difficulty: "하드", gates: "1-2", requiredPlayers: 8, supportSlots: 2 }),
  preset({ name: "카제로스 종막: 최후의 날", difficulty: "노말", gates: "1-2", requiredPlayers: 8, supportSlots: 2 }),
  preset({ name: "카제로스 종막: 최후의 날", difficulty: "하드", gates: "1-2", requiredPlayers: 8, supportSlots: 2 }),
  preset({ name: "베히모스", difficulty: "노말", gates: "1-2", requiredPlayers: 16, supportSlots: 4 }),
  preset({ name: "카멘", difficulty: "노말", gates: "1-3", requiredPlayers: 8, supportSlots: 2 }),
  preset({ name: "카멘", difficulty: "하드", gates: "1-4", requiredPlayers: 8, supportSlots: 2 }),
  preset({ name: "상아탑", difficulty: "노말", gates: "1-3", requiredPlayers: 4, supportSlots: 1 }),
  preset({ name: "상아탑", difficulty: "하드", gates: "1-3", requiredPlayers: 4, supportSlots: 1 }),
  preset({ name: "카양겔", difficulty: "노말", gates: "1-3", requiredPlayers: 4, supportSlots: 1 }),
  preset({ name: "카양겔", difficulty: "하드", gates: "1-3", requiredPlayers: 4, supportSlots: 1 }),
];
```

- [ ] **Step 4: Update import logic to update exact legacy defaults**

In `src/server/raid-templates.ts`, add:

```ts
async function replaceTemplateSlots(input: {
  templateId: string;
  preset: LostArkRaidPreset;
}) {
  await db.raidTemplateSlot.deleteMany({
    where: { templateId: input.templateId },
  });
  await db.raidTemplate.update({
    where: { id: input.templateId },
    data: {
      name: input.preset.name,
      difficulty: input.preset.difficulty,
      gates: input.preset.gates,
      requiredPlayers: input.preset.requiredPlayers,
      requirements: input.preset.requirements,
      notes: input.preset.notes,
      slots: {
        create: buildDefaultSlots(input.preset),
      },
    },
  });
}
```

Change `importDefaultRaidTemplatesForGroup` counters:

```ts
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
```

Fetch existing IDs:

```ts
    select: {
      id: true,
      name: true,
      difficulty: true,
      gates: true,
    },
```

For each preset, check exact key first, then `legacyKeys`:

```ts
    const legacyTemplate = existingTemplates.find((template) =>
      preset.legacyKeys?.some((legacyKey) => templateKey(template) === templateKey(legacyKey)),
    );
    if (legacyTemplate) {
      await replaceTemplateSlots({
        templateId: legacyTemplate.id,
        preset,
      });
      existingKeys.delete(templateKey(legacyTemplate));
      existingKeys.add(key);
      updatedCount += 1;
      continue;
    }
```

Return:

```ts
  return { createdCount, updatedCount, skippedCount };
```

- [ ] **Step 5: Update templates page copy**

In `src/app/templates/page.tsx`, change the default template description to:

```tsx
description="지평의 성당, 세르카, 카제로스 서막부터 종막, 베히모스, 카멘, 상아탑, 카양겔 기본 구성을 중복 없이 추가합니다."
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test tests/server/raid-templates.test.ts tests/app/templates-page.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/lostark-raid-presets.ts src/server/raid-templates.ts tests/server/raid-templates.test.ts src/app/templates/page.tsx tests/app/templates-page.test.tsx
git commit -m "feat: refresh lostark raid presets"
```

---

### Task 8: Final Verification

**Files:**
- Read/verify: `package.json`
- Verify all modified files from Tasks 1-7

- [ ] **Step 1: Run the full unit test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Inspect git status**

Run:

```bash
git status --short
```

Expected: only intentional files are modified or no files are pending after commits.

---

## Self-Review

- Spec coverage: Tasks cover internal display name copy, Lostark API token use, sibling/profile API calls, same-server sync, item level/combat power storage, main character flagging, character sorting, manual character preservation, corrected raid presets, and tests.
- Scope check: The plan does not add a public user lookup API. All official API calls remain server-side and member-session scoped.
- Type consistency: `itemLevel` is consistently a number backed by Prisma `Float`; `combatPower` is consistently `number | null` backed by nullable integer; `isMain` and `lastSyncedAt` are persisted on `Character`.
- Data safety: character sync fetches official API data before the transaction modifies local character rows, and it never deletes local characters.
- Template safety: legacy template updates target exact legacy default keys; unrelated custom templates remain untouched.
