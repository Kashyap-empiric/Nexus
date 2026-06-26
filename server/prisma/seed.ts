import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { uuidv7 } from 'uuidv7'
import 'dotenv/config'
import { ENV } from '@/config/env.js'
import { prisma } from '@/lib/db'

if (!ENV.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required to run the seed script')
  process.exit(1)
}

const supabase = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
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

  const alice = await prisma.user.findUnique({ where: { id: aliceId }, select: { username: true, avatarUrl: true } });
  const bob = await prisma.user.findUnique({ where: { id: bobId }, select: { username: true, avatarUrl: true } });

  const messages = [
    { id: uuidv7(), userId: aliceId, content: 'Hey Bob! How are you?', displayNameSnapshot: alice!.username, avatarSnapshot: alice?.avatarUrl ?? null },
    { id: uuidv7(), userId: bobId, content: 'Hey Alice! Doing great, you?', displayNameSnapshot: bob!.username, avatarSnapshot: bob?.avatarUrl ?? null },
    { id: uuidv7(), userId: aliceId, content: 'Pretty good! Working on Nexus 🚀', displayNameSnapshot: alice!.username, avatarSnapshot: alice?.avatarUrl ?? null },
    { id: uuidv7(), userId: bobId, content: 'Nice! Let me know if you need help testing.', displayNameSnapshot: bob!.username, avatarSnapshot: bob?.avatarUrl ?? null },
    { id: uuidv7(), userId: aliceId, content: 'Will do, thanks!', displayNameSnapshot: alice!.username, avatarSnapshot: alice?.avatarUrl ?? null },
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
