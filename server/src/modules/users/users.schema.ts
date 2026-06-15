import * as z from "zod";

export const searchUsersQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
});

export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;

export const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  displayName: z.string().max(50).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isOnboarded: z.boolean().optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
