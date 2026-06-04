import { describe, expect, it } from "vitest";
import { createCharacter, listCharactersForMember } from "@/server/characters";
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
    ).rejects.toThrow("Item level must be positive");
  });
});
