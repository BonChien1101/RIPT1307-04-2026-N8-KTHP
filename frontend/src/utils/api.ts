export const resolveApiHost = () => {
  const runtimeApiUrl = typeof window !== 'undefined' ? (window as any).__API_URL__ : undefined;
  const envApiUrl = (process.env as any).API_URL;

  const isLocalHost = () => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location?.hostname || '';
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '';
  };

  if (runtimeApiUrl) return runtimeApiUrl;

  if (isLocalHost()) {
    return 'http://localhost:5000';
  }

  if (envApiUrl) return envApiUrl;
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
};

export const getApiUrl = () => `${resolveApiHost()}/api`;