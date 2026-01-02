#!/bin/bash
set -euo pipefail

# =============================================================================
# Push Screenshots to Git Branch with Error Handling and Retry Logic
# =============================================================================
#
# This script:
# 1. Saves screenshots to temp location
# 2. Creates/checks out screenshots branch
# 3. Copies screenshots to PR-specific folder
# 4. Commits and pushes with retry logic
# 5. Cleans up temp files with trap handler
#
# Environment variables required:
# - PR_NUMBER: Pull request number
# - GITHUB_TOKEN: GitHub authentication token (for push)
# =============================================================================

PR_NUMBER="${PR_NUMBER:?PR_NUMBER environment variable is required}"
GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN environment variable is required}"

SCREENSHOTS_BRANCH="screenshots"
PR_FOLDER="pr-${PR_NUMBER}"
TEMP_SCREENSHOTS="/tmp/screenshots-pr-${PR_NUMBER}-$$"  # Include PID for uniqueness

# Trap to ensure cleanup on exit (success or failure)
cleanup() {
  if [ -d "${TEMP_SCREENSHOTS}" ]; then
    echo "Cleaning up temp directory: ${TEMP_SCREENSHOTS}"
    rm -rf "${TEMP_SCREENSHOTS}"
  fi
}
trap cleanup EXIT

# =============================================================================
# Git Push with Retry Logic (matches preview.yml pattern)
# =============================================================================
git_push_with_retry() {
  local branch="$1"
  local max_attempts=4
  local attempt=0
  local wait_time=2

  while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    echo "Pushing to ${branch} (attempt ${attempt}/${max_attempts})..."

    if git push origin "${branch}"; then
      echo "✅ Push successful!"
      return 0
    fi

    if [ $attempt -lt $max_attempts ]; then
      echo "⚠️  Push failed, retrying in ${wait_time}s..."
      sleep "${wait_time}"
      wait_time=$((wait_time * 2))  # Exponential backoff: 2s, 4s, 8s
    fi
  done

  echo "❌ Failed to push after ${max_attempts} attempts"
  return 1
}

# =============================================================================
# Main Script
# =============================================================================

echo "=== Pushing screenshots for PR #${PR_NUMBER} ==="

# 1. Save screenshots to temp location before branch switch
if [ ! -d "./screenshots" ] || [ -z "$(ls -A ./screenshots 2>/dev/null)" ]; then
  echo "❌ Error: No screenshots found in ./screenshots directory"
  exit 1
fi

mkdir -p "${TEMP_SCREENSHOTS}"
cp ./screenshots/*.png "${TEMP_SCREENSHOTS}/"
echo "✅ Saved $(ls -1 "${TEMP_SCREENSHOTS}" | wc -l) screenshots to temp location"
ls -lh "${TEMP_SCREENSHOTS}/"

# 2. Configure git
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# 3. Create or checkout the screenshots branch
echo ""
echo "=== Setting up screenshots branch ==="

if git ls-remote --heads origin "${SCREENSHOTS_BRANCH}" | grep -q "${SCREENSHOTS_BRANCH}"; then
  echo "Screenshots branch exists, fetching..."
  git fetch origin "${SCREENSHOTS_BRANCH}"
  git checkout "${SCREENSHOTS_BRANCH}"
else
  echo "Creating new orphan screenshots branch..."
  git checkout --orphan "${SCREENSHOTS_BRANCH}"

  # Clean working directory (ignore errors if already clean)
  git rm -rf . 2>/dev/null || true

  # Initialize with README
  cat > README.md << 'EOF'
# Preview Screenshots

This branch contains automatically generated screenshots from PR previews.

## Structure

```
pr-{number}/
  ├── desktop-inhale.png
  ├── desktop-hold.png
  ├── desktop-exhale.png
  ├── desktop-admin.png
  ├── tablet-*.png
  └── mobile-*.png
```

## Cleanup

Screenshots are automatically removed when PRs are closed.
EOF

  git add README.md
  git commit -m "Initialize screenshots branch"

  # Push initial commit with retry
  if ! git_push_with_retry "${SCREENSHOTS_BRANCH}"; then
    echo "❌ Failed to initialize screenshots branch"
    exit 1
  fi
fi

# 4. Clean up old screenshots for this PR and add new ones
echo ""
echo "=== Updating PR screenshots ==="

if [ -d "${PR_FOLDER}" ]; then
  echo "Removing old screenshots from ${PR_FOLDER}/"
  rm -rf "${PR_FOLDER}"
fi

mkdir -p "${PR_FOLDER}"
cp "${TEMP_SCREENSHOTS}"/*.png "${PR_FOLDER}/"
echo "✅ Copied $(ls -1 "${PR_FOLDER}" | wc -l) screenshots to ${PR_FOLDER}/"
ls -lh "${PR_FOLDER}/"

# 5. Commit and push with retry
echo ""
echo "=== Committing changes ==="

git add "${PR_FOLDER}"

if git diff --cached --quiet; then
  echo "ℹ️  No changes to commit (screenshots unchanged)"
else
  git commit -m "Update screenshots for PR #${PR_NUMBER}

Automated screenshot capture from preview deployment.
Captured at: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

Viewports: desktop (1920×1080), tablet (768×1024), mobile (375×667)
Screens: inhale, hold, exhale, admin"

  if ! git_push_with_retry "${SCREENSHOTS_BRANCH}"; then
    echo "❌ Failed to push screenshots"
    exit 1
  fi
fi

# 6. Output for GitHub Actions
echo ""
echo "=== Success ==="
echo "branch=${SCREENSHOTS_BRANCH}" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "folder=${PR_FOLDER}" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "✅ Screenshots successfully pushed to ${SCREENSHOTS_BRANCH}/${PR_FOLDER}"
