# Slack Notifications for Preview Deployments

This guide explains how to set up Slack notifications for preview deployments in the breathe-together-v2 repository.

## What You Get

### Success Notification
When a PR preview deploys successfully, you'll receive a **single consolidated message** with:
- PR number, title, and link (with **Open Preview** button)
- Author and branch name
- **PR description** (truncated to 500 chars if needed)
- Status summary: Biome ✓ • TypeCheck ✓ • Build ✓ • Deploy ✓
- Quick links to PR and workflow logs

### Failure Notification
When validation or deployment fails:
- PR info (number, title, author, branch)
- Status of each check (Validation/Deployment)
- **View Logs** button (links directly to failed workflow)
- **View PR** button

## Setup Instructions

### Step 1: Create a Slack App

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **Create New App**
3. Select **From scratch**
4. Enter an app name (e.g., "GitHub Preview Deployments")
5. Select your Slack workspace
6. Click **Create App**

### Step 2: Enable Incoming Webhooks

1. In your app settings, go to **Incoming Webhooks** (left sidebar)
2. Toggle **Activate Incoming Webhooks** to **On**
3. Click **Add New Webhook to Workspace**
4. Select the channel where you want notifications (e.g., `#preview-deploys`)
5. Click **Allow**
6. Copy the **Webhook URL** (looks like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`)

### Step 3: Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Configure the secret:
   - **Name:** `SLACK_PREVIEW_WEBHOOK_URL` (recommended for dedicated channel)
   - **Value:** Paste the webhook URL from Step 2
5. Click **Add secret**

> **Note:** The workflow checks for `SLACK_PREVIEW_WEBHOOK_URL` first, then falls back to `SLACK_WEBHOOK_URL`. This allows you to use a dedicated channel for previews while keeping a general webhook for other notifications.

## Testing

1. Create a new PR or push to an existing PR
2. Wait for the preview deployment workflow to complete
3. Check your Slack channel for the notification

## Configuration Options

### Dedicated Preview Channel (Recommended)

For less noisy notifications, create a dedicated `#preview-deploys` channel:

1. Create the channel in Slack
2. Create a webhook for that channel (Step 2 above)
3. Add it as `SLACK_PREVIEW_WEBHOOK_URL` in GitHub Secrets
4. Preview notifications go to `#preview-deploys`, other notifications use `SLACK_WEBHOOK_URL`

### Shared Channel

If you prefer all notifications in one channel:
- Only set `SLACK_WEBHOOK_URL` (don't set `SLACK_PREVIEW_WEBHOOK_URL`)
- All notifications will go to that channel

### Modify Message Format

Edit `.github/workflows/preview.yml` to customize the Slack Block Kit payload. The notification uses [Slack Block Kit](https://api.slack.com/block-kit) format.

Key sections in the success notification:
- `header` - "✅ Preview Ready"
- `section` (first) - PR link with **Open Preview** button
- `section` (second) - PR description (truncated, from PR body)
- `context` - Check status and quick links

### Disable Notifications

To disable notifications without removing the code:
1. Delete both `SLACK_WEBHOOK_URL` and `SLACK_PREVIEW_WEBHOOK_URL` secrets
2. The workflow step will fail silently (won't block deployment)

## Troubleshooting

### Notifications not appearing

1. **Check the secret:** Ensure `SLACK_WEBHOOK_URL` is set correctly in repository secrets
2. **Check the channel:** Verify the webhook is configured for the right channel
3. **Check workflow logs:** Look at the "Notify Slack" step in GitHub Actions

### Invalid webhook URL error

- Webhook URLs expire if the Slack app is deleted or the webhook is revoked
- Create a new webhook URL and update the GitHub secret

### Rate limiting

Slack webhooks have rate limits. If you're deploying very frequently, you may hit limits. Consider batching notifications or using Slack's API with a bot token instead.

## Security Notes

- Never commit webhook URLs to the repository
- Webhook URLs should only be stored in GitHub Secrets
- Rotate webhook URLs periodically if security is a concern
- Consider restricting which workflows can access the secret using [environment protection rules](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
