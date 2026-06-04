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
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
        {
          label: "Support 1",
          role: "SUPPORT",
          required: true,
          classPreference: "Bard/Artist/Paladin",
          notes: "",
        },
      ],
    });

    expect(template.slots).toHaveLength(2);
    expect(template.requirements).toContain("Clear experience");
  });
});
