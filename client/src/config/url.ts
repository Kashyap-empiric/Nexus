

export const API_ROUTES = {
  AUTH: {
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD_VERIFY: '/auth/reset-password/verify',
    RESET_PASSWORD_COMPLETE: '/auth/reset-password/complete',
  },
  USERS: {
    SEARCH: (query: string) => `/users/search?q=${encodeURIComponent(query)}`,
    ME: '/users/me',
    PROFILE: (id: string) => `/users/${id}`,
    AVATAR: '/users/me/avatar',
    STATUS: '/users/me/status',
    CHECK_USERNAME: (username: string) => `/users/check-username?username=${encodeURIComponent(username)}`,
    RESOLVE_USERNAME: '/users/resolve-username',
    DELETE_ACCOUNT: '/users/me',
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
    THREAD: (conversationId: string, messageId: string) => `/conversations/${conversationId}/messages/${messageId}/thread`,
    THREAD_FOLLOW: (conversationId: string, messageId: string) => `/conversations/${conversationId}/messages/${messageId}/thread/follow`,
    THREAD_NOTIFICATIONS: (conversationId: string, messageId: string) => `/conversations/${conversationId}/messages/${messageId}/thread/notifications`,
    THREADS: (conversationId: string) => `/conversations/${conversationId}/threads`,
    PINS: (conversationId: string) => `/conversations/${conversationId}/pins`,
    PIN_DETAIL: (conversationId: string, messageId: string) => `/conversations/${conversationId}/pins/${messageId}`,
  },
  INVITES: {
    INFO: '/invites/info',
    RESOLVE: '/invites/resolve',
    GENERATE: '/invites/generate',
    DECLINE: '/invites/decline',
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    PREFERENCES: '/notifications/preferences',
    PUSH_SUBSCRIBE: '/notifications/push/subscribe',
    PUSH_UNSUBSCRIBE: '/notifications/push/subscribe',
  },
  ONBOARDING: {
    COMPLETE: '/onboarding/complete',
  },
  MESSAGES: {
    SEARCH: (query: string) => `/messages/search?q=${encodeURIComponent(query)}`,
  },
  WORKSPACES: {
    THREADS: (workspaceId: string) => `/workspaces/${workspaceId}/threads`,
  },
  CHANNEL_MEMBERS: (workspaceId: string, channelId: string) =>
    `/workspaces/${workspaceId}/channels/${channelId}/members`,
  CHANNEL_MEMBER: (workspaceId: string, channelId: string, userId: string) =>
    `/workspaces/${workspaceId}/channels/${channelId}/members/${userId}`,
} as const;


export const APP_ROUTES = {
  HOME: '/',
  AUTH: {
    INDEX: '/auth',
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    CALLBACK: '/auth/callback',
  },
  CONVERSATIONS: {
    INDEX: '/conversations',
    DETAIL: (id: string | number) => `/conversations/${id}`,
  },
  INVITE: {
    INDEX: '/invite',
  },
  WORKSPACES: {
    CHANNELS_PATH: '/channels',
    CHANNEL: (workspaceId: string, channelId: string) => `/workspaces/${workspaceId}/channels/${channelId}`,
  },
  NOTIFICATIONS: {
    INDEX: '/notifications',
  },
  SETTINGS: {
    INDEX: '/settings',
    NOTIFICATIONS: '/settings/notifications',
  },
} as const;