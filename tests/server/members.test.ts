import { describe, expect, it } from "vitest";
import { createGroup } from "@/server/groups";
import {
  connectDiscordMember,
  joinGroupByInvite,
  listMembers,
} from "@/server/members";

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
    await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Mokoko",
    });

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
});
