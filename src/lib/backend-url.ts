const DEFAULT_BACKEND_URL = 'https://zentalk-backend.onrender.com';

export function resolveBackendBase() {
  const configured = import.meta.env.VITE_API_URL;
  if (typeof window === 'undefined') return configured ?? DEFAULT_BACKEND_URL;

  if (!configured) return DEFAULT_BACKEND_URL;

  try {
    const url = new URL(configured);
    return url.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

export function buildBackendUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${resolveBackendBase()}${normalizedPath}`;
}

export function resolveSignalingBase() {
  const configured = import.meta.env.VITE_SIGNALING_SERVER_URL;
  if (typeof window === 'undefined') return configured ?? resolveBackendBase();

  if (!configured) return resolveBackendBase();

  try {
    const url = new URL(configured);
    return url.toString().replace(/\/$/, '');
  } catch {
    return resolveBackendBase();
  }
}
