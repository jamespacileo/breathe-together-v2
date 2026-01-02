# GitHub Workflows Documentation

This directory contains automated workflows for preview deployments and screenshot capture.

## Workflows Overview

### 1. `preview.yml` - Preview Deployment
Triggers on: `pull_request` (opened, synchronize, reopened)

**Jobs:**
1. **validate** - Runs Biome checks, build, and typecheck in parallel
2. **deploy-worker-preview** - Deploys Cloudflare Worker (presence API)
3. **deploy-preview** - Deploys frontend preview (depends on worker)
4. **notify-*** - Slack notifications for success/failure

**Outputs:**
- Preview URL: `https://breathe-together-v2-pr-{number}.palladio-registry.workers.dev`
- PR comment with deployment details
- Slack notifications

---

### 2. `preview-screenshots.yml` - Automated Screenshot Capture
Triggers on: `workflow_run` completion of "Preview Deployment"

**Security:** Uses `workflow_run` trigger to run in base repo context, preventing secret exposure to fork PRs.

**Jobs:**
1. **Get PR number** - Extracts PR number from workflow_run context (3 fallback strategies)
2. **Wait for preview** - Verifies preview is ready and canvas is rendering
3. **Capture screenshots** - Takes screenshots at specific breathing phases
4. **Push to git** - Stores screenshots in `screenshots` branch for inline display
5. **Upload artifact** - Creates downloadable zip archive
6. **Comment PR** - Updates PR with screenshot gallery

**Screenshots Captured:**
- **Viewports:** Desktop (1920×1080), Tablet (768×1024), Mobile (375×667)
- **Breathing phases:** Inhale, Hold, Exhale (synchronized to UTC breathing cycle)
- **Static screens:** Admin panel

**Optimizations:**
- Playwright browser caching (~170MB saved per run after first run)
- Intelligent phase timing (waits for exact breathing phase midpoint)
- WebGL verification (ensures canvas is rendering before capture)
- Retry logic for git push (handles transient network failures)

---

### 3. `preview-screenshots-cleanup.yml` - Screenshot Cleanup
Triggers on: `pull_request` closed

**Purpose:** Removes screenshots from `screenshots` branch when PR is closed to prevent unbounded growth.

**Cleanup:**
- Deletes `pr-{number}/` folder from screenshots branch
- Uses same retry logic as other workflows
- Runs on PR close (merged or abandoned)

---

## Supporting Scripts

### `.github/scripts/screenshot.mjs`
Playwright script for capturing screenshots.

**Features:**
- Loads breathing configuration from `breath-config.json` (single source of truth)
- Splits breathing screens (phase-synchronized) from static screens
- WebGL canvas verification (checks rendering, not just HTTP 200)
- Improved phase timing (0.1s threshold instead of 0.5s)
- Better error handling (propagates failures instead of silent capture)

**Usage:**
```bash
PREVIEW_URL=https://example.com node .github/scripts/screenshot.mjs
```

---

### `.github/scripts/wait-for-preview.mjs`
Verifies preview deployment is ready before screenshot capture.

**Checks:**
1. HTTP 200 response
2. Canvas element exists
3. Canvas has non-zero dimensions
4. Canvas is visible in viewport

**Usage:**
```bash
PREVIEW_URL=https://example.com node .github/scripts/wait-for-preview.mjs
```

**Exit codes:**
- `0` - Preview ready
- `1` - Preview not ready after max attempts

---

### `.github/scripts/push-screenshots.sh`
Pushes screenshots to `screenshots` branch with error handling.

**Features:**
- Safe temp file handling with PID-based unique paths
- `trap` handler ensures cleanup on exit (success or failure)
- Exponential backoff retry logic (2s, 4s, 8s, 16s)
- Verifies screenshots exist before proceeding
- Detailed logging for debugging

**Usage:**
```bash
PR_NUMBER=123 GITHUB_TOKEN=$TOKEN .github/scripts/push-screenshots.sh
```

**Environment variables:**
- `PR_NUMBER` (required) - Pull request number
- `GITHUB_TOKEN` (required) - GitHub authentication token
- `GITHUB_OUTPUT` (optional) - Path to GitHub Actions output file

---

## Configuration Files

### `breath-config.json`
Shared breathing pattern configuration used by both the app and workflows.

**Purpose:** Single source of truth for breathing phase timing. Prevents drift between app behavior and screenshot timing.

