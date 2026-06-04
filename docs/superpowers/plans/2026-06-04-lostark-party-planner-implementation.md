# Lost Ark Party Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP server-hosted fixed-raid-group planner from the approved design spec.

**Architecture:** Use one Next.js App Router web application backed by PostgreSQL through Prisma. Keep business rules in focused server-side service modules so web pages, API routes, and the notification worker share the same validation and data access behavior.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Vitest, Testing Library, Playwright, Discord OAuth/API, Docker Compose, Caddy.

---

## Scope

This plan builds the full MVP in deployable increments:

- Project scaffold and local database.
- Data model and domain services.
- Invite-link entry, member, and character management.
- Availability block grid.
- Raid templates, schedules, and slot assignment.
- Home dashboard warnings.
- Notification job model and Discord DM worker.
- Docker Compose deployment skeleton for VPS.

The plan intentionally excludes public recruitment, Redis, KakaoTalk/SMS, payments, and mobile push notifications.

## File Structure

Create this structure:

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    invite/[inviteCode]/page.tsx
    calendar/page.tsx
    members/page.tsx
    templates/page.tsx
    schedules/page.tsx
    schedules/[scheduleId]/page.tsx
    notifications/page.tsx
    api/discord/oauth/callback/route.ts
  components/
    app-shell.tsx
    status-pill.tsx
    availability-grid.tsx
    schedule-card.tsx
    slot-editor.tsx
    character-form.tsx
    template-form.tsx
  server/
    db.ts
    auth-context.ts
    groups.ts
    members.ts
    characters.ts
    availability.ts
    raid-templates.ts
    schedules.ts
    dashboard.ts
    notifications.ts
    discord.ts
  worker/
    notification-worker.ts
prisma/
  schema.prisma
  seed.ts
tests/
  server/
    groups.test.ts
    members.test.ts
    characters.test.ts
    availability.test.ts
    raid-templates.test.ts
    schedules.test.ts
    dashboard.test.ts
    notifications.test.ts
  components/
    availability-grid.test.tsx
  e2e/
    invite-and-schedule.spec.ts
docker/
  Caddyfile
  backup-postgres.sh
