# Slack Notifications Setup Guide

This guide explains how to set up Slack notifications for deployments and releases.

## Overview

The project has three types of Slack notifications:

1. **PR Preview Deployments** → Existing `SLACK_WEBHOOK_URL` (currently configured)
2. **Main Branch Deployments** → New `SLACK_WEBHOOK_CI_CD` (needs setup)
3. **Tagged Releases** → New `SLACK_WEBHOOK_RELEASES` (needs setup)

## Slack Channels

### Recommended Channel Setup

- **#ci-cd** - For main branch deployments (production previews)
- **#breathe-together** - For tagged releases (official releases)
- **#general** or **#dev** - For PR preview deployments (already configured)

You can use the same webhook for all three if you prefer a single channel for all notifications.

## Setup Instructions

### Step 1: Create Slack Incoming Webhooks

1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks** (or visit https://api.slack.com/apps)
3. Create a new app or use an existing one
4. Enable **Incoming Webhooks**
5. Click **Add New Webhook to Workspace**
6. Select the target channel:
   - Create webhook for **#ci-cd** channel
   - Create webhook for **#breathe-together** channel
7. Copy the webhook URLs (they look like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### Step 2: Add GitHub Secrets

Add these secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

#### Required Secrets

| Secret Name | Description | Channel |
|------------|-------------|---------|
| `SLACK_WEBHOOK_CI_CD` | Webhook for main branch deployments | #ci-cd |
| `SLACK_WEBHOOK_RELEASES` | Webhook for tagged releases | #breathe-together |

#### Existing Secrets (already configured)

| Secret Name | Description | Channel |
|------------|-------------|---------|
| `SLACK_WEBHOOK_URL` | Webhook for PR preview deployments | Current channel |

### Step 3: Verify Setup

After adding the secrets, test the workflows:

#### Test Main Branch Deployment Notifications

1. Push a commit to the `main` branch
2. Wait for the deployment workflow to complete
3. Check the **#ci-cd** channel for the notification

#### Test Release Notifications

1. Create and push a version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. Wait for the release workflow to complete
3. Check the **#breathe-together** channel for the notification

## Notification Examples

### Main Branch Deployment (CI/CD Channel)

```
🚀 Production Deployment (main)

Branch: main
Commits: 3 new commits

Frontend: breathe-together-v2
Worker: breathe-together-presence

Changes:
• feat: Add new breathing pattern (John Doe)
• fix: Fix particle rendering bug (Jane Smith)
• docs: Update README (Alice Johnson)

[🌐 Open App] [📊 Cloudflare Dashboard] [⚙️ Workflow Run]

Deployed via GitHub Actions • Commit: abc1234
```

### Tagged Release (Releases Channel)

```
🎉 New Release: v1.0.0

Version: v1.0.0
Released: Dec 15, 2024 at 3:45 PM

What's New:
• feat: Add meditation timer
• feat: Add breath pattern customization
• fix: Improve mobile responsiveness
• perf: Optimize particle system

Frontend: breathe-together-v2.palladio-registry.workers.dev
Worker API: breathe-together-presence.palladio-registry.workers.dev

[🌐 Open App] [📝 Release Notes] [📊 Cloudflare Dashboard]

🚀 Deployed successfully to production • View workflow
```

### PR Preview Deployment (Existing)

```
🚀 Preview Deployed

PR: #123 Add new feature
Author: johndoe

Branch: feature/new-feature
Commit: abc1234

[🔗 Open Preview] [📋 View PR] [⚙️ Workflow Run]

Deployed via GitHub Actions • breathe-together-v2
```

## Notification Features

### What's Included in Notifications

#### Main Branch Deployments
- ✅ Commit count since last deployment
- ✅ List of commits with authors (up to 10)
- ✅ Frontend and Worker deployment URLs
- ✅ Direct links to Cloudflare Dashboard
- ✅ Workflow run link for debugging

#### Tagged Releases
- ✅ Version number from tag
- ✅ Release date and time
- ✅ Full changelog since previous release
- ✅ GitHub Release notes link
- ✅ Deployment URLs
- ✅ Commit and file change statistics

#### PR Previews (Existing)
- ✅ PR number and title
- ✅ Author information
- ✅ Preview URL
- ✅ Deployment details (branch, commit, timestamp)

### Failure Notifications

All workflows include failure notifications with:
- ❌ Clear indication of which job failed
- 🔍 Direct link to workflow logs
- 📋 Context information (branch, commit, PR)

## Troubleshooting

### Notifications Not Appearing

1. **Check webhook URLs**: Ensure secrets are correctly set in GitHub
2. **Verify channel permissions**: The Slack app must have permission to post to the channel
3. **Check workflow runs**: Go to Actions tab to see if the notification job ran
4. **Test webhook manually**: Use curl to test the webhook:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test notification"}' \
     YOUR_WEBHOOK_URL
   ```

### Rate Limiting

Slack has rate limits on incoming webhooks:
- **1 message per second** per webhook
- If you exceed this, notifications may be delayed or dropped
- The workflows are designed to send one notification per deployment

### Customizing Notifications

To customize notification content:

1. Edit the workflow file:
   - `.github/workflows/deploy.yml` - Main branch deployments
   - `.github/workflows/release.yml` - Tagged releases
   - `.github/workflows/preview.yml` - PR previews

2. Modify the `payload` section in the Slack notification step

3. Use [Slack Block Kit Builder](https://api.slack.com/block-kit/building) to design custom layouts

## Advanced Configuration

### Using a Single Webhook

If you want all notifications in one channel:

1. Create a single webhook for one channel
2. Use the same webhook URL for all three secrets:
   - `SLACK_WEBHOOK_URL` = webhook_url
   - `SLACK_WEBHOOK_CI_CD` = webhook_url
   - `SLACK_WEBHOOK_RELEASES` = webhook_url

### Thread Notifications

To send deployment updates as threads:

1. Modify the workflow to store the Slack message timestamp
2. Use the `thread_ts` parameter in subsequent notifications
3. See [Slack Threading Documentation](https://api.slack.com/messaging/managing#threading)

### Mentioning Users

To mention specific users on failures:

Add user IDs to the notification payload:
```json
{
  "text": "<@U0123456789> Deployment failed!"
}
```

Get user IDs from Slack:
1. Click on user profile
2. Click "More" → "Copy member ID"

## Support

For issues with:
- **GitHub Actions**: Check the [Actions tab](https://github.com/jamespacileo/breathe-together-v2/actions)
- **Slack webhooks**: See [Slack Incoming Webhooks docs](https://api.slack.com/messaging/webhooks)
- **Cloudflare deployments**: Check [Cloudflare Dashboard](https://dash.cloudflare.com)

## Changelog

- **2024-12-15**: Added main branch and release notifications
- **Existing**: PR preview notifications already configured
