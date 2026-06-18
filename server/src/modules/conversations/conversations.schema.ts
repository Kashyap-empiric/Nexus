import * as z from "zod";

export const conversationParamsSchema = z.object({
  id: z.uuid(),
});

export const createConversationSchema = z.object({
  targetUserId: z.uuid(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const markReadSchema = z.object({
  messageId: z.uuid(),
});

export type MarkReadInput = z.infer<typeof markReadSchema>;
