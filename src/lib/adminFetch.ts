import { adminAuthHeaders } from './adminAuth';

export async function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const auth = adminAuthHeaders();
  for (const [k, v] of Object.entries(auth)) headers.set(k, String(v));
  return fetch(url, { ...init, headers });
}
