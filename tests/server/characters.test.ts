import { describe, expect, it } from "vitest";
import {
  createCharacter,
  deleteCharacter,
  listCharactersForMember,
  updateCharacter,
} from "@/server/characters";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";

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
    ).rejects.toThrow("아이템 레벨은 0보다 커야 합니다");
  });

  it("rejects non-finite item levels", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "InvalidFiniteLevel",
    });

    await expect(
      createCharacter({
        memberId: member.id,
        name: "Bad",
        className: "Berserker",
        itemLevel: Number.NaN,
        preferredRole: "DPS",
        notes: "",
      }),
    ).rejects.toThrow("아이템 레벨은 0보다 커야 합니다");
  });

  it("rejects invalid combat power values", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "InvalidCombatPower",
    });

    await expect(
      createCharacter({
        memberId: member.id,
        name: "Bad",
        className: "Berserker",
        itemLevel: 1600,
        preferredRole: "DPS",
        notes: "",
        combatPower: Number.NaN,
      }),
    ).rejects.toThrow("전투력은 0 이상의 정수여야 합니다");

    await expect(
      createCharacter({
        memberId: member.id,
        name: "BadTwo",
        className: "Berserker",
        itemLevel: 1600,
        preferredRole: "DPS",
        notes: "",
        combatPower: 10.5,
      }),
    ).rejects.toThrow("전투력은 0 이상의 정수여야 합니다");
  });

  it("updates a character owned by the acting member", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "EditUser",
    });
    const character = await createCharacter({
      memberId: member.id,
      name: "OldName",
      className: "Bard",
      itemLevel: 1600,
      preferredRole: "SUPPORT",
      notes: "",
    });

    const updated = await updateCharacter({
      actorMemberId: member.id,
      characterId: character.id,
      name: "NewName",
      className: "Artist",
      itemLevel: 1640,
      preferredRole: "SUPPORT",
      notes: "상아탑 가능",
    });

    expect(updated.name).toBe("NewName");
    expect(updated.className).toBe("Artist");
    expect(updated.itemLevel).toBe(1640);
    expect(updated.notes).toBe("상아탑 가능");
  });

  it("rejects updating another member character", async () => {
    const group = await createGroup({ name: "Static" });
    const owner = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Owner",
    });
    const other = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Other",
    });
    const character = await createCharacter({
      memberId: owner.id,
      name: "OwnerChar",
      className: "Bard",
      itemLevel: 1600,
      preferredRole: "SUPPORT",
      notes: "",
    });

    await expect(
      updateCharacter({
        actorMemberId: other.id,
        characterId: character.id,
        name: "Stolen",
        className: "Bard",
        itemLevel: 1600,
        preferredRole: "SUPPORT",
        notes: "",
      }),
    ).rejects.toThrow("내 캐릭터만 변경할 수 있습니다");
  });

  it("deletes a character owned by the acting member", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "DeleteUser",
    });
    const character = await createCharacter({
      memberId: member.id,
      name: "DeleteMe",
      className: "Bard",
      itemLevel: 1600,
      preferredRole: "SUPPORT",
      notes: "",
    });

    await deleteCharacter({
      actorMemberId: member.id,
      characterId: character.id,
    });

    const characters = await listCharactersForMember(member.id);
    expect(characters.map((item) => item.id)).not.toContain(character.id);
  });

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
});
