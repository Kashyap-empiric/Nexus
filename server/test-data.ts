import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.message.count();
  console.log(`Total messages: ${count}`);
  const sample = await prisma.message.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log('Latest message:', sample);
}
main().catch(console.error).finally(() => prisma.$disconnect());
