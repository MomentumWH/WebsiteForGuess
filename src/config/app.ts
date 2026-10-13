export const appConfig = {
  title: import.meta.env.VITE_APP_TITLE?.trim() || 'WebsiteForGuess Admin',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  useMock: import.meta.env.VITE_USE_MOCK === 'true',
  homePath: '/admin/dashboard',
  loginPath: '/login',
} as const
