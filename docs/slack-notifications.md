# Slack Notifications for Preview Deployments

This guide explains how to set up Slack notifications for preview deployments in the breathe-together-v2 repository.

## What You Get

### Success Notification
When a PR preview deploys successfully, you'll receive a Slack message with:
- PR number, title, and link
- Author and branch name
- Commit SHA
- Clickable buttons: **Open Preview** | **View PR** | **Workflow Run**

### Failure Notification
When a build or deploy fails:
- Same PR info as above
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
4. Select the channel where you want notifications (e.g., `#deployments`)
5. Click **Allow**
6. Copy the **Webhook URL** (looks like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`)

### Step 3: Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Configure the secret:
   - **Name:** `SLACK_WEBHOOK_URL`
   - **Value:** Paste the webhook URL from Step 2
5. Click **Add secret**

## Testing

1. Create a new PR or push to an existing PR
2. Wait for the preview deployment workflow to complete
3. Check your Slack channel for the notification

## Customization

### Change Notification Channel

To send notifications to a different channel, create a new webhook URL for that channel and update the `SLACK_WEBHOOK_URL` secret.

### Modify Message Format

Edit `.github/workflows/preview.yml` to customize the Slack Block Kit payload. The notification uses [Slack Block Kit](https://api.slack.com/block-kit) format.

Key sections:
- `header` - The title message
- `section.fields` - PR info (author, branch, commit)
- `actions.elements` - Clickable buttons
- `context` - Footer text

### Disable Notifications

To disable notifications without removing the code:
1. Delete or rename the `SLACK_WEBHOOK_URL` secret
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
