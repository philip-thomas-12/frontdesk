export const environment = {
  production: false,
  apiUrl: (typeof window !== 'undefined' && (window as any).__FRONTDESK_API_URL__) || 'http://localhost:5001/api',
};
