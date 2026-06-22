import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db.js";
import { ENV } from "@/config/env.js";

const TOKEN_BYTES = 32;
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const HASH_ALGORITHM = "sha256";

function hashToken(token: string): string {
  return crypto.createHash(HASH_ALGORITHM).update(token).digest("hex");
}

function generateRawToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Generate a password reset token for a user.
 * Returns the raw token (to be included in the email link).
 * Only the hash is stored in the database.
 */
export async function generateResetToken(userId: string): Promise<string> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
    },
  });

  return rawToken;
}

/**
 * Verify a password reset token.
 * Returns the userId if valid, or null if the token is expired, used, or invalid.
 */
export async function verifyResetToken(
  token: string,
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null },
  });

  if (!record) return null;

  // Check expiry
  if (record.expiresAt < new Date()) {
    return null;
  }

  return { userId: record.userId };
}

/**
 * Complete a password reset: validate the token, update the password via Supabase Admin API,
 * and invalidate the token so it cannot be reused.
 */
export async function completePasswordReset(
  token: string,
  newPassword: string,
): Promise<void> {
  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null },
  });

  if (!record) {
    throw new Error("Invalid or expired reset token.");
  }

  if (record.expiresAt < new Date()) {
    throw new Error("Reset token has expired.");
  }

  // Use Supabase Admin API to update the password without requiring a session
  const supabaseAdmin = createClient(
    ENV.SUPABASE_URL,
    ENV.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(record.userId, {
      password: newPassword,
    });

  if (updateError) {
    console.error("[reset-password] Admin update failed:", updateError);
    throw new Error("Failed to update password. Please try again.");
  }

  // Invalidate the token (prevents reuse)
  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
}
