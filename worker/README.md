# Breathe Together - Presence API Worker

Cloudflare Worker backend for presence + inspirational text (KV + Durable Objects).

## Features

- **Anonymous sessions**: UUID-based session tracking (no PII)
- **Mood tracking**: gratitude / presence / release / connection
- **Hybrid presence**:
  - KV sampling for low-traffic / cheap polling
  - Durable Object WebSocket room for realtime presence at scale
- **Inspirational text**: globally-synchronized rotation + optional admin overrides
- **Admin protection**: set `ADMIN_TOKEN` to protect `/admin/*` endpoints (recommended for any non-local deploy)

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

### `GET /api/inspirational`

Get the current inspirational message. Optional query params:

- `sessionId=<id>`: returns a per-user override if one exists
- `skipCache=true`: disables caching for debugging

### Admin Endpoints (`/admin/*`)

Admin endpoints require `ADMIN_TOKEN` (or will only work on `localhost` when unset):

- `GET /admin/users`, `GET /admin/events`, `GET /admin/stats`
- `GET /admin/inspirational`
- `POST /admin/inspirational/override`
- `POST /admin/inspirational/generate`
- `POST /admin/inspirational/message`

## Setup

### Local Development

1. Create KV namespaces:
   ```bash
   cd worker
   wrangler kv:namespace create PRESENCE_KV
   wrangler kv:namespace create PRESENCE_KV --preview
   ```

2. Copy the namespace IDs to `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "PRESENCE_KV"
   id = "your-production-namespace-id"
   preview_id = "your-preview-namespace-id"
   ```

### GitHub Actions Deployment

The workflows automatically deploy the worker. You need to add these secrets:

1. Go to **Settings → Secrets and variables → Actions** in your GitHub repo

2. Add the following secrets:
   - `CLOUDFLARE_API_TOKEN` - API token with Workers edit permissions
   - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
   - `PRESENCE_KV_ID` - Production KV namespace ID (from step 1)
   - `PRESENCE_KV_PREVIEW_ID` - Preview KV namespace ID (from step 1)

3. To create a Cloudflare API token:
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create token with "Edit Cloudflare Workers" template
   - Or custom: Zone:Workers Scripts:Edit, Account:Workers KV Storage:Edit

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
