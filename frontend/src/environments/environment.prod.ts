export const environment = {
  production: true,
  apiUrl: (typeof window !== 'undefined' && (window as any).__FRONTDESK_API_URL__) || '/api',
};
