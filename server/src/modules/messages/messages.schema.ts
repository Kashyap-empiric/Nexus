import * as z from "zod";

export const getMessagesQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const messageParamsSchema = z.object({
  conversationId: z.uuid(),
});

export const messageIdParamsSchema = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid(),
});

export const createMessageBodySchema = z.object({
  content: z.string().trim().min(1, { message: "Message cannot be empty" }).max(2000, { message: "Message is too long" }),
  replyToId: z.uuid().optional(),
});

export const updateMessageBodySchema = z.object({
  content: z.string().trim().min(1, { message: "Message cannot be empty" }).max(2000, { message: "Message is too long" }),
});

export const searchMessagesQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const pinsParamsSchema = z.object({
  conversationId: z.uuid(),
});

export const pinsIdParamsSchema = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid(),
});

export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;
export type CreateMessageBody = z.infer<typeof createMessageBodySchema>;
export type UpdateMessageBody = z.infer<typeof updateMessageBodySchema>;
export type SearchMessagesQuery = z.infer<typeof searchMessagesQuerySchema>;
