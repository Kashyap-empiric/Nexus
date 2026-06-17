import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// Use the service role key to create a test user
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  // First, try to create test users
  const testUsers = [
    { email: "agent-test-a@nexus.test", password: "TestPass123!", username: "agent-a" },
    { email: "agent-test-b@nexus.test", password: "TestPass123!", username: "agent-b" },
  ];
  
  for (const u of testUsers) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    
    if (error) {
      console.log(`CREATE FAILED ${u.email}: ${error.message}`);
      continue;
    }
    
    console.log(`CREATED USER: ${u.email}, ID: ${data.user.id}`);
    
    // Now sign in to get token
    const { data: signIn, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: u.email,
      password: u.password,
    });
    
    if (signInError) {
      console.log(`SIGNIN FAILED: ${signInError.message}`);
      continue;
    }
    
    console.log(`TOKEN: ${signIn.session.access_token}`);
    console.log(`ID: ${signIn.user.id}`);
    console.log("---");
  }
}

main().catch(console.error);
