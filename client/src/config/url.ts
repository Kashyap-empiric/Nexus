// ──────────────────────────────────────────────────────────────
// URL Routes Configuration
// ──────────────────────────────────────────────────────────────
// 📌 AGENT INSTRUCTION: If you are adding, modifying, or removing
//    any URL route (API endpoints or app page paths), make sure
//    to update this file. This is the single source of truth for
//    all route strings used across the client codebase.
//
//    - API_ROUTES: Backend API endpoint paths (prefixed by proxy)
//    - APP_ROUTES: Frontend Next.js page paths
// ──────────────────────────────────────────────────────────────

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
  NOTIFICATIONS: {
    BASE: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    PREFERENCES: '/notifications/preferences',
    PUSH_SUBSCRIBE: '/notifications/push/subscribe',
    PUSH_UNSUBSCRIBE: (id: string) => `/notifications/push/subscribe/${id}`,
  },
} as const;


export const APP_ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
  },
  CONVERSATIONS: {
    INDEX: '/conversations',
    DETAIL: (id: string | number) => `/conversations/${id}`,
  },
  NOTIFICATIONS: {
    INDEX: '/notifications',
  },
  SETTINGS: {
    NOTIFICATIONS: '/settings/notifications',
  },
} as const;