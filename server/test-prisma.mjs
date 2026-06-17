import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function test() {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: { slug: 'sandbox-corp' },
      include: { channels: true, members: { include: { user: true } } },
    });
    if (!workspace) { console.log("NOT FOUND"); return; }
    console.log("Found:", workspace.id);
    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: { description: "test" },
    });
    console.log("Updated:", updated.id, updated.description);
  } catch (e) { console.error("ERROR:", e); }
  finally { await prisma.$disconnect(); }
}
test();
