import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { writeFileSync } from "fs";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "agent-test-a@nexus.test", password: "TestPass123!", username: "agent-a" },
  { email: "agent-test-b@nexus.test", password: "TestPass123!", username: "agent-b" },
];

async function main() {
  const tokens = {};
  for (const u of users) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: u.email, password: u.password });
    if (error) { console.error(`FAILED ${u.email}: ${error.message}`); process.exit(1); }
    tokens[u.username] = { userId: data.user.id, token: data.session.access_token };
  }
  writeFileSync("/tmp/nexus-tokens.json", JSON.stringify(tokens, null, 2));
  console.log("Tokens refreshed");
}

main().catch(console.error);
