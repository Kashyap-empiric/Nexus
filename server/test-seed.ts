import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function test() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'alice@nexus.dev',
    password: 'password123',
    user_metadata: { username: 'alice' },
    email_confirm: true,
  })
  console.log("data:", data)
  console.log("error:", error)
}
test()
