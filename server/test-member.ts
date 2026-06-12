import { prisma } from "./src/lib/db.js";

async function main() {
  const ws = await prisma.workspace.findFirst({
    orderBy: { createdAt: "desc" },
    include: { members: true }
  });
  console.log("Latest workspace:", ws?.name, ws?.id);
  console.log("Members:", ws?.members);

  if (ws && ws.members.length > 0) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: ws.id,
          userId: ws.members[0].userId
        }
      }
    });
    console.log("findUnique result:", member);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