docker-compose.yml
Dockerfile
.env.example
```

Responsibilities:

- `src/server/*`: business rules and Prisma queries. These modules are the source of truth.
- `src/components/*`: focused UI components. They receive typed props and do not perform direct database access.
- `src/app/*`: routing, server actions, and page composition.
- `src/worker/*`: background notification loop using `NotificationJob`.
- `prisma/schema.prisma`: database schema.
- `tests/server/*`: service-level tests for rules and persistence.
- `tests/components/*`: interaction tests for client components.
- `tests/e2e/*`: one browser smoke path for the MVP.
- `docker/*`: VPS deployment support.

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git and scaffold the app**

Run:

```powershell
git init
npx create-next-app@latest . --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm
```

Expected:

```text
Initialized empty Git repository
Success! Created ...
```

- [ ] **Step 2: Protect local tool and brainstorming directories**

Modify `.gitignore` so it includes these entries:

```gitignore
node_modules/
.next/
.env
.env.local
.env.production
.headroom-python/
.superpowers/
```

- [ ] **Step 3: Install runtime and test dependencies**

Run:

```powershell
npm install @prisma/client zod date-fns nanoid discord.js
npm install -D prisma vitest @vitest/ui @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom playwright tsx
```

Expected:

```text
added ...
found 0 vulnerabilities
```

- [ ] **Step 4: Add test scripts to `package.json`**

Modify `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "worker:notifications": "tsx src/worker/notification-worker.ts"
  }
}
```

- [ ] **Step 5: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Add environment example**

Create `.env.example`:

```env
DATABASE_URL=postgresql://lostark:lostark@localhost:5432/lostark_party
APP_BASE_URL=http://localhost:3000
APP_DOMAIN=localhost
SESSION_COOKIE_NAME=lostark_party_member
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_REDIRECT_URI=http://localhost:3000/api/discord/oauth/callback
```

- [ ] **Step 7: Verify scaffold**

Run:

```powershell
npm run lint
npm test
```

Expected:

```text
No ESLint warnings or errors
No test files found, exiting with code 0
```

- [ ] **Step 8: Commit**

```powershell
git add package.json package-lock.json next.config.* tsconfig.json eslint.config.* postcss.config.* src tests public .gitignore .env.example vitest.config.ts
git commit -m "chore: scaffold lost ark party planner"
```

## Task 2: Database Schema And Prisma Client

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/server/db.ts`
- Create: `docker-compose.yml`
- Test: `tests/server/groups.test.ts`

- [ ] **Step 1: Write the failing group persistence test**

Create `tests/server/groups.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGroup, getGroupByInviteCode } from "@/server/groups";

describe("groups", () => {
  it("creates a group with an invite code", async () => {
    const group = await createGroup({ name: "Thursday Static" });

    expect(group.name).toBe("Thursday Static");
    expect(group.inviteCode).toHaveLength(12);
    expect(group.inviteEnabled).toBe(true);

    const found = await getGroupByInviteCode(group.inviteCode);
    expect(found?.id).toBe(group.id);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
npm test -- tests/server/groups.test.ts
```

Expected:

```text
FAIL tests/server/groups.test.ts
Cannot find module '@/server/groups'
```

- [ ] **Step 3: Define Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum MemberRole {
  LEADER
  MEMBER
}

enum AvailabilityStatus {
  AVAILABLE
  UNAVAILABLE
  TENTATIVE
}

enum SlotRole {
  DPS
  SUPPORT
  FLEX
  OTHER
}

enum ScheduleStatus {
  DRAFT
  OPEN
  CONFIRMED
  COMPLETED
  CANCELED
}

enum ConfirmationStatus {
  PENDING
  ACCEPTED
  DECLINED
  TENTATIVE
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
  CANCELED
}

model Group {
  id            String         @id @default(cuid())
  name          String
  inviteCode    String         @unique
  inviteEnabled Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  members       Member[]
  templates     RaidTemplate[]
  schedules     Schedule[]
  notifications NotificationJob[]
}

model Member {
  id                 String              @id @default(cuid())
  groupId            String
  group              Group               @relation(fields: [groupId], references: [id], onDelete: Cascade)
  nickname           String
  role               MemberRole          @default(MEMBER)
  discordUserId      String?
  discordConnectedAt DateTime?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  characters         Character[]
  availabilityBlocks AvailabilityBlock[]
  createdSchedules   Schedule[]          @relation("ScheduleCreator")
  assignedSlots      ScheduleSlot[]
  notifications      NotificationJob[]

  @@unique([groupId, nickname])
}

model Character {
  id            String         @id @default(cuid())
  memberId      String
  member        Member         @relation(fields: [memberId], references: [id], onDelete: Cascade)
  name          String
  className     String
  itemLevel     Int
  preferredRole SlotRole
  notes         String         @default("")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  scheduleSlots ScheduleSlot[]
}

model AvailabilityBlock {
  id        String             @id @default(cuid())
  memberId  String
  member    Member             @relation(fields: [memberId], references: [id], onDelete: Cascade)
  date      DateTime
  startsAt  DateTime
  endsAt    DateTime
  status    AvailabilityStatus
  memo      String?
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt

  @@index([memberId, date])
}

model RaidTemplate {
  id              String             @id @default(cuid())
  groupId          String
  group            Group              @relation(fields: [groupId], references: [id], onDelete: Cascade)
  name             String
  difficulty       String
  gates            String
  requiredPlayers  Int
  requirements     String             @default("")
  notes            String             @default("")
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  slots            RaidTemplateSlot[]
  schedules        Schedule[]
}

model RaidTemplateSlot {
  id              String         @id @default(cuid())
  templateId       String
  template         RaidTemplate   @relation(fields: [templateId], references: [id], onDelete: Cascade)
  label            String
  role             SlotRole
  required         Boolean        @default(true)
  classPreference  String?
  notes            String         @default("")
  scheduleSlots    ScheduleSlot[]
}

model Schedule {
  id                String          @id @default(cuid())
  groupId           String
  group             Group           @relation(fields: [groupId], references: [id], onDelete: Cascade)
  templateId         String
  template           RaidTemplate    @relation(fields: [templateId], references: [id])
  title             String
  startsAt          DateTime
  endsAt            DateTime?
  status            ScheduleStatus  @default(OPEN)
  notes             String          @default("")
  createdByMemberId String
  createdBy          Member          @relation("ScheduleCreator", fields: [createdByMemberId], references: [id])
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt
  slots              ScheduleSlot[]
  notifications      NotificationJob[]
}

model ScheduleSlot {
  id                 String              @id @default(cuid())
  scheduleId          String
  schedule            Schedule            @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  templateSlotId      String?
  templateSlot        RaidTemplateSlot?   @relation(fields: [templateSlotId], references: [id])
  label               String
  role                SlotRole
  assignedMemberId    String?
  assignedMember      Member?             @relation(fields: [assignedMemberId], references: [id])
  assignedCharacterId String?
  assignedCharacter   Character?          @relation(fields: [assignedCharacterId], references: [id])
  confirmationStatus  ConfirmationStatus  @default(PENDING)
  notes               String              @default("")
}

model NotificationJob {
  id            String             @id @default(cuid())
  groupId       String
  group         Group              @relation(fields: [groupId], references: [id], onDelete: Cascade)
  memberId      String
  member        Member             @relation(fields: [memberId], references: [id], onDelete: Cascade)
  scheduleId    String?
  schedule      Schedule?          @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  type          String
  message       String
  sendAfter     DateTime
  status        NotificationStatus @default(PENDING)
  failureReason String?
  attempts      Int                @default(0)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
}
```

- [ ] **Step 4: Create local PostgreSQL compose file**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: lostark
      POSTGRES_PASSWORD: lostark
      POSTGRES_DB: lostark_party
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 5: Create Prisma client helper**

Create `src/server/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 6: Create group service**

Create `src/server/groups.ts`:

```ts
import { nanoid } from "nanoid";
import { db } from "@/server/db";

export async function createGroup(input: { name: string }) {
  return db.group.create({
    data: {
      name: input.name.trim(),
      inviteCode: nanoid(12),
      inviteEnabled: true,
    },
  });
}

export async function getGroupByInviteCode(inviteCode: string) {
  return db.group.findUnique({
    where: { inviteCode },
  });
}
```

- [ ] **Step 7: Run migration and generate client**

Run:

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:migrate -- --name init
```

Expected:

```text
Generated Prisma Client
The following migration(s) have been created and applied
```

- [ ] **Step 8: Run test and verify it passes**

Run:

```powershell
npm test -- tests/server/groups.test.ts
```

Expected:

```text
PASS tests/server/groups.test.ts
```

- [ ] **Step 9: Commit**

```powershell
git add prisma src/server tests docker-compose.yml package.json package-lock.json
git commit -m "feat: add database schema and group service"
```

## Task 3: Members And Invite-Link Join

**Files:**
- Create: `src/server/members.ts`
- Create: `src/server/auth-context.ts`
- Create: `src/app/invite/[inviteCode]/page.tsx`
- Test: `tests/server/members.test.ts`

- [ ] **Step 1: Write failing invite join tests**

Create `tests/server/members.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite, listMembers } from "@/server/members";

describe("members", () => {
  it("joins a group through an enabled invite code", async () => {
    const group = await createGroup({ name: "Static" });

    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "RaidLead",
    });

    expect(member.groupId).toBe(group.id);
    expect(member.nickname).toBe("RaidLead");
    expect(member.role).toBe("MEMBER");
  });

  it("rejects duplicate nickname inside a group", async () => {
    const group = await createGroup({ name: "Static" });
    await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "Mokoko" });

    await expect(
      joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "Mokoko" }),
    ).rejects.toThrow("Nickname is already used in this group");
  });

  it("lists group members by creation order", async () => {
    const group = await createGroup({ name: "Static" });
    await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "Alpha" });
    await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "Beta" });

    const members = await listMembers(group.id);
    expect(members.map((member) => member.nickname)).toEqual(["Alpha", "Beta"]);
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
npm test -- tests/server/members.test.ts
```

Expected:

```text
FAIL tests/server/members.test.ts
Cannot find module '@/server/members'
```

- [ ] **Step 3: Implement member service**

Create `src/server/members.ts`:

```ts
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { getGroupByInviteCode } from "@/server/groups";

export async function joinGroupByInvite(input: {
  inviteCode: string;
  nickname: string;
}) {
  const nickname = input.nickname.trim();
  if (nickname.length < 2) {
    throw new Error("Nickname must be at least 2 characters");
  }

  const group = await getGroupByInviteCode(input.inviteCode);
  if (!group || !group.inviteEnabled) {
    throw new Error("Invite link is invalid or disabled");
  }

  try {
    return await db.member.create({
      data: {
        groupId: group.id,
        nickname,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("Nickname is already used in this group");
    }
    throw error;
  }
}

export async function listMembers(groupId: string) {
  return db.member.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    include: { characters: true },
  });
}
```

- [ ] **Step 4: Add simple auth-context helper**

Create `src/server/auth-context.ts`:

```ts
import { cookies } from "next/headers";
import { db } from "@/server/db";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "lostark_party_member";

export async function getCurrentMember() {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(COOKIE_NAME)?.value;
  if (!memberId) return null;

  return db.member.findUnique({
    where: { id: memberId },
    include: { group: true },
  });
}

export async function requireCurrentMember() {
  const member = await getCurrentMember();
  if (!member) {
    throw new Error("Member session is required");
  }
  return member;
}
```

- [ ] **Step 5: Add invite page**

Create `src/app/invite/[inviteCode]/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { joinGroupByInvite } from "@/server/members";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "lostark_party_member";

export default function InvitePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  async function join(formData: FormData) {
    "use server";
    const { inviteCode } = await params;
    const nickname = String(formData.get("nickname") ?? "");
    const member = await joinGroupByInvite({ inviteCode, nickname });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, member.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Join raid group</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter the nickname your group knows you by.
      </p>
      <form action={join} className="mt-6 space-y-3">
        <input
          name="nickname"
          minLength={2}
          required
          className="w-full rounded border border-zinc-300 px-3 py-2"
          placeholder="Nickname"
        />
        <button className="w-full rounded bg-zinc-950 px-4 py-2 text-white">
          Join
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm test -- tests/server/members.test.ts
```

Expected:

```text
PASS tests/server/members.test.ts
```

- [ ] **Step 7: Commit**

```powershell
git add src/server src/app/invite tests/server/members.test.ts
git commit -m "feat: add invite-link member join"
```

## Task 4: Character Management

**Files:**
- Create: `src/server/characters.ts`
- Create: `src/components/character-form.tsx`
- Modify: `src/app/members/page.tsx`
- Test: `tests/server/characters.test.ts`

- [ ] **Step 1: Write failing character tests**

Create `tests/server/characters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createCharacter, listCharactersForMember } from "@/server/characters";

describe("characters", () => {
  it("allows one member to register multiple characters", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "RosterUser",
    });

    await createCharacter({
      memberId: member.id,
      name: "BardMain",
      className: "Bard",
      itemLevel: 1640,
      preferredRole: "SUPPORT",
      notes: "Main support",
    });
    await createCharacter({
      memberId: member.id,
      name: "BreakerAlt",
      className: "Breaker",
      itemLevel: 1620,
      preferredRole: "DPS",
      notes: "Alt DPS",
    });

    const characters = await listCharactersForMember(member.id);
    expect(characters.map((character) => character.name)).toEqual([
      "BardMain",
      "BreakerAlt",
    ]);
  });

  it("rejects item level below 0", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "InvalidLevel",
    });

    await expect(
      createCharacter({
        memberId: member.id,
        name: "Bad",
        className: "Berserker",
        itemLevel: -1,
        preferredRole: "DPS",
        notes: "",
      }),
    ).rejects.toThrow("Item level must be positive");
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
npm test -- tests/server/characters.test.ts
```

Expected:

```text
FAIL tests/server/characters.test.ts
Cannot find module '@/server/characters'
```

- [ ] **Step 3: Implement character service**

Create `src/server/characters.ts`:

```ts
import { SlotRole } from "@prisma/client";
import { db } from "@/server/db";

export async function createCharacter(input: {
  memberId: string;
  name: string;
  className: string;
  itemLevel: number;
  preferredRole: keyof typeof SlotRole;
  notes: string;
}) {
  if (input.itemLevel <= 0) {
    throw new Error("Item level must be positive");
  }
  if (input.name.trim().length < 2) {
    throw new Error("Character name must be at least 2 characters");
  }

  return db.character.create({
    data: {
      memberId: input.memberId,
      name: input.name.trim(),
      className: input.className.trim(),
      itemLevel: input.itemLevel,
      preferredRole: input.preferredRole,
      notes: input.notes.trim(),
    },
  });
}

export async function listCharactersForMember(memberId: string) {
  return db.character.findMany({
    where: { memberId },
    orderBy: { createdAt: "asc" },
  });
}
```

- [ ] **Step 4: Add member page and form**

Create `src/components/character-form.tsx`:

```tsx
"use client";

export function CharacterForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="grid gap-3 rounded border border-zinc-200 p-4">
      <input name="name" required className="rounded border px-3 py-2" placeholder="Character name" />
      <input name="className" required className="rounded border px-3 py-2" placeholder="Class" />
      <input name="itemLevel" required type="number" className="rounded border px-3 py-2" placeholder="Item level" />
      <select name="preferredRole" className="rounded border px-3 py-2" defaultValue="DPS">
        <option value="DPS">DPS</option>
        <option value="SUPPORT">Support</option>
        <option value="FLEX">Flex</option>
        <option value="OTHER">Other</option>
      </select>
      <textarea name="notes" className="rounded border px-3 py-2" placeholder="Notes" />
      <button className="rounded bg-zinc-950 px-4 py-2 text-white">Add character</button>
    </form>
  );
}
```

Create `src/app/members/page.tsx`:

```tsx
import { revalidatePath } from "next/cache";
import { CharacterForm } from "@/components/character-form";
import { createCharacter } from "@/server/characters";
import { requireCurrentMember } from "@/server/auth-context";
import { listMembers } from "@/server/members";

export default async function MembersPage() {
  const currentMember = await requireCurrentMember();
  const members = await listMembers(currentMember.groupId);

  async function addCharacter(formData: FormData) {
    "use server";
    const member = await requireCurrentMember();
    await createCharacter({
      memberId: member.id,
      name: String(formData.get("name") ?? ""),
      className: String(formData.get("className") ?? ""),
      itemLevel: Number(formData.get("itemLevel") ?? 0),
      preferredRole: String(formData.get("preferredRole") ?? "DPS") as "DPS",
      notes: String(formData.get("notes") ?? ""),
    });
    revalidatePath("/members");
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Members</h1>
      <section className="mt-6">
        <h2 className="text-lg font-medium">My characters</h2>
        <div className="mt-3 max-w-md">
          <CharacterForm action={addCharacter} />
        </div>
      </section>
      <section className="mt-8 grid gap-3">
        {members.map((member) => (
          <div key={member.id} className="rounded border border-zinc-200 p-4">
            <div className="font-medium">{member.nickname}</div>
            <div className="mt-2 text-sm text-zinc-600">
              {member.characters.map((character) => character.name).join(", ") || "No characters"}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm test -- tests/server/characters.test.ts
```

Expected:

```text
PASS tests/server/characters.test.ts
```

- [ ] **Step 6: Commit**

```powershell
git add src/server/characters.ts src/components/character-form.tsx src/app/members tests/server/characters.test.ts
git commit -m "feat: add member character management"
```

## Task 5: Availability Blocks And Grid Component

**Files:**
- Create: `src/server/availability.ts`
- Create: `src/components/availability-grid.tsx`
- Create: `src/app/calendar/page.tsx`
- Test: `tests/server/availability.test.ts`
- Test: `tests/components/availability-grid.test.tsx`

- [ ] **Step 1: Write failing availability service tests**

Create `tests/server/availability.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { saveAvailabilityBlock } from "@/server/availability";

describe("availability", () => {
  it("saves an availability block for a member", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "CalendarUser",
    });

    const block = await saveAvailabilityBlock({
      memberId: member.id,
      date: "2026-06-04",
      startsAt: "2026-06-04T20:00:00+09:00",
      endsAt: "2026-06-04T22:00:00+09:00",
      status: "AVAILABLE",
      memo: "After dinner",
    });

    expect(block.status).toBe("AVAILABLE");
  });

  it("rejects a block whose end is before start", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "BadTime",
    });

    await expect(
      saveAvailabilityBlock({
        memberId: member.id,
        date: "2026-06-04",
        startsAt: "2026-06-04T22:00:00+09:00",
        endsAt: "2026-06-04T20:00:00+09:00",
        status: "AVAILABLE",
        memo: "",
      }),
    ).rejects.toThrow("Availability end must be after start");
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
npm test -- tests/server/availability.test.ts
```

Expected:

```text
FAIL tests/server/availability.test.ts
Cannot find module '@/server/availability'
```

- [ ] **Step 3: Implement availability service**

Create `src/server/availability.ts`:

```ts
import { AvailabilityStatus } from "@prisma/client";
import { db } from "@/server/db";

export async function saveAvailabilityBlock(input: {
  memberId: string;
  date: string;
  startsAt: string;
  endsAt: string;
  status: keyof typeof AvailabilityStatus;
  memo: string;
}) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Availability time is invalid");
  }
  if (endsAt <= startsAt) {
    throw new Error("Availability end must be after start");
  }

  const overlapping = await db.availabilityBlock.findFirst({
    where: {
      memberId: input.memberId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  if (overlapping && overlapping.status !== input.status) {
    throw new Error("Availability block conflicts with an existing block");
  }

  return db.availabilityBlock.create({
    data: {
      memberId: input.memberId,
      date: new Date(`${input.date}T00:00:00+09:00`),
      startsAt,
      endsAt,
      status: input.status,
      memo: input.memo.trim() || null,
    },
  });
}

export async function listAvailabilityForGroup(groupId: string, from: Date, to: Date) {
  return db.availabilityBlock.findMany({
    where: {
      member: { groupId },
      startsAt: { gte: from },
      endsAt: { lte: to },
    },
    include: { member: true },
    orderBy: [{ startsAt: "asc" }, { member: { nickname: "asc" } }],
  });
}
```

- [ ] **Step 4: Write failing grid interaction test**

Create `tests/components/availability-grid.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AvailabilityGrid } from "@/components/availability-grid";

describe("AvailabilityGrid", () => {
  it("selects a time cell with the current status", async () => {
    const onChange = vi.fn();
    render(<AvailabilityGrid date="2026-06-04" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Available" }));
    await userEvent.click(screen.getByRole("button", { name: "20:00" }));

    expect(onChange).toHaveBeenCalledWith({
      date: "2026-06-04",
      hour: 20,
      status: "AVAILABLE",
    });
  });
});
```

- [ ] **Step 5: Implement availability grid component**

Create `src/components/availability-grid.tsx`:

```tsx
"use client";

import { useState } from "react";

type Status = "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE";

const hours = Array.from({ length: 10 }, (_, index) => index + 16);
const labels: Record<Status, string> = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  TENTATIVE: "Tentative",
};

export function AvailabilityGrid({
  date,
  onChange,
}: {
  date: string;
  onChange: (change: { date: string; hour: number; status: Status }) => void;
}) {
  const [status, setStatus] = useState<Status>("AVAILABLE");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(Object.keys(labels) as Status[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            className="rounded border border-zinc-300 px-3 py-1 text-sm"
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {hours.map((hour) => (
          <button
            key={hour}
            type="button"
            onClick={() => onChange({ date, hour, status })}
            className="rounded border border-zinc-200 px-3 py-4 text-left text-sm hover:bg-zinc-50"
          >
            {hour}:00
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add calendar page with server action**

Create `src/app/calendar/page.tsx`:

```tsx
import { revalidatePath } from "next/cache";
import { AvailabilityGrid } from "@/components/availability-grid";
import { saveAvailabilityBlock } from "@/server/availability";
import { requireCurrentMember } from "@/server/auth-context";

function toKstIso(date: string, hour: number) {
  return `${date}T${String(hour).padStart(2, "0")}:00:00+09:00`;
}

export default async function CalendarPage() {
  await requireCurrentMember();

  async function saveCell(change: { date: string; hour: number; status: "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE" }) {
    "use server";
    const member = await requireCurrentMember();
    await saveAvailabilityBlock({
      memberId: member.id,
      date: change.date,
      startsAt: toKstIso(change.date, change.hour),
      endsAt: toKstIso(change.date, change.hour + 1),
      status: change.status,
      memo: "",
    });
    revalidatePath("/calendar");
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <p className="mt-2 text-sm text-zinc-600">Mark your availability for today.</p>
      <div className="mt-6">
        <AvailabilityGrid date="2026-06-04" onChange={saveCell} />
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Run tests**

Run:

```powershell
npm test -- tests/server/availability.test.ts tests/components/availability-grid.test.tsx
```

Expected:

```text
PASS tests/server/availability.test.ts
PASS tests/components/availability-grid.test.tsx
```

- [ ] **Step 8: Commit**

```powershell
git add src/server/availability.ts src/components/availability-grid.tsx src/app/calendar tests/server/availability.test.ts tests/components/availability-grid.test.tsx
git commit -m "feat: add availability blocks and grid"
```

## Task 6: Raid Templates

**Files:**
- Create: `src/server/raid-templates.ts`
- Create: `src/components/template-form.tsx`
- Create: `src/app/templates/page.tsx`
- Test: `tests/server/raid-templates.test.ts`

- [ ] **Step 1: Write failing raid template tests**

Create `tests/server/raid-templates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGroup } from "@/server/groups";
import { createRaidTemplate } from "@/server/raid-templates";

describe("raid templates", () => {
  it("creates a template with role slots and requirements", async () => {
    const group = await createGroup({ name: "Static" });

    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Thaemine Hard",
      difficulty: "Hard",
      gates: "1-3",
      requiredPlayers: 8,
      requirements: "Clear experience, gems checked",
      notes: "Bring dark grenades",
      slots: [
        { label: "DPS 1", role: "DPS", required: true, classPreference: "", notes: "" },
        { label: "Support 1", role: "SUPPORT", required: true, classPreference: "Bard/Artist/Paladin", notes: "" },
      ],
    });

    expect(template.slots).toHaveLength(2);
    expect(template.requirements).toContain("Clear experience");
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
npm test -- tests/server/raid-templates.test.ts
```

Expected:

```text
FAIL tests/server/raid-templates.test.ts
Cannot find module '@/server/raid-templates'
```

- [ ] **Step 3: Implement raid template service**

Create `src/server/raid-templates.ts`:

```ts
import { SlotRole } from "@prisma/client";
import { db } from "@/server/db";

export async function createRaidTemplate(input: {
  groupId: string;
  name: string;
  difficulty: string;
  gates: string;
  requiredPlayers: number;
  requirements: string;
  notes: string;
  slots: Array<{
    label: string;
    role: keyof typeof SlotRole;
    required: boolean;
    classPreference: string;
    notes: string;
  }>;
}) {
  if (input.requiredPlayers < 1) {
    throw new Error("Template must require at least one player");
  }
  if (input.slots.length === 0) {
    throw new Error("Template must include at least one slot");
  }

  return db.raidTemplate.create({
    data: {
      groupId: input.groupId,
      name: input.name.trim(),
      difficulty: input.difficulty.trim(),
      gates: input.gates.trim(),
      requiredPlayers: input.requiredPlayers,
      requirements: input.requirements.trim(),
      notes: input.notes.trim(),
      slots: {
        create: input.slots.map((slot) => ({
          label: slot.label.trim(),
          role: slot.role,
          required: slot.required,
          classPreference: slot.classPreference.trim() || null,
          notes: slot.notes.trim(),
        })),
      },
    },
    include: { slots: true },
  });
}

export async function listRaidTemplates(groupId: string) {
  return db.raidTemplate.findMany({
    where: { groupId },
    include: { slots: true },
    orderBy: { createdAt: "desc" },
  });
}
```

- [ ] **Step 4: Add templates page**

Create `src/app/templates/page.tsx`:

```tsx
import { createRaidTemplate, listRaidTemplates } from "@/server/raid-templates";
import { requireCurrentMember } from "@/server/auth-context";

export default async function TemplatesPage() {
  const member = await requireCurrentMember();
  const templates = await listRaidTemplates(member.groupId);

  async function createDefaultTemplate() {
    "use server";
    const current = await requireCurrentMember();
    await createRaidTemplate({
      groupId: current.groupId,
      name: "Thaemine Hard",
      difficulty: "Hard",
      gates: "1-3",
      requiredPlayers: 8,
      requirements: "Clear experience required",
      notes: "Check consumables before start",
      slots: [
        { label: "DPS 1", role: "DPS", required: true, classPreference: "", notes: "" },
        { label: "DPS 2", role: "DPS", required: true, classPreference: "", notes: "" },
        { label: "DPS 3", role: "DPS", required: true, classPreference: "", notes: "" },
        { label: "Support 1", role: "SUPPORT", required: true, classPreference: "", notes: "" },
      ],
    });
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Raid templates</h1>
      <form action={createDefaultTemplate} className="mt-4">
        <button className="rounded bg-zinc-950 px-4 py-2 text-white">
          Add Thaemine starter template
        </button>
      </form>
      <section className="mt-6 grid gap-3">
        {templates.map((template) => (
          <div key={template.id} className="rounded border border-zinc-200 p-4">
            <div className="font-medium">{template.name} {template.gates}</div>
            <div className="text-sm text-zinc-600">{template.slots.length} slots</div>
          </div>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm test -- tests/server/raid-templates.test.ts
```

Expected:

```text
PASS tests/server/raid-templates.test.ts
```

- [ ] **Step 6: Commit**

```powershell
git add src/server/raid-templates.ts src/app/templates tests/server/raid-templates.test.ts
git commit -m "feat: add raid templates"
```

## Task 7: Schedules And Slot Assignment

**Files:**
- Create: `src/server/schedules.ts`
- Create: `src/components/schedule-card.tsx`
- Create: `src/components/slot-editor.tsx`
- Create: `src/app/schedules/page.tsx`
- Create: `src/app/schedules/[scheduleId]/page.tsx`
- Test: `tests/server/schedules.test.ts`

- [ ] **Step 1: Write failing schedule tests**

Create `tests/server/schedules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createCharacter } from "@/server/characters";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import { assignScheduleSlot, createScheduleFromTemplate } from "@/server/schedules";

describe("schedules", () => {
  it("creates schedule slots from a raid template", async () => {
    const group = await createGroup({ name: "Static" });
    const leader = await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "Lead" });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Behemoth",
      difficulty: "Normal",
      gates: "1",
      requiredPlayers: 8,
      requirements: "",
      notes: "",
      slots: [{ label: "DPS 1", role: "DPS", required: true, classPreference: "", notes: "" }],
    });

    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "Behemoth Friday",
      startsAt: "2026-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    expect(schedule.slots).toHaveLength(1);
    expect(schedule.slots[0].label).toBe("DPS 1");
  });

  it("rejects assigning a character owned by another member", async () => {
    const group = await createGroup({ name: "Static" });
    const leader = await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "Lead" });
    const memberA = await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "A" });
    const memberB = await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "B" });
    const character = await createCharacter({
      memberId: memberA.id,
      name: "AChar",
      className: "Bard",
      itemLevel: 1640,
      preferredRole: "SUPPORT",
      notes: "",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Raid",
      difficulty: "Hard",
      gates: "1",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [{ label: "Support 1", role: "SUPPORT", required: true, classPreference: "", notes: "" }],
    });
    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "Raid",
      startsAt: "2026-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    await expect(
      assignScheduleSlot({
        slotId: schedule.slots[0].id,
        memberId: memberB.id,
        characterId: character.id,
      }),
    ).rejects.toThrow("Character does not belong to selected member");
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
npm test -- tests/server/schedules.test.ts
```

Expected:

```text
FAIL tests/server/schedules.test.ts
Cannot find module '@/server/schedules'
```

- [ ] **Step 3: Implement schedules service**

Create `src/server/schedules.ts`:

```ts
import { db } from "@/server/db";

export async function createScheduleFromTemplate(input: {
  groupId: string;
  templateId: string;
  title: string;
  startsAt: string;
  createdByMemberId: string;
}) {
  const template = await db.raidTemplate.findUnique({
    where: { id: input.templateId },
    include: { slots: true },
  });
  if (!template || template.groupId !== input.groupId) {
    throw new Error("Raid template not found in group");
  }

  return db.schedule.create({
    data: {
      groupId: input.groupId,
      templateId: input.templateId,
      title: input.title.trim(),
      startsAt: new Date(input.startsAt),
      createdByMemberId: input.createdByMemberId,
      slots: {
        create: template.slots.map((slot) => ({
          templateSlotId: slot.id,
          label: slot.label,
          role: slot.role,
          notes: slot.notes,
        })),
      },
    },
    include: { slots: true, template: true },
  });
}

export async function assignScheduleSlot(input: {
  slotId: string;
  memberId: string;
  characterId: string;
}) {
  const character = await db.character.findUnique({
    where: { id: input.characterId },
  });
  if (!character || character.memberId !== input.memberId) {
    throw new Error("Character does not belong to selected member");
  }

  const slot = await db.scheduleSlot.findUnique({
    where: { id: input.slotId },
  });
  if (!slot) {
    throw new Error("Schedule slot not found");
  }

  const duplicate = await db.scheduleSlot.findFirst({
    where: {
      scheduleId: slot.scheduleId,
      assignedCharacterId: input.characterId,
      NOT: { id: input.slotId },
    },
  });
  if (duplicate) {
    throw new Error("Character is already assigned to this schedule");
  }

  return db.scheduleSlot.update({
    where: { id: input.slotId },
    data: {
      assignedMemberId: input.memberId,
      assignedCharacterId: input.characterId,
      confirmationStatus: "ACCEPTED",
    },
  });
}

export async function listUpcomingSchedules(groupId: string, now = new Date()) {
  return db.schedule.findMany({
    where: {
      groupId,
      startsAt: { gte: now },
      status: { not: "CANCELED" },
    },
    include: { template: true, slots: { include: { assignedMember: true, assignedCharacter: true } } },
    orderBy: { startsAt: "asc" },
  });
}
```

- [ ] **Step 4: Add schedule pages**

Create `src/app/schedules/page.tsx`:

```tsx
import { listRaidTemplates } from "@/server/raid-templates";
import { createScheduleFromTemplate, listUpcomingSchedules } from "@/server/schedules";
import { requireCurrentMember } from "@/server/auth-context";

export default async function SchedulesPage() {
  const member = await requireCurrentMember();
  const schedules = await listUpcomingSchedules(member.groupId);
  const templates = await listRaidTemplates(member.groupId);

  async function createSchedule(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await createScheduleFromTemplate({
      groupId: current.groupId,
      templateId: String(formData.get("templateId")),
      title: String(formData.get("title")),
      startsAt: String(formData.get("startsAt")),
      createdByMemberId: current.id,
    });
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Schedules</h1>
      <form action={createSchedule} className="mt-4 grid gap-3 rounded border border-zinc-200 p-4">
        <input name="title" required className="rounded border px-3 py-2" placeholder="Schedule title" />
        <input name="startsAt" required className="rounded border px-3 py-2" placeholder="2026-06-05T21:00:00+09:00" />
        <select name="templateId" className="rounded border px-3 py-2">
          {templates.map((template) => (
            <option key={template.id} value={template.id}>{template.name} {template.gates}</option>
          ))}
        </select>
        <button className="rounded bg-zinc-950 px-4 py-2 text-white">Create schedule</button>
      </form>
      <section className="mt-6 grid gap-3">
        {schedules.map((schedule) => (
          <a key={schedule.id} href={`/schedules/${schedule.id}`} className="rounded border border-zinc-200 p-4">
            <div className="font-medium">{schedule.title}</div>
            <div className="text-sm text-zinc-600">{schedule.startsAt.toLocaleString("ko-KR")}</div>
          </a>
        ))}
      </section>
    </main>
  );
}
```

Create `src/app/schedules/[scheduleId]/page.tsx`:

```tsx
import { db } from "@/server/db";
import { requireCurrentMember } from "@/server/auth-context";

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  await requireCurrentMember();
  const { scheduleId } = await params;
  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: { slots: { include: { assignedMember: true, assignedCharacter: true } }, template: true },
  });

  if (!schedule) {
    return <main className="p-6">Schedule not found</main>;
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">{schedule.title}</h1>
      <section className="mt-6 grid gap-3">
        {schedule.slots.map((slot) => (
          <div key={slot.id} className="rounded border border-zinc-200 p-4">
            <div className="font-medium">{slot.label}</div>
            <div className="text-sm text-zinc-600">
              {slot.assignedMember?.nickname ?? "Open"} / {slot.assignedCharacter?.name ?? "No character"}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm test -- tests/server/schedules.test.ts
```

Expected:

```text
PASS tests/server/schedules.test.ts
```

- [ ] **Step 6: Commit**

```powershell
git add src/server/schedules.ts src/app/schedules tests/server/schedules.test.ts
git commit -m "feat: add schedules and slot assignment rules"
```

## Task 8: Home Dashboard Summary

**Files:**
- Create: `src/server/dashboard.ts`
- Create: `src/components/status-pill.tsx`
- Create: `src/components/schedule-card.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/server/dashboard.test.ts`

- [ ] **Step 1: Write failing dashboard test**

Create `tests/server/dashboard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { getDashboardSummary } from "@/server/dashboard";

describe("dashboard", () => {
  it("reports missing availability and upcoming schedule counts", async () => {
    const group = await createGroup({ name: "Static" });
    await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "One" });
    await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "Two" });

    const summary = await getDashboardSummary(group.id, new Date("2026-06-04T12:00:00+09:00"));

    expect(summary.memberCount).toBe(2);
    expect(summary.missingAvailabilityCount).toBe(2);
    expect(summary.upcomingSchedules).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
npm test -- tests/server/dashboard.test.ts
```

Expected:

```text
FAIL tests/server/dashboard.test.ts
Cannot find module '@/server/dashboard'
```

- [ ] **Step 3: Implement dashboard summary**

Create `src/server/dashboard.ts`:

```ts
import { db } from "@/server/db";
import { listUpcomingSchedules } from "@/server/schedules";

export async function getDashboardSummary(groupId: string, now = new Date()) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [members, membersWithAvailability, upcomingSchedules, failedNotifications] =
    await Promise.all([
      db.member.findMany({ where: { groupId } }),
      db.member.findMany({
        where: {
          groupId,
          availabilityBlocks: {
            some: {
              startsAt: { gte: todayStart },
              endsAt: { lte: todayEnd },
            },
          },
        },
      }),
      listUpcomingSchedules(groupId, now),
      db.notificationJob.count({ where: { groupId, status: "FAILED" } }),
    ]);

  return {
    memberCount: members.length,
    missingAvailabilityCount: members.length - membersWithAvailability.length,
    upcomingSchedules,
    failedNotifications,
  };
}
```

- [ ] **Step 4: Implement home page**

Create `src/components/status-pill.tsx`:

```tsx
export function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
      {label}
    </span>
  );
}
```

Create `src/components/schedule-card.tsx`:

```tsx
import { StatusPill } from "@/components/status-pill";

export function ScheduleCard({
  title,
  startsAt,
  openSlots,
}: {
  title: string;
  startsAt: Date;
  openSlots: number;
}) {
  return (
    <article className="rounded border border-zinc-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{title}</h2>
        <StatusPill label={`${openSlots} open slots`} />
      </div>
      <p className="mt-2 text-sm text-zinc-600">{startsAt.toLocaleString("ko-KR")}</p>
    </article>
  );
}
```

Modify `src/app/page.tsx`:

```tsx
import { ScheduleCard } from "@/components/schedule-card";
import { requireCurrentMember } from "@/server/auth-context";
import { getDashboardSummary } from "@/server/dashboard";

export default async function HomePage() {
  const member = await requireCurrentMember();
  const summary = await getDashboardSummary(member.groupId);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Upcoming raids</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-zinc-200 p-4">
          <div className="text-sm text-zinc-500">Members</div>
          <div className="mt-1 text-2xl font-semibold">{summary.memberCount}</div>
        </div>
        <div className="rounded border border-zinc-200 p-4">
          <div className="text-sm text-zinc-500">Missing availability</div>
          <div className="mt-1 text-2xl font-semibold">{summary.missingAvailabilityCount}</div>
        </div>
        <div className="rounded border border-zinc-200 p-4">
          <div className="text-sm text-zinc-500">Failed notifications</div>
          <div className="mt-1 text-2xl font-semibold">{summary.failedNotifications}</div>
        </div>
      </div>
      <section className="mt-6 grid gap-3">
        {summary.upcomingSchedules.map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            title={schedule.title}
            startsAt={schedule.startsAt}
            openSlots={schedule.slots.filter((slot) => !slot.assignedMemberId).length}
          />
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm test -- tests/server/dashboard.test.ts
```

Expected:

```text
PASS tests/server/dashboard.test.ts
```

- [ ] **Step 6: Commit**

```powershell
git add src/server/dashboard.ts src/components/status-pill.tsx src/components/schedule-card.tsx src/app/page.tsx tests/server/dashboard.test.ts
git commit -m "feat: add upcoming schedule dashboard"
```

## Task 9: Discord Account Linking

**Files:**
- Modify: `src/server/members.ts`
- Create: `src/server/discord-oauth.ts`
- Create: `src/app/api/discord/oauth/callback/route.ts`
- Test: `tests/server/members.test.ts`

- [ ] **Step 1: Add failing Discord linking test**

Modify the existing members import in `tests/server/members.test.ts` so it includes `connectDiscordMember`:

```ts
import { connectDiscordMember, joinGroupByInvite, listMembers } from "@/server/members";
```

Then append this test inside the existing `describe("members", () => { ... })` block:

```ts
it("connects a Discord user id to a member", async () => {
  const group = await createGroup({ name: "Static" });
  const member = await joinGroupByInvite({
    inviteCode: group.inviteCode,
    nickname: "DiscordUser",
  });

  const connected = await connectDiscordMember({
    memberId: member.id,
    discordUserId: "1234567890",
  });

  expect(connected.discordUserId).toBe("1234567890");
  expect(connected.discordConnectedAt).toBeInstanceOf(Date);
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
npm test -- tests/server/members.test.ts
```

Expected:

```text
FAIL tests/server/members.test.ts
Module '@/server/members' has no exported member 'connectDiscordMember'
```

- [ ] **Step 3: Implement member Discord connection**

Add this function to `src/server/members.ts`:

```ts
export async function connectDiscordMember(input: {
  memberId: string;
  discordUserId: string;
}) {
  if (!input.discordUserId.trim()) {
    throw new Error("Discord user id is required");
  }

  return db.member.update({
    where: { id: input.memberId },
    data: {
      discordUserId: input.discordUserId.trim(),
      discordConnectedAt: new Date(),
    },
  });
}
```

- [ ] **Step 4: Create Discord OAuth helper**

Create `src/server/discord-oauth.ts`:

```ts
export function getDiscordAuthorizeUrl(memberId: string) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state: memberId,
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCodeForUserId(code: string) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Discord OAuth is not configured");
  }

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Discord token exchange failed");
  }

  const tokenJson = (await tokenResponse.json()) as { access_token: string };
  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });

  if (!userResponse.ok) {
    throw new Error("Discord user lookup failed");
  }

  const userJson = (await userResponse.json()) as { id: string };
  return userJson.id;
}
```

- [ ] **Step 5: Add OAuth callback route**

Create `src/app/api/discord/oauth/callback/route.ts`:

```ts
import { NextResponse } from "next/server";
import { connectDiscordMember } from "@/server/members";
import { exchangeDiscordCodeForUserId } from "@/server/discord-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const memberId = url.searchParams.get("state");

  if (!code || !memberId) {
    return NextResponse.redirect(new URL("/notifications?discord=missing", url));
  }

  try {
    const discordUserId = await exchangeDiscordCodeForUserId(code);
    await connectDiscordMember({ memberId, discordUserId });
    return NextResponse.redirect(new URL("/notifications?discord=connected", url));
  } catch {
    return NextResponse.redirect(new URL("/notifications?discord=failed", url));
  }
}
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm test -- tests/server/members.test.ts
```

Expected:

```text
PASS tests/server/members.test.ts
```

- [ ] **Step 7: Commit**

```powershell
git add src/server/members.ts src/server/discord-oauth.ts src/app/api/discord/oauth/callback/route.ts tests/server/members.test.ts
git commit -m "feat: add Discord account linking"
```

## Task 10: Notification Jobs And Worker

**Files:**
- Create: `src/server/notifications.ts`
- Create: `src/server/discord.ts`
- Create: `src/worker/notification-worker.ts`
- Create: `src/app/notifications/page.tsx`
- Test: `tests/server/notifications.test.ts`

- [ ] **Step 1: Write failing notification test**

Create `tests/server/notifications.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createNotificationJob, markNotificationFailed, takeDueNotificationJobs } from "@/server/notifications";

describe("notifications", () => {
  it("queues and takes due notification jobs", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "PingMe" });

    await createNotificationJob({
      groupId: group.id,
      memberId: member.id,
      scheduleId: null,
      type: "MISSING_AVAILABILITY",
      message: "Please enter availability",
      sendAfter: new Date("2026-06-04T12:00:00+09:00"),
    });

    const jobs = await takeDueNotificationJobs(new Date("2026-06-04T12:01:00+09:00"));
    expect(jobs).toHaveLength(1);
  });

  it("records failure without deleting job", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "NoDiscord" });
    const job = await createNotificationJob({
      groupId: group.id,
      memberId: member.id,
      scheduleId: null,
      type: "REMINDER",
      message: "Raid soon",
      sendAfter: new Date("2026-06-04T12:00:00+09:00"),
    });

    const failed = await markNotificationFailed(job.id, "Discord is not connected");
    expect(failed.status).toBe("FAILED");
    expect(failed.failureReason).toBe("Discord is not connected");
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
npm test -- tests/server/notifications.test.ts
```

Expected:

```text
FAIL tests/server/notifications.test.ts
Cannot find module '@/server/notifications'
```

- [ ] **Step 3: Implement notification service**

Create `src/server/notifications.ts`:

```ts
import { db } from "@/server/db";

export async function createNotificationJob(input: {
  groupId: string;
  memberId: string;
  scheduleId: string | null;
  type: string;
  message: string;
  sendAfter: Date;
}) {
  return db.notificationJob.create({
    data: {
      groupId: input.groupId,
      memberId: input.memberId,
      scheduleId: input.scheduleId,
      type: input.type,
      message: input.message,
      sendAfter: input.sendAfter,
    },
  });
}

export async function takeDueNotificationJobs(now = new Date()) {
  return db.notificationJob.findMany({
    where: {
      status: "PENDING",
      sendAfter: { lte: now },
      attempts: { lt: 3 },
    },
    include: { member: true },
    orderBy: { sendAfter: "asc" },
    take: 20,
  });
}

export async function markNotificationSent(jobId: string) {
  return db.notificationJob.update({
    where: { id: jobId },
    data: { status: "SENT", failureReason: null },
  });
}

export async function markNotificationFailed(jobId: string, reason: string) {
  return db.notificationJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      failureReason: reason,
      attempts: { increment: 1 },
    },
  });
}
```

- [ ] **Step 4: Implement Discord adapter**

Create `src/server/discord.ts`:

```ts
import { Client, GatewayIntentBits } from "discord.js";

let client: Client | null = null;

async function getClient() {
  if (client?.isReady()) return client;

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }

  client = new Client({ intents: [GatewayIntentBits.DirectMessages] });
  await client.login(token);
  return client;
}

export async function sendDiscordDm(discordUserId: string, message: string) {
  const discord = await getClient();
  const user = await discord.users.fetch(discordUserId);
  await user.send(message);
}
```

- [ ] **Step 5: Implement worker**

Create `src/worker/notification-worker.ts`:

```ts
import { sendDiscordDm } from "@/server/discord";
import {
  markNotificationFailed,
  markNotificationSent,
  takeDueNotificationJobs,
} from "@/server/notifications";

async function processOnce() {
  const jobs = await takeDueNotificationJobs();
  for (const job of jobs) {
    try {
      if (!job.member.discordUserId) {
        throw new Error("Discord is not connected");
      }
      await sendDiscordDm(job.member.discordUserId, job.message);
      await markNotificationSent(job.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown Discord error";
      await markNotificationFailed(job.id, reason);
    }
  }
}

async function main() {
  while (true) {
    await processOnce();
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 6: Add notifications page**

Create `src/app/notifications/page.tsx`:

```tsx
import { db } from "@/server/db";
import { getDiscordAuthorizeUrl } from "@/server/discord-oauth";
import { requireCurrentMember } from "@/server/auth-context";

export default async function NotificationsPage() {
  const member = await requireCurrentMember();
  const jobs = await db.notificationJob.findMany({
    where: { groupId: member.groupId },
    include: { member: true, schedule: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const discordUrl = member.discordUserId ? null : getDiscordAuthorizeUrl(member.id);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <section className="mt-4 rounded border border-zinc-200 p-4">
        <h2 className="font-medium">Discord DM</h2>
        {member.discordUserId ? (
          <p className="mt-2 text-sm text-zinc-600">Discord is connected.</p>
        ) : !discordUrl ? (
          <p className="mt-2 text-sm text-zinc-600">Discord OAuth is not configured.</p>
        ) : (
          <a className="mt-3 inline-block rounded bg-zinc-950 px-4 py-2 text-white" href={discordUrl}>
            Connect Discord
          </a>
        )}
      </section>
      <section className="mt-6 grid gap-3">
        {jobs.map((job) => (
          <div key={job.id} className="rounded border border-zinc-200 p-4">
            <div className="font-medium">{job.type}</div>
            <div className="text-sm text-zinc-600">
              {job.member.nickname} / {job.status}
              {job.failureReason ? ` / ${job.failureReason}` : ""}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 7: Run tests**

Run:

```powershell
npm test -- tests/server/notifications.test.ts
```

Expected:

```text
PASS tests/server/notifications.test.ts
```

- [ ] **Step 8: Commit**

```powershell
git add src/server/notifications.ts src/server/discord.ts src/worker/notification-worker.ts src/app/notifications tests/server/notifications.test.ts
git commit -m "feat: add notification jobs and Discord worker"
```

## Task 11: App Shell And Navigation

**Files:**
- Create: `src/components/app-shell.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add app shell component**

Create `src/components/app-shell.tsx`:

```tsx
const navItems = [
  { href: "/", label: "Home" },
  { href: "/calendar", label: "Calendar" },
  { href: "/schedules", label: "Schedules" },
  { href: "/members", label: "Members" },
  { href: "/templates", label: "Templates" },
  { href: "/notifications", label: "Notifications" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <a href="/" className="font-semibold">Lost Ark Party</a>
          <nav className="flex flex-wrap gap-3 text-sm text-zinc-600">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-zinc-950">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Wrap layout**

Modify `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Lost Ark Party Planner",
  description: "Fixed raid group scheduling and roster planning",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Run build**

Run:

```powershell
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 4: Commit**

```powershell
git add src/components/app-shell.tsx src/app/layout.tsx src/app/globals.css
git commit -m "feat: add operational app navigation"
```

## Task 12: Docker Compose VPS Skeleton

**Files:**
- Create: `Dockerfile`
- Modify: `docker-compose.yml`
- Create: `docker/Caddyfile`
- Create: `.env.vps.example`
- Create: `docker/backup-postgres.sh`

- [ ] **Step 1: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
EXPOSE 3000
CMD ["npm", "run", "start"]
```

- [ ] **Step 2: Replace local compose file with deployment compose file**

Create `docker-compose.yml`:

```yaml
services:
  caddy:
    image: caddy:2.10-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web

  web:
    build: .
    restart: unless-stopped
    env_file: .env
    depends_on:
      - postgres
    command: sh -c "npx prisma migrate deploy && npm run start"

  worker:
    build: .
    restart: unless-stopped
    env_file: .env
    depends_on:
      - postgres
    command: sh -c "npx prisma migrate deploy && npm run worker:notifications"

  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: lostark
      POSTGRES_PASSWORD: lostark
      POSTGRES_DB: lostark_party
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

- [ ] **Step 3: Create Caddyfile**

Create `docker/Caddyfile`:

```caddyfile
{$APP_DOMAIN} {
  encode gzip
  reverse_proxy web:3000
}
```

- [ ] **Step 4: Create VPS environment example**

Create `.env.vps.example`:

```env
DATABASE_URL=postgresql://lostark:lostark@postgres:5432/lostark_party
APP_BASE_URL=https://lostark-party.example.com
APP_DOMAIN=lostark-party.example.com
SESSION_COOKIE_NAME=lostark_party_member
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_REDIRECT_URI=https://lostark-party.example.com/api/discord/oauth/callback
```

- [ ] **Step 5: Create backup script**

Create `docker/backup-postgres.sh`:

```sh
#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"

mkdir -p "$BACKUP_DIR"
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/lostark-party-$TIMESTAMP.sql"
find "$BACKUP_DIR" -type f -name 'lostark-party-*.sql' -mtime +"$RETENTION_DAYS" -delete
```

- [ ] **Step 6: Validate compose config**

Run:

```powershell
docker compose config
```

Expected:

```text
services:
  caddy:
  postgres:
  web:
  worker:
```

- [ ] **Step 7: Commit**

```powershell
git add Dockerfile docker-compose.yml docker .env.vps.example
git commit -m "chore: add Docker Compose deployment skeleton"
```

## Task 13: End-To-End Smoke Test

**Files:**
- Create: `tests/e2e/invite-and-schedule.spec.ts`

- [ ] **Step 1: Write Playwright smoke test**

Create `tests/e2e/invite-and-schedule.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("invite join page accepts a nickname", async ({ page }) => {
  await page.goto("/invite/example-code");
  await expect(page.getByRole("heading", { name: "Join raid group" })).toBeVisible();
  await page.getByPlaceholder("Nickname").fill("Mokoko");
  await expect(page.getByRole("button", { name: "Join" })).toBeVisible();
});
```

- [ ] **Step 2: Add Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

- [ ] **Step 3: Run all verification**

Run:

```powershell
npm test
npm run build
npm run test:e2e
```

Expected:

```text
Test Files ... passed
Compiled successfully
1 passed
```

- [ ] **Step 4: Commit**

```powershell
git add playwright.config.ts tests/e2e
git commit -m "test: add MVP browser smoke test"
```

## Final Verification

- [ ] Run unit and component tests:

```powershell
npm test
```

Expected:

```text
Test Files ... passed
```

- [ ] Run production build:

```powershell
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] Validate Docker Compose:

```powershell
docker compose config
```

Expected:

```text
services:
```

- [ ] Run browser smoke test:

```powershell
npm run test:e2e
```

Expected:

```text
1 passed
```

## Implementation Notes

- The implementation must use TDD for service modules. Write the failing test, verify the failure, implement the minimal code, then verify green.
- Do not add public recruitment, moderation, payments, Redis, SMS, or mobile push in the MVP.
- Keep the Discord bot limited to OAuth linking and DM delivery. Schedule state belongs to the web app and database.
- Keep the availability grid custom and compact. The product is an operational tool, not a marketing site.
