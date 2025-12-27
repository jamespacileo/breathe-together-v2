// Breathe Together API - Cloudflare Worker
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { VALID_MOODS } from '../shared/constants';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware - allow same-origin and configured origins
app.use(
	'/api/*',
	cors({
		origin: (origin) => {
			// Allow same-origin requests (origin will be null or match)
			if (!origin) return origin;
			// Allow localhost for development
			if (origin.includes('localhost') || origin.includes('127.0.0.1'))
				return origin;
			// Allow the deployed domain
			if (origin.includes('breathe-together')) return origin;
			// Reject unknown origins
			return null;
		},
		allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type'],
		maxAge: 86400,
	}),
);

// Presence data structure stored in KV
interface PresenceEntry {
	mood?: string;
	timestamp: number;
}

// Session ID validation: alphanumeric, dashes, underscores, 8-64 chars
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;

function isValidSessionId(sessionId: unknown): sessionId is string {
	return typeof sessionId === 'string' && SESSION_ID_REGEX.test(sessionId);
}

function isValidMood(mood: unknown): mood is string | undefined {
	return (
		mood === undefined || (typeof mood === 'string' && VALID_MOODS.has(mood))
	);
}

// Validate that parsed data is an array of numbers
function isNumberArray(data: unknown): data is number[] {
	return Array.isArray(data) && data.every((item) => typeof item === 'number');
}

// Simple rate limiting using KV
// Returns true if request should be allowed, false if rate limited
async function checkRateLimit(
	kv: KVNamespace,
	key: string,
	maxRequests: number,
	windowSeconds: number,
): Promise<boolean> {
	const rateLimitKey = `ratelimit:${key}`;
	const now = Math.floor(Date.now() / 1000);
	const windowStart = now - windowSeconds;

	const existing = await kv.get(rateLimitKey);
	let timestamps: number[] = [];

	if (existing) {
		try {
			const parsed: unknown = JSON.parse(existing);
			// Validate that parsed data is actually an array of numbers
			if (isNumberArray(parsed)) {
				// Filter to only timestamps within the window
				timestamps = parsed.filter((t) => t > windowStart);
			}
		} catch {
			timestamps = [];
		}
	}

	if (timestamps.length >= maxRequests) {
		return false;
	}

	timestamps.push(now);
	await kv.put(rateLimitKey, JSON.stringify(timestamps), {
		expirationTtl: windowSeconds + 10,
	});

	return true;
}

// Heartbeat endpoint - register/refresh presence
app.post('/api/heartbeat', async (c) => {
	try {
		const body = await c.req.json<{ sessionId: string; mood?: string }>();
		const { sessionId, mood } = body;

		// Validate sessionId format
		if (!isValidSessionId(sessionId)) {
			return c.json(
				{ error: 'Invalid sessionId: must be 8-64 alphanumeric characters' },
				400,
			);
		}

		// Validate mood if provided
		if (!isValidMood(mood)) {
			return c.json({ error: 'Invalid mood value' }, 400);
		}

		// Rate limit: max 10 heartbeats per minute per session
		const allowed = await checkRateLimit(
			c.env.PRESENCE,
			`heartbeat:${sessionId}`,
			10,
			60,
		);
		if (!allowed) {
			return c.json({ error: 'Rate limit exceeded' }, 429);
		}

		const entry: PresenceEntry = {
			mood,
			timestamp: Date.now(),
		};

		// Store with 60 second TTL - user must heartbeat every 30s to stay active
		await c.env.PRESENCE.put(`user:${sessionId}`, JSON.stringify(entry), {
			expirationTtl: 60,
		});

		return c.json({ success: true });
	} catch (error) {
		console.error('Heartbeat error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Get presence count and aggregated mood data
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: KV pagination with nested batch processing
app.get('/api/presence', async (c) => {
	try {
		// Paginate through all active users to get accurate count and mood data
		const moodCounts: Record<string, number> = {};
		let totalCount = 0;
		let cursor: string | undefined;

		// Paginate through all keys (KV list returns max 1000 per call)
		do {
			const listResult = await c.env.PRESENCE.list({
				prefix: 'user:',
				cursor,
				limit: 1000,
			});

			totalCount += listResult.keys.length;

			// Fetch mood data in batches of 100 for performance
			const batchSize = 100;
			for (let i = 0; i < listResult.keys.length; i += batchSize) {
				const batch = listResult.keys.slice(i, i + batchSize);
				const values = await Promise.all(
					batch.map((key) => c.env.PRESENCE.get(key.name)),
				);

				for (const value of values) {
					if (value) {
						try {
							const entry = JSON.parse(value) as PresenceEntry;
							if (entry.mood && VALID_MOODS.has(entry.mood)) {
								moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
							}
						} catch {
							// Ignore invalid entries
						}
					}
				}
			}

			cursor = listResult.list_complete ? undefined : listResult.cursor;
		} while (cursor);

		return c.json({
			count: totalCount,
			moods: moodCounts,
		});
	} catch (error) {
		console.error('Presence error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Leave endpoint - cleanup presence
app.delete('/api/presence', async (c) => {
	try {
		const body = await c.req.json<{ sessionId: string }>();
		const { sessionId } = body;

		// Validate sessionId format
		if (!isValidSessionId(sessionId)) {
			return c.json(
				{ error: 'Invalid sessionId: must be 8-64 alphanumeric characters' },
				400,
			);
		}

		await c.env.PRESENCE.delete(`user:${sessionId}`);

		return c.json({ success: true });
	} catch (error) {
		console.error('Leave error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Health check
app.get('/api/', (c) => c.json({ name: 'Breathe Together', status: 'ok' }));

export default app;
