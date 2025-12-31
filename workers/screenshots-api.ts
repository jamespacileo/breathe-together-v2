/**
 * Cloudflare Worker API for Screenshot Storage
 *
 * Endpoints:
 * - POST /api/screenshots - Upload a screenshot
 * - GET /api/screenshots/:id - Retrieve a screenshot
 * - GET /api/screenshots - List screenshots (with optional filters)
 * - DELETE /api/screenshots/:id - Delete a screenshot (requires auth)
 *
 * Storage: Cloudflare R2 bucket
 */

export interface Env {
  SCREENSHOTS_BUCKET: R2Bucket;
  // Optional: API key for protected operations
  API_KEY?: string;
}

interface ScreenshotMetadata {
  id: string;
  filename: string;
  prNumber?: number;
  viewport?: string;
  state?: string;
  timestamp: string;
  contentType: string;
  size: number;
}

/**
 * Generate a unique screenshot ID
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Build the R2 object key from metadata
 *
 * Key format: pr-{prNumber}/{viewport}-{state}.png
 * This creates predictable URLs for PR comments.
 * Falls back to timestamped keys for non-PR uploads.
 */
function buildKey(metadata: Partial<ScreenshotMetadata>): string {
  // For PR screenshots with viewport and state, use predictable naming
  if (metadata.prNumber && metadata.viewport && metadata.state) {
    return `pr-${metadata.prNumber}/${metadata.viewport}-${metadata.state}.png`;
  }

  // For other uploads, use folder structure with unique ID
  const parts: string[] = [];

  if (metadata.prNumber) {
    parts.push(`pr-${metadata.prNumber}`);
  }

  if (metadata.viewport) {
    parts.push(metadata.viewport);
  }

  if (metadata.state) {
    parts.push(metadata.state);
  }

  parts.push(metadata.id || generateId());

  return parts.join('/') + '.png';
}

/**
 * Parse the object key to extract metadata
 */
function parseKey(key: string): Partial<ScreenshotMetadata> {
  const parts = key.replace('.png', '').split('/');
  const result: Partial<ScreenshotMetadata> = {};

  for (const part of parts) {
    if (part.startsWith('pr-')) {
      result.prNumber = parseInt(part.replace('pr-', ''), 10);
    } else if (['desktop', 'tablet', 'mobile'].includes(part)) {
      result.viewport = part;
    } else if (['initial', 'animation', 'error'].includes(part)) {
      result.state = part;
    } else {
      result.id = part;
    }
  }

  return result;
}

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle preflight OPTIONS requests
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Verify API key for protected operations
 */
function verifyApiKey(request: Request, env: Env): boolean {
  if (!env.API_KEY) {
    // No API key configured, allow all operations
    return true;
  }

  const apiKey =
    request.headers.get('X-API-Key') ||
    request.headers.get('Authorization')?.replace('Bearer ', '');
  return apiKey === env.API_KEY;
}

/**
 * Upload a screenshot
 * POST /api/screenshots
 *
 * Body: Binary PNG data or multipart form
 * Headers:
 *   - X-PR-Number: PR number (optional)
 *   - X-Viewport: Viewport name (optional)
 *   - X-State: Screenshot state (optional)
 */
