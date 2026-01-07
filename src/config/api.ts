function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

/**
 * Presence API base URL.
 *
 * - Default: same-origin (works with Vite proxy in dev, and Assets+Worker in prod)
 * - Override: `VITE_PRESENCE_API_URL`
 */
export function getPresenceApiBaseUrl(): string {
  const configured = import.meta.env.VITE_PRESENCE_API_URL;
  if (configured) return normalizeBaseUrl(configured);

  if (typeof window !== 'undefined') {
    return normalizeBaseUrl(window.location.origin);
  }

  return 'http://localhost:8787';
}
