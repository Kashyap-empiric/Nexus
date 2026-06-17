import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const passwords = ["password123", "Password123!", "test123", "password", "Test1234!", "nexus123", "Passw0rd!", "admin123", "nexus1234"];

const emails = [
  "alice@example.com",
  "bob@example.com", 
  "john@gmail.com",
  "george@gmail.com",
  "kashyap.k@empiricinfotech.com",
  "lewis@gmail.com",
];

async function main() {
  for (const email of emails) {
    for (const pw of passwords) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });
      
      if (!error) {
        console.log(`SUCCESS: ${email} / ${pw}`);
        console.log(`TOKEN: ${data.session.access_token}`);
        console.log(`ID: ${data.user.id}`);
        console.log("---");
        break;
      }
    }
  }
}

main().catch(console.error);
