import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: { slug: 'sandbox-corp' },
      include: {
        channels: true,
        members: { include: { user: true } },
      },
    });
    
    if (!workspace) {
      console.log("Workspace not found");
      return;
    }
    
    console.log("Found workspace:", workspace.id, workspace.name);
    
    const updateData = { description: "Test description" };
    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: updateData,
    });
    
    console.log("Update succeeded:", updated.id, updated.description);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
