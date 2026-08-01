import { db } from "@/server/db";

export type BotOutboxPayload = {
  readonly content?: string;
  readonly embeds?: readonly unknown[];
  readonly components?: readonly unknown[];
};

export async function createBotOutboxMessage(input: {
  readonly groupId: string;
  readonly discordGuildId: string;
  readonly discordChannelId: string;
  readonly payload: BotOutboxPayload;
}) {
  return db.botOutboxMessage.create({
    data: {
      discordChannelId: input.discordChannelId,
      discordGuildId: input.discordGuildId,
      groupId: input.groupId,
      payloadJson: JSON.stringify(input.payload),
    },
  });
}

export async function listPendingBotOutboxMessages(limit = 20) {
  const take = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;

  return db.botOutboxMessage.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take,
  });
}

export async function markBotOutboxSent(messageId: string, sentAt = new Date()) {
  return db.botOutboxMessage.update({
    where: { id: messageId },
    data: {
      failureReason: null,
      sentAt,
      status: "SENT",
    },
  });
}

export async function markBotOutboxFailed(messageId: string, reason: string) {
  return db.botOutboxMessage.update({
    where: { id: messageId },
    data: {
      failureReason: reason.trim() || "UNKNOWN",
      status: "FAILED",
    },
  });
}

export function serializeBotOutboxMessage(message: {
  readonly id: string;
  readonly discordGuildId: string;
  readonly discordChannelId: string;
  readonly payloadJson: string;
}) {
  return {
    id: message.id,
    discordGuildId: message.discordGuildId,
    discordChannelId: message.discordChannelId,
    payload: JSON.parse(message.payloadJson) as BotOutboxPayload,
  };
}

