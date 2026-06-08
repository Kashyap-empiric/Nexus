export const queryKeys = {
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversations", id] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
  usersSearch: (query: string) => ["users", "search", query] as const,
};
