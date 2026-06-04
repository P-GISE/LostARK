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
