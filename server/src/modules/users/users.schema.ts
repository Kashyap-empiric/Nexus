import { z } from "zod";

export const searchUsersQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
});

export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
