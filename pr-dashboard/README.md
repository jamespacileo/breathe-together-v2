# PR Tracking Dashboard

A Cloudflare Worker-based dashboard for tracking open PRs from Claude Code agents with real-time updates and web notifications.

## Features

- **Real-time PR Updates**: WebSocket-based live updates when PRs change
- **Useful Quick Links** per PR:
  - GitHub PR page
  - Cloudflare Pages preview URL
  - Cloudflare Workers dashboard
  - Claude Code web session link
- **Time Tracking**: Shows "X minutes ago" since last update
- **PR Status**: Draft, review requested, approved, changes requested
- **CI Status**: Pending, passed, failed
- **Web Push Notifications**: Get notified on new PRs, review requests, approvals

## Quick Start

### 1. Install Dependencies

```bash
cd pr-dashboard
npm install
```

### 2. Create KV Namespace

```bash
npx wrangler kv:namespace create PR_CACHE
npx wrangler kv:namespace create PR_CACHE --preview
```

Update `wrangler.toml` with the returned IDs.

### 3. Set Required Secrets

```bash
# GitHub Personal Access Token (needs repo scope)
npx wrangler secret put GITHUB_TOKEN

# Webhook secret (generate a random string)
npx wrangler secret put GITHUB_WEBHOOK_SECRET

# Your Cloudflare account ID (for dashboard links)
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
```

### 4. (Optional) Set Up Web Push Notifications

```bash
# Generate VAPID keys
npm run generate-vapid

# Set the keys as secrets
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
```

### 5. Deploy

```bash
npm run deploy
```

### 6. Configure GitHub Webhook

1. Go to your GitHub repository → Settings → Webhooks → Add webhook
2. Set Payload URL to: `https://pr-tracking-dashboard.<your-account>.workers.dev/webhook/github`
3. Set Content type to: `application/json`
4. Set Secret to: (same value as GITHUB_WEBHOOK_SECRET)
5. Select events:
   - Pull requests
   - Pull request reviews
   - Check runs
6. Save

## Development

```bash
npm run dev
```

Opens local server at http://localhost:8788

## Configuration

Edit `wrangler.toml` to configure:

```toml
[vars]
GITHUB_OWNER = "your-org"
GITHUB_REPO = "your-repo"
CLOUDFLARE_PROJECT = "your-pages-project"
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard HTML |
| `/api/prs` | GET | List open PRs |
| `/api/refresh` | POST | Force refresh PRs |
| `/api/ws` | GET | WebSocket upgrade |
| `/api/config` | GET | Dashboard configuration |
| `/api/stats` | GET | Connection statistics |
| `/webhook/github` | POST | GitHub webhook receiver |
| `/api/push/subscribe` | POST | Register push subscription |
| `/api/push/unsubscribe` | POST | Remove push subscription |

## URL Patterns

### Preview URLs
Branch names are normalized for Cloudflare Pages:
- `feature/add-login` → `feature-add-login.your-project.pages.dev`
- `claude/fix-bug-123` → `claude-fix-bug-123.your-project.pages.dev`

### Claude Code Web
Links to Claude Code web with repo context:
```
https://claude.ai/code?repo=owner/repo&branch=branch-name
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Cloudflare Worker                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────┐    ┌─────────────────┐              │
│  │ GitHub API │◀──▶│  Durable Object │              │
│  │  (GraphQL) │    │   (PRTracker)   │              │
│  └────────────┘    └────────┬────────┘              │
│                             │                        │
│  ┌────────────┐    ┌────────▼────────┐              │
│  │  KV Store  │    │   WebSocket     │              │
│  │ (cache/sub)│    │   Connections   │              │
│  └────────────┘    └─────────────────┘              │
│                                                      │
└─────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   ┌──────────┐        ┌──────────────┐
   │  GitHub  │        │   Browser    │
   │ Webhooks │        │  Dashboard   │
   └──────────┘        └──────────────┘
```

## Cost Estimate

Based on Cloudflare Workers pricing (as of 2025):

| Usage | Monthly Cost |
|-------|--------------|
| 100k requests | $0 (free tier) |
| 1M requests | ~$5 |
| Durable Objects | ~$0.15/million requests |
| KV reads/writes | Included in free tier |

## Security

- GitHub webhook signatures verified using HMAC SHA-256
- VAPID authentication for web push
- GitHub token stored as encrypted secret
- CORS headers for cross-origin requests

## Troubleshooting

### PRs not updating
1. Check GitHub webhook delivery in repo settings
2. Verify webhook secret matches
3. Check worker logs: `npx wrangler tail`

### WebSocket disconnects
- Dashboard auto-reconnects with exponential backoff
- Falls back to REST polling if WebSocket fails

### Push notifications not working
1. Verify VAPID keys are set
2. Check browser permissions
3. Ensure HTTPS (required for push)

## License

MIT
