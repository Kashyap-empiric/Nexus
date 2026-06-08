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