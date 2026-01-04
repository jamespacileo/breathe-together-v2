# Environment Variables & Secrets

This document describes all environment variables and secrets required for the Cloudflare Agents service.

## Quick Setup

```bash
# 1. Set secrets (one-time, stored encrypted by Cloudflare)
wrangler secret put GITHUB_TOKEN --config agents/wrangler.toml
wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY --config agents/wrangler.toml

# 2. Deploy with env vars (defined in wrangler.toml)
npm run agents:deploy
```

---

## Environment Variables

Environment variables are defined in `wrangler.toml` and are **not sensitive**.

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENVIRONMENT` | Yes | `development` | Runtime environment: `development`, `staging`, `production` |

### GitHub Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_OWNER` | Yes | - | Repository owner (e.g., `jamespacileo`) |
| `GITHUB_REPO` | Yes | - | Repository name (e.g., `breathe-together-v2`) |
| `GITHUB_API_URL` | No | `https://api.github.com` | GitHub API base URL (for GitHub Enterprise) |

### LLM / Vertex AI Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | No | `vertex` | LLM provider: `vertex`, `openai`, `anthropic` |
| `LLM_MODEL` | No | `gemini-2.0-flash-001` | Model identifier |
| `VERTEX_PROJECT_ID` | Yes* | - | Google Cloud project ID (*required if using Vertex) |
| `VERTEX_LOCATION` | No | `us-central1` | Vertex AI region |

### Cloudflare Pages Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PAGES_PROJECT_NAME` | No | `breathe-together-v2` | Cloudflare Pages project name |
| `PREVIEW_URL_PATTERN` | No | `{branch}.{project}.pages.dev` | Preview URL pattern |

---

## Secrets

Secrets are **sensitive** credentials stored encrypted by Cloudflare. Never commit these to version control.

### Setting Secrets

```bash
# Interactive (prompts for value)
wrangler secret put SECRET_NAME --config agents/wrangler.toml

# From file
wrangler secret put SECRET_NAME --config agents/wrangler.toml < secret.txt

# From environment variable
echo "$MY_SECRET" | wrangler secret put SECRET_NAME --config agents/wrangler.toml
```

### Required Secrets

#### `GITHUB_TOKEN`

**Purpose:** Authenticate with GitHub API for PR/workflow data.

**Required Scopes:**
- `repo` - Access repository data (PRs, commits, deployments)
- `actions:read` - Read workflow run status
- `checks:read` - Read check suite/run status

**How to Create:**
1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:org` (if org repo)
4. Copy token and set as secret

```bash
wrangler secret put GITHUB_TOKEN --config agents/wrangler.toml
# Paste token when prompted
```

**Alternative: GitHub App (Recommended for Production)**

For production, use a GitHub App instead of PAT:
1. Create GitHub App with required permissions
2. Install on repository
3. Use App ID + Private Key for authentication

---

#### `GOOGLE_SERVICE_ACCOUNT_KEY`

**Purpose:** Authenticate with Google Cloud / Vertex AI for Gemini model access.

**Required Roles:**
- `roles/aiplatform.user` - Use Vertex AI endpoints

**How to Create:**
1. Go to [Google Cloud Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Create service account or select existing
3. Grant `Vertex AI User` role
4. Create JSON key and download
5. Set entire JSON as secret (base64 encoded recommended)

```bash
# Option 1: Direct JSON (escape carefully)
wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY --config agents/wrangler.toml < service-account.json

# Option 2: Base64 encoded (safer)
base64 -i service-account.json | wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY_B64 --config agents/wrangler.toml
```

**Alternative: Workload Identity Federation (Recommended)**

For production, use Workload Identity Federation instead of service account keys:
1. Configure Cloudflare as an identity provider in GCP
2. Create workload identity pool
3. Grant pool access to Vertex AI
4. No secrets required - uses OIDC tokens

---

## Bindings

Bindings connect your Worker to Cloudflare resources.

### KV Namespaces

| Binding | Description |
|---------|-------------|
| `PRESENCE_KV` | Shared KV namespace with presence worker |

**Creating KV Namespace:**
```bash
# Create namespace
wrangler kv:namespace create PRESENCE_KV --config agents/wrangler.toml

