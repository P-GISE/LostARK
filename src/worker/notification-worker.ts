import { sendDiscordDm } from "@/server/discord";
import {
  markNotificationCanceled,
  markNotificationFailed,
  markNotificationSent,
  shouldSendNotificationJob,
  takeDueNotificationJobs,
} from "@/server/notifications";

export async function processNotificationJobsOnce() {
  const jobs = await takeDueNotificationJobs();

  for (const job of jobs) {
    try {
      if (!job.member.discordUserId) {
        throw new Error("디스코드가 연결되어 있지 않습니다");
      }

      if (job.type === "REMINDER" && !(await shouldSendNotificationJob(job))) {
        await markNotificationCanceled(
          job.id,
          "참가 대상이 아닌 리마인더입니다.",
        );
        continue;
      }

      await sendDiscordDm(job.member.discordUserId, job.message);
      await markNotificationSent(job.id);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "알 수 없는 디스코드 오류";
      try {
        await markNotificationFailed(job.id, reason);
      } catch (markError) {
        console.error("Failed to mark notification job as failed", {
          error: markError,
          jobId: job.id,
        });
      }
    }
  }
}

async function main() {
  while (true) {
    await processNotificationJobsOnce();
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
