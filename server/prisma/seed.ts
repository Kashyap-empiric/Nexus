import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { uuidv7 } from 'uuidv7'
import 'dotenv/config'
import { prisma } from '@/lib/db'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role — never expose client-side
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  // 1. Create or fetch two users via Supabase Auth
  let aliceId: string
  const { data: authUser1, error: err1 } = await supabase.auth.admin.createUser({
    email: 'alice@example.com',
    password: 'password123',
    user_metadata: { username: 'alice' },
    email_confirm: true,
  })
  
  if (err1 && err1.code === 'user_already_exists' || err1?.code === 'email_exists') {
    const { data: { users } } = await supabase.auth.admin.listUsers()
    aliceId = users.find(u => u.email === 'alice@example.com')!.id
  } else if (err1) {
    throw err1
  } else {
    aliceId = authUser1.user!.id
  }

  let bobId: string
  const { data: authUser2, error: err2 } = await supabase.auth.admin.createUser({
    email: 'bob@example.com',
    password: 'password123',
    user_metadata: { username: 'bob' },
    email_confirm: true,
  })

  if (err2 && err2.code === 'user_already_exists' || err2?.code === 'email_exists') {
    const { data: { users } } = await supabase.auth.admin.listUsers()
    bobId = users.find(u => u.email === 'bob@example.com')!.id
  } else if (err2) {
    throw err2
  } else {
    bobId = authUser2.user!.id
  }

  // Ensure they exist in public.User (fallback in case the Postgres trigger is missing/delayed)
  await prisma.user.upsert({
    where: { id: aliceId },
    update: {},
    create: { id: aliceId, email: 'alice@example.com', username: 'alice' }
  })
  await prisma.user.upsert({
    where: { id: bobId },
    update: {},
    create: { id: bobId, email: 'bob@example.com', username: 'bob' }
  })

  // 2. Create a DM conversation between them
  const conversationId = uuidv7()
  await prisma.conversation.create({
    data: {
      id: conversationId,
      type: 'DM',
      isPrivate: true,
      dmPair: [aliceId, bobId].sort().join(':'),
      members: {
        create: [
          {
            id: uuidv7(),
            userId: aliceId,
          },
          {
            id: uuidv7(),
            userId: bobId,
          },
        ],
      },
    },
  })

  // 3. Seed some messages
  const messages = [
    { id: uuidv7(), userId: aliceId, content: 'Hey Bob! How are you?' },
    { id: uuidv7(), userId: bobId, content: 'Hey Alice! Doing great, you?' },
    { id: uuidv7(), userId: aliceId, content: 'Pretty good! Working on Nexus 🚀' },
    { id: uuidv7(), userId: bobId, content: 'Nice! Let me know if you need help testing.' },
    { id: uuidv7(), userId: aliceId, content: 'Will do, thanks!' },
  ]

  for (const msg of messages) {
    await prisma.message.create({
      data: {
        ...msg,
        conversationId,
      },
    })
  }

  console.log('✅ Seeded: 2 users, 1 DM conversation, 5 messages')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())