async function handleUpload(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get('Content-Type') || '';

  let imageData: ArrayBuffer;
  let prNumber: number | undefined;
  let viewport: string | undefined;
  let state: string | undefined;
  let filename: string | undefined;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    imageData = await file.arrayBuffer();
    filename = file.name;
    prNumber = formData.has('prNumber')
      ? parseInt(formData.get('prNumber') as string, 10)
      : undefined;
    viewport = (formData.get('viewport') as string) || undefined;
    state = (formData.get('state') as string) || undefined;
  } else {
    // Binary upload
    imageData = await request.arrayBuffer();
    prNumber = request.headers.has('X-PR-Number')
      ? parseInt(request.headers.get('X-PR-Number')!, 10)
      : undefined;
    viewport = request.headers.get('X-Viewport') || undefined;
    state = request.headers.get('X-State') || undefined;
    filename = request.headers.get('X-Filename') || undefined;
  }

  if (imageData.byteLength === 0) {
    return new Response(JSON.stringify({ error: 'Empty file' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate it's a PNG (magic bytes: 89 50 4E 47)
  const header = new Uint8Array(imageData.slice(0, 4));
  if (header[0] !== 0x89 || header[1] !== 0x50 || header[2] !== 0x4e || header[3] !== 0x47) {
    return new Response(JSON.stringify({ error: 'Invalid PNG file' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const id = generateId();
  const metadata: ScreenshotMetadata = {
    id,
    filename: filename || `${id}.png`,
    prNumber,
    viewport,
    state,
    timestamp: new Date().toISOString(),
    contentType: 'image/png',
    size: imageData.byteLength,
  };

  const key = buildKey(metadata);

  await env.SCREENSHOTS_BUCKET.put(key, imageData, {
    httpMetadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      prNumber: prNumber?.toString() || '',
      viewport: viewport || '',
      state: state || '',
      timestamp: metadata.timestamp,
      filename: metadata.filename,
    },
  });

  const response: ScreenshotMetadata & { key: string; url: string } = {
    ...metadata,
    key,
    url: `/api/screenshots/${encodeURIComponent(key)}`,
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Retrieve a screenshot
 * GET /api/screenshots/:key
 */
async function handleGet(key: string, env: Env): Promise<Response> {
  const object = await env.SCREENSHOTS_BUCKET.get(key);

  if (!object) {
    return new Response(JSON.stringify({ error: 'Screenshot not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', object.etag);

  if (object.customMetadata) {
    headers.set('X-PR-Number', object.customMetadata.prNumber || '');
    headers.set('X-Viewport', object.customMetadata.viewport || '');
    headers.set('X-State', object.customMetadata.state || '');
    headers.set('X-Timestamp', object.customMetadata.timestamp || '');
  }

  return new Response(object.body, { headers });
}

/**
 * List screenshots
 * GET /api/screenshots?pr=123&viewport=desktop
 */
async function handleList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const prNumber = url.searchParams.get('pr');
  const viewport = url.searchParams.get('viewport');
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);
  const cursor = url.searchParams.get('cursor') || undefined;

  // Build prefix for filtering
  let prefix = '';
  if (prNumber) {
    prefix = `pr-${prNumber}/`;
    if (viewport) {
      prefix += `${viewport}/`;
    }
  }

  const listResult = await env.SCREENSHOTS_BUCKET.list({
    prefix,
    limit,
    cursor,
  });

  const screenshots = listResult.objects.map((obj: R2Object) => {
    const metadata = parseKey(obj.key);
    return {
      key: obj.key,
      url: `/api/screenshots/${encodeURIComponent(obj.key)}`,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
      ...metadata,
      ...obj.customMetadata,
    };
  });

  return new Response(
    JSON.stringify({
      screenshots,
      truncated: listResult.truncated,
      cursor: listResult.truncated ? listResult.cursor : undefined,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

/**
 * Delete a screenshot
 * DELETE /api/screenshots/:key
 */
async function handleDelete(key: string, request: Request, env: Env): Promise<Response> {
  if (!verifyApiKey(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  await env.SCREENSHOTS_BUCKET.delete(key);

  return new Response(JSON.stringify({ deleted: key }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Delete all screenshots for a PR
 * DELETE /api/screenshots?pr=123
 */
async function handleBulkDelete(request: Request, env: Env): Promise<Response> {
  if (!verifyApiKey(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const prNumber = url.searchParams.get('pr');

  if (!prNumber) {
    return new Response(JSON.stringify({ error: 'PR number required for bulk delete' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const prefix = `pr-${prNumber}/`;
  const listResult = await env.SCREENSHOTS_BUCKET.list({ prefix });

  const keys = listResult.objects.map((obj: R2Object) => obj.key);

  if (keys.length > 0) {
    await env.SCREENSHOTS_BUCKET.delete(keys);
  }

  return new Response(JSON.stringify({ deleted: keys.length, keys }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Main request handler
 */
export async function handleScreenshotRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Only handle /api/screenshots routes
  if (!path.startsWith('/api/screenshots')) {
    return null;
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  // Extract key from path (everything after /api/screenshots/)
  const keyMatch = path.match(/^\/api\/screenshots\/(.+)$/);
  const key = keyMatch ? decodeURIComponent(keyMatch[1]) : null;

  switch (request.method) {
    case 'POST':
      return handleUpload(request, env);

    case 'GET':
      if (key) {
        return handleGet(key, env);
      }
      return handleList(request, env);

    case 'DELETE':
      if (key) {
        return handleDelete(key, request, env);
      }
      return handleBulkDelete(request, env);

    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }
}
