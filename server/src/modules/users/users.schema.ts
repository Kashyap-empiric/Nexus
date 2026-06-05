import { z } from "zod";

export const searchUsersQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(100),
});

export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
