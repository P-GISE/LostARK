import { describe, expect, it } from "vitest";
import { createCharacter } from "@/server/characters";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import {
  assignScheduleSlot,
  createScheduleFromTemplate,
} from "@/server/schedules";

describe("schedules", () => {
  it("creates schedule slots from a raid template", async () => {
    const group = await createGroup({ name: "Static" });
    const leader = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Lead",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Behemoth",
      difficulty: "Normal",
      gates: "1",
      requiredPlayers: 8,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
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
    const leader = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Lead",
    });
    const memberA = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "AA",
    });
    const memberB = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "BB",
    });
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
      slots: [
        {
          label: "Support 1",
          role: "SUPPORT",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
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
