# PR Tracking Dashboard - Implementation Plan

A Cloudflare Worker-based dashboard to track open PRs from Claude Code agents with real-time updates and web notifications.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PR Tracking Dashboard                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   GitHub     │───▶│  Cloudflare  │◀──▶│   Dashboard UI   │   │
│  │   Webhooks   │    │    Worker    │    │   (HTML/JS)      │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│         │                   │                      │             │
│         │            ┌──────┴──────┐               │             │
│         │            │             │               │             │
│         ▼            ▼             ▼               ▼             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐     │
│  │ PR Events│  │  KV for  │  │ Durable  │  │ Web Push     │     │
│  │ (webhook)│  │  Caching │  │ Objects  │  │ Notifications│     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘     │
│                                    │                             │
│                                    ▼                             │
│                           ┌──────────────┐                       │
│                           │  WebSocket   │                       │
│                           │  Real-time   │                       │
│                           └──────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. PR List with Rich Information
- PR title, number, branch name
- Author and assignees
- Time since last update ("3m ago", "2h ago")
- PR status (open, draft, review requested, approved, changes requested)
- CI/checks status (pending, passing, failing)

### 2. Quick Links per PR
- **GitHub PR**: `https://github.com/{owner}/{repo}/pull/{number}`
- **Preview URL**: `{branch-normalized}.{project}.pages.dev`
- **Cloudflare Dashboard**: `https://dash.cloudflare.com/{account_id}/workers-and-pages/{project}/deployments`
- **Claude Code Web**: `https://claude.ai/code` (with repo context in session)

### 3. Real-time Updates
- GitHub webhooks for instant PR updates
- WebSocket connection for live dashboard updates
- Polling fallback (every 30s) for reliability

### 4. Web Push Notifications
- New PR opened
- Review requested
- CI status changes
- PR approved/merged
- Configurable notification preferences

## Implementation Details

### Backend (Cloudflare Worker)

#### Environment Bindings
```toml
# wrangler.toml
name = "pr-tracking-dashboard"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[[kv_namespaces]]
binding = "PR_CACHE"
id = "..."

[durable_objects]
bindings = [
  { name = "PR_TRACKER", class_name = "PRTracker" }
]

[[migrations]]
tag = "v1"
new_classes = ["PRTracker"]

[vars]
GITHUB_OWNER = "jamespacileo"
GITHUB_REPO = "breathe-together-v2"
CLOUDFLARE_PROJECT = "breathe-together-v2"
```

#### API Routes
```
GET  /                    → Dashboard HTML
GET  /api/prs             → List open PRs
GET  /api/pr/:number      → Get single PR details
POST /webhook/github      → GitHub webhook receiver
GET  /api/subscribe       → WebSocket upgrade
POST /api/push/subscribe  → Register push subscription
POST /api/push/unsubscribe → Remove push subscription
GET  /api/config          → Dashboard configuration
```

#### GitHub API Integration
Using GraphQL for efficient data fetching:
```graphql
query OpenPRs($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    pullRequests(states: OPEN, first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        number
        title
        url
        state
        isDraft
        updatedAt
        createdAt
        headRefName
        author { login avatarUrl }
        reviewRequests(first: 5) { nodes { requestedReviewer { ... on User { login } } } }
        reviews(last: 5) { nodes { state author { login } } }
        commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
      }
    }
  }
}
```

### Frontend (Dashboard UI)

#### HTML Structure
```html
<div class="dashboard">
  <header>
    <h1>PR Tracking Dashboard</h1>
    <div class="repo-info">{owner}/{repo}</div>
    <div class="controls">
      <button id="refresh">Refresh</button>
      <button id="notifications">Enable Notifications</button>
    </div>
  </header>

  <main class="pr-list">
    <!-- PR cards rendered here -->
  </main>

  <footer>
    Last updated: <span id="last-updated"></span>
    <span id="connection-status">●</span>
  </footer>
</div>
```

#### PR Card Template
```html
<article class="pr-card" data-pr="{number}">
  <div class="pr-header">
    <span class="pr-number">#{number}</span>
    <span class="pr-status {status}">{status}</span>
    <span class="ci-status {ci}">{ci}</span>
  </div>

  <h2 class="pr-title">{title}</h2>

  <div class="pr-meta">
    <span class="branch">{branch}</span>
    <span class="updated">{timeAgo}</span>
    <span class="author">{author}</span>
  </div>

  <div class="pr-links">
    <a href="{prUrl}" target="_blank">GitHub</a>
    <a href="{previewUrl}" target="_blank">Preview</a>
    <a href="{cfDashboardUrl}" target="_blank">CF Dashboard</a>
    <a href="{claudeCodeUrl}" target="_blank">Claude Code</a>
  </div>
</article>
```

### Web Push Notifications

#### VAPID Key Generation
```bash
npx web-push generate-vapid-keys
```

#### Service Worker
```javascript
// sw.js
self.addEventListener('push', event => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon.png',
    badge: '/badge.png',
    data: { url: data.url }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

## URL Generation Logic

### Preview URL
```typescript
function getPreviewUrl(branch: string, project: string): string {
  // Cloudflare normalizes branch names: lowercase, non-alphanumeric → hyphen
  const normalized = branch.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `https://${normalized}.${project}.pages.dev`;
}
```

### Cloudflare Dashboard URL
```typescript
function getCFDashboardUrl(accountId: string, project: string): string {
  return `https://dash.cloudflare.com/${accountId}/workers-and-pages/${project}/deployments`;
}
```

### Claude Code Web URL
```typescript
function getClaudeCodeUrl(owner: string, repo: string, branch: string): string {
  // Claude Code web - start session with repo context
  // Note: Deep linking format may need verification with Anthropic docs
  return `https://claude.ai/code?repo=${owner}/${repo}&branch=${encodeURIComponent(branch)}`;
}
```

## Security Considerations

1. **GitHub Webhook Secret**: Verify `X-Hub-Signature-256` header
2. **VAPID Authentication**: Use VAPID keys for web push
3. **GitHub Token**: Store in Worker secrets, use minimal scopes
4. **Rate Limiting**: Cache GitHub API responses in KV

## Deployment Steps

1. Create KV namespace: `wrangler kv:namespace create PR_CACHE`
2. Set secrets:
   ```bash
   wrangler secret put GITHUB_TOKEN
   wrangler secret put GITHUB_WEBHOOK_SECRET
   wrangler secret put VAPID_PUBLIC_KEY
   wrangler secret put VAPID_PRIVATE_KEY
   ```
3. Deploy worker: `wrangler deploy`
4. Configure GitHub webhook:
   - URL: `https://pr-dashboard.{account}.workers.dev/webhook/github`
   - Events: Pull requests, Check runs, Pull request reviews
   - Secret: Same as GITHUB_WEBHOOK_SECRET

## Sources

- [GitHub Webhooks Documentation](https://docs.github.com/en/webhooks/about-webhooks)
- [GitHub REST API for Webhooks](https://docs.github.com/en/rest/repos/webhooks)
- [Cloudflare Workers GitHub Integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)
- [Cloudflare Pages Preview Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Web Push API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Claude Code on the Web](https://code.claude.com/docs/en/claude-code-on-the-web)
