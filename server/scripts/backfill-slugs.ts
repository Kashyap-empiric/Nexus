import { prisma } from "../src/lib/db.ts";

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function main() {
  const workspaces = await prisma.workspace.findMany();
  
  for (const workspace of workspaces) {
    if (!workspace.slug) {
      let baseSlug = generateSlug(workspace.name) || 'workspace';
      let slug = baseSlug;
      let counter = 1;
      
      // Keep trying until we find a unique slug
      while (true) {
        const exists = await prisma.workspace.findUnique({ where: { slug } });
        if (!exists) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { slug },
      });
      console.log(`Backfilled workspace ${workspace.name} with slug: ${slug}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
