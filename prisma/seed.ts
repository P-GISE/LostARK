import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  await prisma.group.upsert({
    where: { inviteCode: "seed-static" },
    update: {},
    create: {
      name: "Seed Static",
      inviteCode: "seed-static",
      inviteEnabled: true,
      members: {
        create: {
          nickname: "Raid Leader",
          role: "LEADER",
        },
      },
    },
  });

  await prisma.group.create({
    data: {
      name: "Example Static",
      inviteCode: nanoid(12),
      inviteEnabled: true,
    },
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
