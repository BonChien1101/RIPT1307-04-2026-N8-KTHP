export const resolveApiHost = () => {
  const runtimeApiUrl = typeof window !== 'undefined' ? (window as any).__API_URL__ : undefined;
  const envApiUrl = (process.env as any).API_URL;

  if (runtimeApiUrl) return runtimeApiUrl;
  if (envApiUrl) return envApiUrl;
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return 'http://localhost:5000';
  }
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
};

export const getApiUrl = () => `${resolveApiHost()}/api`;