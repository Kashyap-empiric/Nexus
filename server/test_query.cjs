const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://postgres:postgres@localhost:5432/nexus?schema=public" }
  }
});
async function main() {
  const m = await prisma.message.findFirst({
    where: { user: { username: 'johndoe' } },
    include: { user: true }
  });
  console.log("JOHNDOE MESSAGE:", JSON.stringify(m, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
