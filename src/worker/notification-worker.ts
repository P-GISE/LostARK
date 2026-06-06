import { sendDiscordDm } from "@/server/discord";
import {
  markNotificationFailed,
  markNotificationSent,
  takeDueNotificationJobs,
} from "@/server/notifications";

export async function processNotificationJobsOnce() {
  const jobs = await takeDueNotificationJobs();

  for (const job of jobs) {
    try {
      if (!job.member.discordUserId) {
        throw new Error("디스코드가 연결되어 있지 않습니다");
      }

      await sendDiscordDm(job.member.discordUserId, job.message);
      await markNotificationSent(job.id);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "알 수 없는 디스코드 오류";
      await markNotificationFailed(job.id, reason);
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
