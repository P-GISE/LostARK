import { describe, expect, it } from "vitest";
import { createGroupWithLeader } from "@/server/groups";
import { createRaidTemplate } from "@/server/raid-templates";
import { createRaidSignup, listRaidSignups } from "@/server/signups";

describe("signup priority", () => {
  it("lists open signups in the template priority order", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "신청 우선순위 공대",
      leaderNickname: "리더",
    });
    const preludeTemplate = await createRaidTemplate({
      difficulty: "노말",
      gates: "1-2",
      groupId: group.id,
      name: "카제로스 서막: 붉어진 백야의 나선",
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
    const finaleTemplate = await createRaidTemplate({
      difficulty: "노말",
      gates: "1-2",
      groupId: group.id,
      name: "카제로스 종막: 최후의 날",
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
    await createRaidSignup({
      actorMemberId: leader.id,
      maxParties: 1,
      partySize: 1,
      templateId: finaleTemplate.id,
      title: "종막 신청",
      weekStartDate: "2030-06-05",
    });
    await createRaidSignup({
      actorMemberId: leader.id,
      maxParties: 1,
      partySize: 1,
      templateId: preludeTemplate.id,
      title: "서막 신청",
      weekStartDate: "2030-06-05",
    });

    // When
    const signups = await listRaidSignups(group.id, "2030-06-05");

    // Then
    expect(signups.map((signup) => signup.title)).toEqual([
      "종막 신청",
      "서막 신청",
    ]);
  });
});
