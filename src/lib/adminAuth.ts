import { STORAGE_KEYS } from '../constants/storageKeys';

const STORAGE_KEY = STORAGE_KEYS.ADMIN_TOKEN;

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export function getAdminToken(): string | null {
  const envToken = import.meta.env.VITE_ADMIN_TOKEN;
  if (envToken) return envToken;
  if (typeof window === 'undefined') return null;
  return readStoredToken();
}

export function ensureAdminToken(): string | null {
  const existing = getAdminToken();
  if (existing) return existing;
  if (typeof window === 'undefined') return null;

  const entered = prompt('Enter admin token:');
  const token = entered?.trim();
  if (!token) return null;

  storeToken(token);
  return token;
}

export function adminAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
