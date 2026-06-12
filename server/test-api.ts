import { prisma } from "./src/lib/db.js";
import { isWorkspaceMember } from "./src/modules/auth/auth.service.js";

async function main() {
  const ws = await prisma.workspace.findFirst({
    orderBy: { createdAt: "desc" },
    include: { members: true }
  });
  
  if (ws && ws.members.length > 0) {
    const userId = ws.members[0].userId;
    console.log("Checking user:", userId, "for workspace:", ws.id);
    const isMember = await isWorkspaceMember(userId, ws.id);
    console.log("isMember result:", isMember);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
