const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://postgres:postgres@localhost:5432/nexus?schema=public" }
  }
});
async function main() {
  const johndoe = await prisma.user.findFirst({
    where: { username: 'johndoe' }
  });
  console.log("JOHNDOE USER:", JSON.stringify(johndoe, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
