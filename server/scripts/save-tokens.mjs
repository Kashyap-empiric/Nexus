import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { writeFileSync } from "fs";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const users = [
  { email: "agent-test-a@nexus.test", password: "TestPass123!", username: "agent-a" },
  { email: "agent-test-b@nexus.test", password: "TestPass123!", username: "agent-b" },
];

async function main() {
  const tokens = {};
  
  for (const u of users) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: u.email, password: u.password });
    if (error) { console.error(`FAILED ${u.email}: ${error.message}`); continue; }
    
    await prisma.user.upsert({
      where: { id: data.user.id },
      update: { username: u.username, email: u.email },
      create: { id: data.user.id, username: u.username, email: u.email },
    });
    
    tokens[u.username] = { userId: data.user.id, token: data.session.access_token };
    console.log(`${u.username}: ${data.session.access_token.substring(0, 40)}...`);
  }
  
  writeFileSync("/tmp/nexus-tokens.json", JSON.stringify(tokens, null, 2));
  console.log("Tokens saved to /tmp/nexus-tokens.json");
  await prisma.$disconnect();
}

main().catch(console.error);
