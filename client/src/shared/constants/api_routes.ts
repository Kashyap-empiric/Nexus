export const API_ROUTES = {
  USERS: {
    SEARCH: (query: string) => `/users/search?q=${encodeURIComponent(query)}`,
  },
  CONVERSATIONS: {
    BASE: '/conversations',
    DETAIL: (id: string) => `/conversations/${id}`,
    READ: (id: string) => `/conversations/${id}/read`,
    MESSAGES: (conversationId: string, cursor?: string | null) => {
      const baseUrl = `/conversations/${conversationId}/messages`;
      return cursor ? `${baseUrl}?cursor=${cursor}` : baseUrl;
    },
    MESSAGE_DETAIL: (conversationId: string, messageId: string) => `/conversations/${conversationId}/messages/${messageId}`,
  },
  INVITES: {
    RESOLVE: '/invites/resolve',
    GENERATE: '/invites/generate',
  },
} as const;
