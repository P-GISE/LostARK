import { afterEach, describe, expect, it, vi } from "vitest";
import { processNotificationJobsOnce } from "@/worker/notification-worker";

const mocks = vi.hoisted(() => ({
  markNotificationFailed: vi.fn(),
  markNotificationSent: vi.fn(),
  sendDiscordDm: vi.fn(),
  takeDueNotificationJobs: vi.fn(),
}));

vi.mock("@/server/discord", () => ({
  sendDiscordDm: mocks.sendDiscordDm,
}));

vi.mock("@/server/notifications", () => ({
  markNotificationFailed: mocks.markNotificationFailed,
  markNotificationSent: mocks.markNotificationSent,
  takeDueNotificationJobs: mocks.takeDueNotificationJobs,
}));

describe("notification worker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("continues processing jobs when recording one failed job fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.takeDueNotificationJobs.mockResolvedValue([
      {
        id: "job-1",
        message: "first",
        member: { discordUserId: "user-1" },
      },
      {
        id: "job-2",
        message: "second",
        member: { discordUserId: "user-2" },
      },
    ]);
    mocks.sendDiscordDm
      .mockRejectedValueOnce(new Error("Discord send failed"))
      .mockResolvedValueOnce(undefined);
    mocks.markNotificationFailed.mockRejectedValueOnce(
      new Error("Notification job was already removed"),
    );
    mocks.markNotificationSent.mockResolvedValue(undefined);

    await expect(processNotificationJobsOnce()).resolves.toBeUndefined();

    expect(mocks.markNotificationFailed).toHaveBeenCalledWith(
      "job-1",
      "Discord send failed",
    );
    expect(mocks.sendDiscordDm).toHaveBeenCalledWith("user-2", "second");
    expect(mocks.markNotificationSent).toHaveBeenCalledWith("job-2");
    expect(consoleError).toHaveBeenCalled();
  });
});
