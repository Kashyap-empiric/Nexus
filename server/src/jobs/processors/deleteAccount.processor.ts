import { prisma } from "@/lib/db.js";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "@/config/env.js";
import type { DeleteAccountJob } from "@/jobs/types.js";

const supabaseAdmin = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export const processDeleteAccount = async (data: DeleteAccountJob): Promise<void> => {
  const { userId } = data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, avatarPath: true },
  });

  if (!user) {
    console.log(`[DeleteAccount] User ${userId} already deleted, skipping.`);
    return;
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    console.error(`[DeleteAccount] Failed to delete Supabase auth user ${userId}:`, authError);
    throw authError;
  }

  console.log(`[DeleteAccount] Account deletion complete for user ${userId}`);
};
