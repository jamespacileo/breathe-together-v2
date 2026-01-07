function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return null;
  const trimmed = token?.trim();
  return trimmed ? trimmed : null;
}

function isLocalhostUrl(url: URL): boolean {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

/**
 * Admin authorization.
 *
 * Production: requires `ADMIN_TOKEN` to be set and matched.
 * Local dev: if `ADMIN_TOKEN` is unset, admin endpoints are allowed on localhost only.
 */
export function isAdminAuthorized(request: Request, env: Record<string, unknown>): boolean {
  const configuredToken = typeof env.ADMIN_TOKEN === 'string' ? env.ADMIN_TOKEN.trim() : '';

  const provided =
    extractBearerToken(request.headers.get('Authorization')) ||
    request.headers.get('X-Admin-Token')?.trim() ||
    null;

  if (configuredToken) {
    return provided === configuredToken;
  }

  // Dev convenience: allow admin without a token only on localhost.
  return isLocalhostUrl(new URL(request.url));
}

export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
