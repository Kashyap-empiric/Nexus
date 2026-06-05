import { z } from "zod";

export const conversationParamsSchema = z.object({
  id: z.uuid("Invalid conversation ID format"),
});

export const createConversationSchema = z.object({
  targetUserId: z.uuid("targetUserId must be a valid UUID"),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const markReadSchema = z.object({
  messageId: z.string().uuid("messageId must be a valid UUID"),
});

export type MarkReadInput = z.infer<typeof markReadSchema>;
