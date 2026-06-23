import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "@/lib/db.js";
import { ENV } from "@/config/env.js";
import { generateResetToken, verifyResetToken, completePasswordReset } from "./reset-password.service.js";
import { sendPasswordResetEmail } from "@/lib/email.js";
import { emailQueue } from "@/jobs/queues.js";
import type { SendPasswordResetData } from "@/jobs/types.js";

const router = Router();

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const completeResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

/**
 * POST /api/auth/forgot-password
 *
 * Accepts an email, generates a reset token, and sends a password reset email.
 * Always returns 200 to prevent email enumeration.
 */
router.post(
  "/auth/forgot-password",
  // Note: generalLimiter is already applied globally in app.ts
  async (req: Request, res: Response): Promise<void> => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(200).json({ message: "If that email exists, a reset link has been sent." });
      return;
    }

    const { email } = parsed.data;

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        const rawToken = await generateResetToken(user.id);
        const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${rawToken}`;

        if (emailQueue) {
          const jobData: SendPasswordResetData = {
            type: "password_reset",
            to: email,
            resetUrl,
          };
          await emailQueue.add("send-email", jobData);
        } else {
          await sendPasswordResetEmail({
            to: email,
            resetUrl,
          });
        }
      }

      // Always return the same message regardless of whether the user exists
      res.status(200).json({
        message: "If that email exists, a reset link has been sent.",
      });
    } catch (error) {
      console.error("[reset-password] forgot-password error:", error);
      res.status(200).json({
        message: "If that email exists, a reset link has been sent.",
      });
    }
  },
);

/**
 * GET /api/auth/reset-password/verify?token=xxx
 *
 * Validates a password reset token.
 * Returns { valid: true, email } if the token is valid, or { valid: false } otherwise.
 */
router.get(
  "/auth/reset-password/verify",
  async (req: Request, res: Response): Promise<void> => {
    const token = req.query.token as string | undefined;

    if (!token) {
      res.status(400).json({ valid: false, error: "Token is required." });
      return;
    }

    try {
      const result = await verifyResetToken(token);

      if (!result) {
        res.json({ valid: false });
        return;
      }

      // Look up the user's email for display purposes
      const user = await prisma.user.findUnique({
        where: { id: result.userId },
        select: { email: true },
      });

      res.json({ valid: true, email: user?.email ?? null });
    } catch (error) {
      console.error("[reset-password] verify error:", error);
      res.json({ valid: false });
    }
  },
);

/**
 * POST /api/auth/reset-password/complete
 *
 * Accepts a token and new password, updates the password via Supabase Admin API,
 * and invalidates the token.
 */
router.post(
  "/auth/reset-password/complete",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = completeResetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request. Token and password (min 8 chars) are required.",
      });
      return;
    }

    const { token, newPassword } = parsed.data;

    try {
      await completePasswordReset(token, newPassword);

      res.json({ success: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reset password.";
      console.error("[reset-password] complete error:", message);
      res.status(400).json({ error: message });
    }
  },
);

export default router;
