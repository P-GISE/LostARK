import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  await prisma.group.upsert({
    where: { inviteCode: "seed-static" },
    update: {
      name: "기본 공대",
      inviteEnabled: true,
    },
    create: {
      name: "기본 공대",
      inviteCode: "seed-static",
      inviteEnabled: true,
      members: {
        create: {
          nickname: "공대장",
          role: "LEADER",
        },
      },
    },
  });

  await prisma.group.upsert({
    where: { inviteCode: "test-code" },
    update: {
      name: "로컬 테스트 공대",
      inviteEnabled: true,
    },
    create: {
      name: "로컬 테스트 공대",
      inviteCode: "test-code",
      inviteEnabled: true,
    },
  });

  await prisma.group.create({
    data: {
      name: "샘플 공대",
      inviteCode: nanoid(12),
      inviteEnabled: true,
    },
  });

  await prisma.member.updateMany({
    where: { nickname: "Raid Leader" },
    data: { nickname: "공대장" },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