# Update wrangler.toml with returned ID
```

### Durable Objects

| Binding | Class | Description |
|---------|-------|-------------|
| `ORCHESTRATOR` | `OrchestratorAgent` | Pipeline coordination |
| `HEALTH` | `HealthAgent` | Health monitoring |
| `CONTENT` | `ContentAgent` | Content maintenance |
| `GITHUB` | `GitHubAgent` | GitHub integration |

---

## Environment-Specific Configuration

### Development (`wrangler dev`)

```toml
[env.development]
[env.development.vars]
ENVIRONMENT = "development"
GITHUB_OWNER = "jamespacileo"
GITHUB_REPO = "breathe-together-v2"
LLM_PROVIDER = "vertex"
LLM_MODEL = "gemini-2.0-flash-001"
VERTEX_PROJECT_ID = "breathe-together-dev"
```

### Staging

```toml
[env.staging]
name = "breathe-together-agents-staging"
[env.staging.vars]
ENVIRONMENT = "staging"
GITHUB_OWNER = "jamespacileo"
GITHUB_REPO = "breathe-together-v2"
LLM_PROVIDER = "vertex"
LLM_MODEL = "gemini-2.0-flash-001"
VERTEX_PROJECT_ID = "breathe-together-staging"
```

### Production

```toml
[env.production]
name = "breathe-together-agents"
[env.production.vars]
ENVIRONMENT = "production"
GITHUB_OWNER = "jamespacileo"
GITHUB_REPO = "breathe-together-v2"
LLM_PROVIDER = "vertex"
LLM_MODEL = "gemini-2.0-flash-001"
VERTEX_PROJECT_ID = "breathe-together"
```

---

## Local Development

### Using `.dev.vars`

Create `agents/.dev.vars` for local secrets (gitignored):

```bash
# agents/.dev.vars
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Using Environment Variables

```bash
# Export before running dev server
export GITHUB_TOKEN="ghp_xxxx"
npm run agents:dev
```

### Mock Mode

For testing without real credentials:

```bash
# Use mock implementations
MOCK_EXTERNAL_APIS=true npm run agents:dev
```

---

## Validation

The agents service validates configuration on startup:

```typescript
// Checked on worker init
const requiredVars = ['ENVIRONMENT', 'GITHUB_OWNER', 'GITHUB_REPO'];
const requiredSecrets = ['GITHUB_TOKEN']; // Only when GitHub features used
const requiredBindings = ['PRESENCE_KV', 'ORCHESTRATOR', 'HEALTH', 'CONTENT'];
```

Missing configuration will log warnings but not crash the worker (graceful degradation).

---

## Security Best Practices

1. **Never commit secrets** - Use `.gitignore` for `.dev.vars`
2. **Rotate tokens regularly** - Set calendar reminders
3. **Use least privilege** - Only grant required scopes/roles
4. **Prefer Apps over PATs** - GitHub Apps are more secure
5. **Use Workload Identity** - Avoid service account keys in production
6. **Audit access** - Review who has access to secrets in Cloudflare dashboard

---

## Troubleshooting

### "Missing environment variable: X"

```bash
# Check what's set
wrangler secret list --config agents/wrangler.toml

# Re-set the secret
wrangler secret put X --config agents/wrangler.toml
```

### "GitHub API rate limit exceeded"

- Ensure `GITHUB_TOKEN` is set (authenticated requests have higher limits)
- Check token hasn't expired
- Consider using GitHub App for higher limits

### "Vertex AI permission denied"

- Verify `VERTEX_PROJECT_ID` matches your GCP project
- Check service account has `Vertex AI User` role
- Ensure Vertex AI API is enabled in GCP project

### "KV namespace not found"

```bash
# List namespaces
wrangler kv:namespace list

# Verify ID in wrangler.toml matches
```
