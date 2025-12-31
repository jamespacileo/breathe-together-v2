# Breathe Together - Presence API Worker

A minimal Cloudflare Worker backend for real-time presence tracking.

## Features

- **Anonymous sessions**: UUID-based session tracking (no PII)
- **Mood tracking**: Users can set their current mood (gratitude, presence, release, connection)
- **Auto-expiry**: Sessions expire after 30 seconds without heartbeat
- **Low cost**: Simple KV storage, no WebSockets or Durable Objects needed

## API Endpoints

### `POST /api/heartbeat`

Send a presence heartbeat. Returns current presence state.

```json
{
  "sessionId": "uuid-string",
  "mood": "presence"
}
```

Response:
```json
{
  "count": 42,
  "moods": {
    "gratitude": 10,
    "presence": 15,
    "release": 10,
    "connection": 7
  },
  "timestamp": 1704067200000
}
```

### `GET /api/presence`

Get current presence state (read-only).

### `POST /api/leave`

Signal that a user is leaving (explicit cleanup).

```json
{
  "sessionId": "uuid-string"
}
```

## Setup

1. Create a KV namespace:
   ```bash
   wrangler kv:namespace create PRESENCE_KV
   ```

2. Copy the namespace ID to `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "PRESENCE_KV"
   id = "your-namespace-id-here"
   ```

3. For local development, also create a preview namespace:
   ```bash
   wrangler kv:namespace create PRESENCE_KV --preview
   ```

## Development

```bash
# Run locally
npm run worker:dev

# Type check
npm run worker:typecheck

# Deploy
npm run worker:deploy
```

## Architecture

```
Client (Browser)
    │
    │ HTTP Poll every 10s
    ▼
Cloudflare Worker (Edge)
    │
    │ Read/Write
    ▼
Cloudflare KV
    └── presence:sessions → { sessionId: { mood, lastSeen }, ... }
```

## Cost Considerations

- **KV reads**: 10 million free/month, then $0.50/million
- **KV writes**: 1 million free/month, then $5/million
- **Worker requests**: 100,000 free/day, then $0.50/million

With 100 concurrent users polling every 10 seconds:
- ~864,000 requests/day (within free tier)
- ~864,000 KV reads/day + 864,000 writes/day

For higher scale, consider:
- Durable Objects for real-time WebSocket connections
- Longer heartbeat intervals (30-60 seconds)
- Edge caching for presence reads
