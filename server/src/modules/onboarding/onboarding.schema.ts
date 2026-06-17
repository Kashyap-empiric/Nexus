import { z } from "zod";

export const completeOnboardingSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  bio: z.string().max(500).optional(),
  avatarPath: z.string().optional(),
  skipWorkspace: z.boolean().optional(),
  workspaceName: z.string().max(50).optional(),
  workspaceSlug: z.string()
    .max(50)
    .regex(/^[a-z0-9-]*$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional(),
  workspaceDescription: z.string().max(500).optional(),
  workspaceIconPath: z.string().optional(),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
