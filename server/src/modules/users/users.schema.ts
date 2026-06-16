import * as z from "zod";

export const searchUsersQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
});

export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;

export const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  fullName: z.string().max(80).nullable().optional(),
  bio: z.string().max(160).nullable().optional(),
  isOnboarded: z.boolean().optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;

export const updateAvatarSchema = z.object({
  avatarPath: z.string().nullable().refine((path) => {
    if (!path) return true;
    if (path.includes('..')) return false;
    if (/^https?:\/\//.test(path)) return false;
    return true;
  }, { message: "Invalid avatar path" })
});

export type UpdateAvatarBody = z.infer<typeof updateAvatarSchema>;

export const updateStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "AWAY", "DND", "INVISIBLE"]),
  statusText: z.string().max(100).nullable().optional(),
});

export type UpdateStatusBody = z.infer<typeof updateStatusSchema>;