**Structure:**
```json
{
  "breathPhases": {
    "inhale": 4,
    "holdIn": 7,
    "exhale": 8,
    "holdOut": 0
  }
}
```

**Consumers:**
- `src/constants.ts` - Frontend app configuration (future: load from this file)
- `.github/scripts/screenshot.mjs` - Screenshot timing synchronization

---

## Improvements Made (January 2026)

### 🔴 Critical Fixes
1. **Shared breathing constants** - Prevents drift between app and screenshots
2. **Git operations hardening** - Error handling, retry logic, trap cleanup
3. **Comment pagination** - Prevents duplicate comments on PRs with >30 comments
4. **Cloudflare subdomain** - Extracted to env var with documentation

### 🟡 Bug Fixes
5. **Screenshot directory logic** - Fixed fallback order
6. **Error screenshot removal** - No longer captures/stores error states
7. **Preview readiness** - Verifies WebGL canvas rendering, not just HTTP 200
8. **Phase timing threshold** - Reduced from 0.5s to 0.1s for accuracy

### 🟠 Anti-Pattern Elimination
9. **Script extraction** - 230 lines moved from YAML to `.mjs` file
10. **Package.json cleanup** - Removed unnecessary `npm init`
11. **Retry logic** - Added exponential backoff for git push
12. **Error propagation** - Removed `continue-on-error`, proper failure handling

### ⚪ Optimizations
13. **Playwright caching** - Saves 30-60s per run (cache hit)
14. **URL construction** - Built once, passed as env var
15. **Screenshot cleanup** - Automatic removal on PR close
16. **Data structure clarity** - Split breathing/static screens

---

## Troubleshooting

### Screenshots Not Appearing in PR
1. Check workflow run: `https://github.com/{owner}/{repo}/actions`
2. Verify preview deployment succeeded
3. Check "Wait for preview" step logs (WebGL verification)
4. Verify screenshots branch exists: `https://github.com/{owner}/{repo}/tree/screenshots`

### Playwright Cache Miss
Cache key includes `package-lock.json` hash. Regenerate cache by updating Playwright version:
```bash
npm install playwright@latest
git add package-lock.json
git commit -m "Update Playwright"
```

### Git Push Failures
Check retry logs in "Push screenshots" step. Common causes:
- Network transient failures (auto-retries up to 4 times)
- Concurrent writes to screenshots branch (rare, auto-resolves)
- Token permissions (needs `contents: write`)

### Wrong Breathing Phase Captured
Verify `breath-config.json` matches `src/constants.ts`:
```bash
# Compare configurations
cat breath-config.json
cat src/constants.ts | grep BREATH_PHASES
```

---

## Security Considerations

### Why `workflow_run` Trigger?
The `preview-screenshots.yml` workflow uses `workflow_run` instead of `pull_request` to run in the **base repository context**, not the PR context. This prevents:
- Fork PRs from accessing repository secrets
- Malicious PRs from exfiltrating tokens
- Untrusted code execution with write permissions

**Trade-off:** Slightly more complex PR number extraction (requires 3 fallback strategies).

### Permissions Model
| Workflow | Context | Secrets Access | Write Permissions |
|----------|---------|----------------|-------------------|
| `preview.yml` | PR | ✅ Yes (Cloudflare) | ❌ No (read-only) |
| `preview-screenshots.yml` | Base | ✅ Yes (GITHUB_TOKEN) | ✅ Yes (screenshots branch) |
| `preview-screenshots-cleanup.yml` | Base | ❌ No | ✅ Yes (screenshots branch) |

---

## Performance Metrics

### Before Optimization
- Playwright install: ~60s (every run)
- Screenshot capture: ~45s
- Total: ~105s

### After Optimization (Cache Hit)
- Playwright install: ~5s (deps only)
- Screenshot capture: ~45s
- Total: ~50s

**Savings:** ~55s per run (52% reduction)

---

## Future Improvements

1. **Cloudflare subdomain** - Move to repository variable for easier updates
2. **Visual regression** - Compare screenshots to previous PR versions
3. **Parallel capture** - Run viewports in parallel for faster capture
4. **Mobile device emulation** - Use real device profiles (iPhone, Android)
5. **Breath config integration** - Load `breath-config.json` in `src/constants.ts`

---

## References

- [GitHub Actions workflow_run trigger](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run)
- [Playwright GitHub Actions](https://playwright.dev/docs/ci-intro)
- [Actions Cache](https://github.com/actions/cache)
- [Octokit Pagination](https://github.com/octokit/plugin-paginate-rest.js)
