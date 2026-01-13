/**
 * Dashboard HTML/CSS/JS
 * Single-page dashboard for PR tracking
 */

import type { DashboardConfig } from './types';

export function generateDashboardHTML(config: DashboardConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Dashboard - ${config.owner}/${config.repo}</title>
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --border-color: #30363d;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --text-muted: #6e7681;
      --accent-blue: #58a6ff;
      --accent-green: #3fb950;
      --accent-yellow: #d29922;
      --accent-red: #f85149;
      --accent-purple: #a371f7;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      min-height: 100vh;
    }

    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    h1 {
      font-size: 24px;
      font-weight: 600;
    }

    .repo-link {
      color: var(--accent-blue);
      text-decoration: none;
      font-size: 14px;
    }

    .repo-link:hover {
      text-decoration: underline;
    }

    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    button {
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
    }

    button:hover {
      background: var(--bg-tertiary);
      border-color: var(--text-muted);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button.primary {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
      color: white;
    }

    button.primary:hover {
      background: #4c9aed;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);
    }

    .status-dot.connected {
      background: var(--accent-green);
    }

    .status-dot.connecting {
      background: var(--accent-yellow);
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .pr-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .pr-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      transition: border-color 0.2s;
    }

    .pr-card:hover {
      border-color: var(--text-muted);
    }

    .pr-card.highlight {
      animation: highlight 2s ease-out;
    }

    @keyframes highlight {
      0% { background: rgba(88, 166, 255, 0.2); }
      100% { background: var(--bg-secondary); }
    }

    .pr-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .pr-number {
      font-weight: 600;
      color: var(--text-secondary);
    }

    .pr-status {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }

    .pr-status.draft {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }

    .pr-status.open {
      background: rgba(63, 185, 80, 0.15);
      color: var(--accent-green);
    }

    .pr-status.review_requested {
      background: rgba(210, 153, 34, 0.15);
      color: var(--accent-yellow);
    }

    .pr-status.approved {
      background: rgba(63, 185, 80, 0.3);
      color: var(--accent-green);
    }

    .pr-status.changes_requested {
      background: rgba(248, 81, 73, 0.15);
      color: var(--accent-red);
    }

    .ci-status {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
    }

    .ci-status.success {
      background: rgba(63, 185, 80, 0.15);
      color: var(--accent-green);
    }

    .ci-status.failure {
      background: rgba(248, 81, 73, 0.15);
      color: var(--accent-red);
    }

    .ci-status.pending {
      background: rgba(210, 153, 34, 0.15);
      color: var(--accent-yellow);
    }

    .ci-status.unknown, .ci-status.neutral {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }

    .pr-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .pr-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .branch {
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace;
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }

    .updated {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .author {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }

    .pr-links {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .pr-links a {
      font-size: 13px;
      color: var(--accent-blue);
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(88, 166, 255, 0.1);
      transition: background-color 0.2s;
    }

    .pr-links a:hover {
      background: rgba(88, 166, 255, 0.2);
    }

    .pr-links a.claude-code {
      color: var(--accent-purple);
      background: rgba(163, 113, 247, 0.1);
    }

    .pr-links a.claude-code:hover {
      background: rgba(163, 113, 247, 0.2);
    }

    .labels {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .label {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 12px;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }

    footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-secondary);
    }

    .empty-state h2 {
      font-size: 20px;
      margin-bottom: 8px;
    }

    .loading {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-secondary);
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 2px solid var(--border-color);
      border-top-color: var(--accent-blue);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 640px) {
      .dashboard {
        padding: 16px;
      }

      header {
        flex-direction: column;
        align-items: flex-start;
      }

      .pr-card {
        padding: 12px;
      }

      .pr-links {
        gap: 8px;
      }

      .pr-links a {
        font-size: 12px;
        padding: 6px 10px;
      }
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <header>
      <div class="header-left">
        <h1>PR Dashboard</h1>
        <a href="https://github.com/${config.owner}/${config.repo}" target="_blank" class="repo-link">
          ${config.owner}/${config.repo}
        </a>
      </div>
      <div class="controls">
        <div class="connection-status">
          <span class="status-dot" id="status-dot"></span>
          <span id="status-text">Connecting...</span>
        </div>
        <button id="refresh-btn" onclick="refreshPRs()">Refresh</button>
        <button id="notify-btn" onclick="toggleNotifications()">
          Enable Notifications
        </button>
      </div>
    </header>

    <main class="pr-list" id="pr-list">
      <div class="loading">
        <div class="spinner"></div>
        <p style="margin-top: 12px;">Loading pull requests...</p>
      </div>
    </main>

    <footer>
      <div>
        Last updated: <span id="last-updated">-</span>
      </div>
      <div>
        <span id="pr-count">0</span> open PRs
      </div>
    </footer>
  </div>

  <script>
    const CONFIG = ${JSON.stringify(config)};
    let ws = null;
    let prs = [];
    let notificationsEnabled = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      connectWebSocket();
      loadPRs();
      checkNotificationPermission();
      setInterval(updateTimeAgo, 60000);
    });

    // WebSocket connection
    function connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(\`\${protocol}//\${window.location.host}/api/ws\`);

      ws.onopen = () => {
        reconnectAttempts = 0;
        updateConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWSMessage(message);
      };

      ws.onclose = () => {
        updateConnectionStatus('disconnected');
        scheduleReconnect();
      };

      ws.onerror = () => {
        updateConnectionStatus('error');
      };

      // Heartbeat
      setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    }

    function scheduleReconnect() {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        setTimeout(connectWebSocket, delay);
        updateConnectionStatus('connecting');
      }
    }

    function handleWSMessage(message) {
      switch (message.type) {
        case 'connected':
          if (message.data) {
            prs = message.data;
            renderPRs();
          }
          break;
        case 'pr_new':
          prs.unshift(message.data);
          renderPRs();
          highlightPR(message.data.number);
          showNotification('New PR', message.data.title, message.data.url);
          break;
        case 'pr_update':
          const index = prs.findIndex(pr => pr.number === message.data.number);
          if (index !== -1) {
            prs[index] = message.data;
            renderPRs();
            highlightPR(message.data.number);
          }
          break;
        case 'pr_closed':
          prs = prs.filter(pr => pr.number !== message.data.number);
          renderPRs();
          break;
        case 'pong':
          // Heartbeat response
          break;
      }
    }

    function updateConnectionStatus(status) {
      const dot = document.getElementById('status-dot');
      const text = document.getElementById('status-text');

      dot.className = 'status-dot ' + status;

      switch (status) {
        case 'connected':
          text.textContent = 'Connected';
          break;
        case 'connecting':
          text.textContent = 'Reconnecting...';
          break;
        case 'disconnected':
        case 'error':
          text.textContent = 'Disconnected';
          break;
      }
    }

    // Load PRs via REST (fallback)
    async function loadPRs() {
      try {
        const response = await fetch('/api/prs');
        const data = await response.json();
        prs = data.prs;
        document.getElementById('last-updated').textContent = formatDate(data.lastUpdated);
        renderPRs();
      } catch (error) {
        console.error('Failed to load PRs:', error);
      }
    }

    async function refreshPRs() {
      const btn = document.getElementById('refresh-btn');
      btn.disabled = true;
      btn.textContent = 'Refreshing...';

      try {
        await fetch('/api/refresh', { method: 'POST' });
        await loadPRs();
      } catch (error) {
        console.error('Failed to refresh:', error);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Refresh';
      }
    }

    // Render PRs
    function renderPRs() {
      const container = document.getElementById('pr-list');
      document.getElementById('pr-count').textContent = prs.length;

      if (prs.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <h2>No open pull requests</h2>
            <p>All caught up!</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = prs.map(pr => renderPRCard(pr)).join('');
      updateTimeAgo();
    }

    function renderPRCard(pr) {
      const previewUrl = getPreviewUrl(pr.branch);
      const cfDashboardUrl = getCFDashboardUrl();
      const claudeCodeUrl = getClaudeCodeUrl(pr.branch);

      const statusClass = pr.isDraft ? 'draft' : pr.reviewStatus;
      const statusText = pr.isDraft ? 'Draft' : formatStatus(pr.reviewStatus);

      return \`
        <article class="pr-card" data-pr="\${pr.number}">
          <div class="pr-header">
            <span class="pr-number">#\${pr.number}</span>
            <span class="pr-status \${statusClass}">\${statusText}</span>
            <span class="ci-status \${pr.ciStatus}">\${formatCI(pr.ciStatus)}</span>
          </div>

          <h2 class="pr-title">\${escapeHtml(pr.title)}</h2>

          <div class="pr-meta">
            <span class="branch">\${escapeHtml(pr.branch)}</span>
            <span class="updated" data-time="\${pr.updatedAt}">
              Updated \${timeAgo(pr.updatedAt)}
            </span>
            <span class="author">
              <img class="avatar" src="\${pr.author.avatarUrl}" alt="">
              \${escapeHtml(pr.author.login)}
            </span>
          </div>

          <div class="pr-links">
            <a href="\${pr.url}" target="_blank">GitHub PR</a>
            <a href="\${previewUrl}" target="_blank">Preview</a>
            <a href="\${cfDashboardUrl}" target="_blank">CF Dashboard</a>
            <a href="\${claudeCodeUrl}" target="_blank" class="claude-code">Claude Code</a>
          </div>

          \${pr.labels.length > 0 ? \`
            <div class="labels">
              \${pr.labels.map(l => \`<span class="label">\${escapeHtml(l)}</span>\`).join('')}
            </div>
          \` : ''}
        </article>
      \`;
    }

    function highlightPR(number) {
      const card = document.querySelector(\`[data-pr="\${number}"]\`);
      if (card) {
        card.classList.add('highlight');
        setTimeout(() => card.classList.remove('highlight'), 2000);
      }
    }

    // URL generators
    function getPreviewUrl(branch) {
      const normalized = branch.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return \`https://\${normalized}.\${CONFIG.project}.pages.dev\`;
    }

    function getCFDashboardUrl() {
      if (CONFIG.accountId) {
        return \`https://dash.cloudflare.com/\${CONFIG.accountId}/workers-and-pages/\${CONFIG.project}/deployments\`;
      }
      return 'https://dash.cloudflare.com/';
    }

    function getClaudeCodeUrl(branch) {
      // Claude Code web - link with repo context
      const repoPath = encodeURIComponent(\`\${CONFIG.owner}/\${CONFIG.repo}\`);
      const branchEncoded = encodeURIComponent(branch);
      return \`https://claude.ai/code?repo=\${repoPath}&branch=\${branchEncoded}\`;
    }

    // Notifications
    async function checkNotificationPermission() {
      const btn = document.getElementById('notify-btn');

      if (!('Notification' in window)) {
        btn.style.display = 'none';
        return;
      }

      if (Notification.permission === 'granted') {
        notificationsEnabled = true;
        btn.textContent = 'Notifications On';
        btn.classList.add('primary');
      }
    }

    async function toggleNotifications() {
      const btn = document.getElementById('notify-btn');

      if (!('Notification' in window)) {
        alert('Notifications not supported in this browser');
        return;
      }

      if (Notification.permission === 'granted') {
        notificationsEnabled = !notificationsEnabled;
        btn.textContent = notificationsEnabled ? 'Notifications On' : 'Notifications Off';
        btn.classList.toggle('primary', notificationsEnabled);
      } else if (Notification.permission === 'denied') {
        alert('Notifications blocked. Please enable in browser settings.');
      } else {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          notificationsEnabled = true;
          btn.textContent = 'Notifications On';
          btn.classList.add('primary');
          registerPushSubscription();
        }
      }
    }

    async function registerPushSubscription() {
      if (!CONFIG.vapidPublicKey) return;

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(CONFIG.vapidPublicKey)
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
      } catch (error) {
        console.error('Push subscription failed:', error);
      }
    }

    function showNotification(title, body, url) {
      if (!notificationsEnabled) return;

      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body: body,
          icon: '/icon.png'
        });

        notification.onclick = () => {
          window.open(url, '_blank');
        };
      }
    }

    // Utilities
    function timeAgo(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now - date) / 1000);

      if (seconds < 60) return 'just now';
      if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
      if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
      return Math.floor(seconds / 86400) + 'd ago';
    }

    function updateTimeAgo() {
      document.querySelectorAll('[data-time]').forEach(el => {
        const time = el.dataset.time;
        if (time) {
          el.textContent = 'Updated ' + timeAgo(time);
        }
      });
    }

    function formatDate(dateString) {
      return new Date(dateString).toLocaleString();
    }

    function formatStatus(status) {
      const map = {
        pending: 'Pending',
        review_requested: 'Review Requested',
        approved: 'Approved',
        changes_requested: 'Changes Requested',
        commented: 'Commented'
      };
      return map[status] || status;
    }

    function formatCI(status) {
      const map = {
        success: 'CI Passed',
        failure: 'CI Failed',
        pending: 'CI Running',
        neutral: 'CI Neutral',
        unknown: 'CI Unknown'
      };
      return map[status] || status;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
    }
  </script>
</body>
</html>`;
}

export function generateServiceWorkerJS(): string {
  return `// Service Worker for Web Push Notifications
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/badge.png',
    data: { url: data.url },
    tag: data.tag || 'pr-notification',
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        // Check if already open
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Handle subscription changes
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(subscription => {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
      })
  );
});
`;
}
