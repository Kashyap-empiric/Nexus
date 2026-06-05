/**
 * Application and API route definitions
 * Use these constants instead of hardcoding strings to ensure consistency across the application.
 */

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
} as const;

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
  },
} as const;
