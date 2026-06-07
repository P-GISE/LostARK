import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processNotificationJobsOnce } from "@/worker/notification-worker";

const mocks = vi.hoisted(() => ({
  markNotificationCanceled: vi.fn(),
  markNotificationFailed: vi.fn(),
  markNotificationSent: vi.fn(),
  sendDiscordDm: vi.fn(),
  shouldSendNotificationJob: vi.fn(),
  takeDueNotificationJobs: vi.fn(),
}));

vi.mock("@/server/discord", () => ({
  sendDiscordDm: mocks.sendDiscordDm,
}));

vi.mock("@/server/notifications", () => ({
  markNotificationCanceled: mocks.markNotificationCanceled,
  markNotificationFailed: mocks.markNotificationFailed,
  markNotificationSent: mocks.markNotificationSent,
  shouldSendNotificationJob: mocks.shouldSendNotificationJob,
  takeDueNotificationJobs: mocks.takeDueNotificationJobs,
}));

describe("notification worker", () => {
  beforeEach(() => {
    mocks.markNotificationCanceled.mockReset();
    mocks.markNotificationFailed.mockReset();
    mocks.markNotificationSent.mockReset();
    mocks.sendDiscordDm.mockReset();
    mocks.shouldSendNotificationJob.mockReset();
    mocks.takeDueNotificationJobs.mockReset();
  });

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

  it("cancels reminder jobs when the member is not participating", async () => {
    mocks.takeDueNotificationJobs.mockResolvedValue([
      {
        id: "job-1",
        memberId: "member-1",
        message: "reminder",
        scheduleId: "schedule-1",
        type: "REMINDER",
        member: { discordUserId: "user-1" },
      },
    ]);
    mocks.shouldSendNotificationJob.mockResolvedValue(false);
    mocks.markNotificationCanceled.mockResolvedValue(undefined);

    await expect(processNotificationJobsOnce()).resolves.toBeUndefined();

    expect(mocks.shouldSendNotificationJob).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-1",
        memberId: "member-1",
        scheduleId: "schedule-1",
        type: "REMINDER",
      }),
    );
    expect(mocks.sendDiscordDm).not.toHaveBeenCalled();
    expect(mocks.markNotificationCanceled).toHaveBeenCalledWith(
      "job-1",
      "참가 대상이 아닌 리마인더입니다.",
    );
  });
});
