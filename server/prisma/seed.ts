import { PrismaClient } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Create two users
  const user1Id = uuidv7();
  const user2Id = uuidv7();

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      id: user1Id,
      email: "alice@example.com",
      name: "Alice",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      id: user2Id,
      email: "bob@example.com",
      name: "Bob",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    },
  });

  // 2. Determine the unique dmPair string
  const [u1, u2] = [alice.id, bob.id].sort();
  const dmPair = `${u1}_${u2}`;

  // 3. Create the DM Conversation
  const conversationId = uuidv7();
  
  const conversation = await prisma.conversation.upsert({
    where: { dmPair },
    update: {},
    create: {
      id: conversationId,
      type: "DM",
      isPrivate: true,
      dmPair: dmPair,
      members: {
        create: [
          {
            id: uuidv7(),
            userId: alice.id,
          },
          {
            id: uuidv7(),
            userId: bob.id,
          },
        ],
      },
    },
  });

  // 4. Create 3 Messages
  const msg1Id = uuidv7();
  const msg2Id = uuidv7();
  const msg3Id = uuidv7();

  await prisma.message.createMany({
    data: [
      {
        id: msg1Id,
        conversationId: conversation.id,
        userId: alice.id,
        content: "Hey Bob! Is the new server running?",
      },
      {
        id: msg2Id,
        conversationId: conversation.id,
        userId: bob.id,
        content: "Hey Alice, yes it is! The Prisma migration just finished.",
      },
      {
        id: msg3Id,
        conversationId: conversation.id,
        userId: alice.id,
        content: "Awesome, let's test the cursor pagination next.",
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
