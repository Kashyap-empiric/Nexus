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
  console.log("Seeding conversations and messages...");

  // 1. Fetch Alice and Bob by email
  const alice = await prisma.user.findUnique({
    where: { email: "alice@example.com" },
  });
  
  const bob = await prisma.user.findUnique({
    where: { email: "bob@example.com" },
  });

  if (!alice || !bob) {
    throw new Error(
      "Alice or Bob not found! Please register alice@example.com and bob@example.com in the UI first."
    );
  }

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
