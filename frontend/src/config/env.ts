const env = {
  USE_MOCK: import.meta.env.VITE_USE_MOCK === 'true',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  REQUEST_TIMEOUT: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 10000,
  MODE: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

export default env;
