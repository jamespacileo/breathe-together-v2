/**
 * Admin Dashboard UI
 *
 * Exports the dashboard HTML as a string for serving from the worker.
 * The dashboard uses Tailwind CSS via CDN and vanilla JS for interactivity.
 */

export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agents Dashboard - Breathe Together</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            background: 'hsl(224 71% 4%)',
            foreground: 'hsl(213 31% 91%)',
            card: 'hsl(224 71% 4%)',
            'card-foreground': 'hsl(213 31% 91%)',
            primary: 'hsl(210 40% 98%)',
            'primary-foreground': 'hsl(222.2 47.4% 1.2%)',
            secondary: 'hsl(222.2 47.4% 11.2%)',
            'secondary-foreground': 'hsl(210 40% 98%)',
            muted: 'hsl(223 47% 11%)',
            'muted-foreground': 'hsl(215.4 16.3% 56.9%)',
            accent: 'hsl(216 34% 17%)',
            'accent-foreground': 'hsl(210 40% 98%)',
            destructive: 'hsl(0 63% 31%)',
            border: 'hsl(216 34% 17%)',
            ring: 'hsl(216 34% 17%)',
          }
        }
      }
    }
  </script>
  <style>
    body { background: hsl(224 71% 4%); color: hsl(213 31% 91%); }
    .status-healthy { color: #22c55e; }
    .status-warning { color: #eab308; }
    .status-critical { color: #ef4444; }
    .status-idle { color: #3b82f6; }
    .status-busy { color: #f59e0b; }
    .status-running { color: #3b82f6; }
    .status-completed { color: #22c55e; }
    .status-failed { color: #ef4444; }
    .status-pending { color: #6b7280; }
    .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  </style>
</head>
<body class="min-h-screen p-6">
  <div id="app" class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <header class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl font-bold">Agents Dashboard</h1>
        <p class="text-muted-foreground text-sm">Breathe Together Maintenance System</p>
      </div>
      <div class="flex items-center gap-4">
        <div id="health-badge" class="px-3 py-1 rounded-full text-sm font-medium bg-secondary">
          Loading...
        </div>
        <button onclick="refreshAll()" class="px-4 py-2 bg-secondary hover:bg-accent rounded-md text-sm transition-colors">
          Refresh
        </button>
      </div>
    </header>

    <!-- Health Summary -->
    <section class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div id="health-score" class="p-4 rounded-lg border border-border bg-card">
        <div class="text-muted-foreground text-sm">Health Score</div>
        <div class="text-3xl font-bold mt-1">--</div>
      </div>
      <div id="active-tasks" class="p-4 rounded-lg border border-border bg-card">
        <div class="text-muted-foreground text-sm">Active Tasks</div>
        <div class="text-3xl font-bold mt-1">--</div>
      </div>
      <div id="completed-today" class="p-4 rounded-lg border border-border bg-card">
        <div class="text-muted-foreground text-sm">Completed (24h)</div>
        <div class="text-3xl font-bold mt-1">--</div>
      </div>
      <div id="alerts-count" class="p-4 rounded-lg border border-border bg-card">
        <div class="text-muted-foreground text-sm">Active Alerts</div>
        <div class="text-3xl font-bold mt-1">--</div>
      </div>
    </section>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Agents Column -->
      <section class="lg:col-span-1 space-y-4">
        <h2 class="text-lg font-semibold">Agents</h2>
        <div id="agents-list" class="space-y-3">
          <div class="p-4 rounded-lg border border-border bg-card animate-pulse">
            <div class="h-4 bg-secondary rounded w-1/2"></div>
          </div>
        </div>
      </section>

      <!-- Tasks & Pipelines Column -->
      <section class="lg:col-span-2 space-y-6">
        <!-- Pipelines -->
        <div>
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 class="text-lg font-semibold">Pipelines</h2>
            <div class="flex items-center gap-2">
              <select id="pipeline-select" class="px-3 py-1.5 bg-secondary border border-border rounded-md text-sm">
                <option value="">Select pipeline...</option>
              </select>
              <button onclick="triggerPipeline()" class="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                Run
              </button>
            </div>
          </div>
          <div id="pipeline-runs" class="space-y-2">
            <div class="text-muted-foreground text-sm">No recent pipeline runs</div>
          </div>
        </div>

        <!-- Recent Tasks -->
        <div>
          <h2 class="text-lg font-semibold mb-4">Recent Tasks</h2>
          <div id="tasks-list" class="space-y-2 max-h-96 overflow-y-auto">
            <div class="text-muted-foreground text-sm">Loading tasks...</div>
          </div>
        </div>

        <!-- Alerts -->
        <div>
          <h2 class="text-lg font-semibold mb-4">Alerts</h2>
          <div id="alerts-list" class="space-y-2 max-h-64 overflow-y-auto">
            <div class="text-muted-foreground text-sm">No active alerts</div>
          </div>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <footer class="text-center text-muted-foreground text-sm pt-6 border-t border-border">
      <p>Last updated: <span id="last-updated">--</span></p>
    </footer>
  </div>

  <script>
    const API_BASE = window.location.origin;
    let refreshInterval = null;
    let agents = [], pipelines = [], tasks = [], alerts = [], pipelineRuns = [];

    function formatDate(d) {
      if (!d) return '--';
      return new Date(d).toLocaleString();
    }

    function formatDuration(ms) {
      if (!ms) return '--';
      if (ms < 1000) return ms + 'ms';
      if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
      return (ms / 60000).toFixed(1) + 'm';
    }

    function statusClass(s) {
      const m = {healthy:'status-healthy',warning:'status-warning',critical:'status-critical',idle:'status-idle',busy:'status-busy',running:'status-running',completed:'status-completed',failed:'status-failed',pending:'status-pending'};
      return m[s] || '';
    }

    async function fetchJSON(p) {
      try {
        const r = await fetch(API_BASE + p);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      } catch (e) { console.error('Fetch ' + p + ':', e); return null; }
    }

    async function postJSON(p, d) {
      try {
        const r = await fetch(API_BASE + p, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d)});
        return await r.json();
      } catch (e) { console.error('Post ' + p + ':', e); return null; }
    }

    async function fetchAgents() {
      const d = await fetchJSON('/agents');
      if (d?.agents) { agents = d.agents; renderAgents(); }
    }

    async function fetchPipelines() {
      const d = await fetchJSON('/pipelines');
      if (d?.pipelines) { pipelines = d.pipelines; renderPipelineSelect(); }
    }

    async function fetchPipelineRuns() {
      const d = await fetchJSON('/pipelines/runs');
      if (d?.runs) { pipelineRuns = d.runs; renderPipelineRuns(); }
    }

    async function fetchHealth() {
      const d = await fetchJSON('/health');
      if (d) renderHealthBadge(d);
    }

    async function fetchHealthReport() {
      const d = await fetchJSON('/agents/health/report?hours=24');
      if (d) renderHealthScore(d);
    }

    async function fetchTasks() {
      const all = [];
      for (const t of ['orchestrator','health','content']) {
        const d = await fetchJSON('/agents/' + t + '/tasks?limit=10');
        if (d?.tasks) all.push(...d.tasks.map(x => ({...x, agentType: t})));
      }
      tasks = all.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,20);
      renderTasks();
    }

    async function fetchAlerts() {
      const d = await fetchJSON('/agents/health/alerts?unacknowledged=true');
      if (d?.alerts) { alerts = d.alerts; renderAlerts(); }
    }

    function renderHealthBadge(d) {
      const b = document.getElementById('health-badge');
      const c = {healthy:'bg-green-900/50 text-green-400',degraded:'bg-yellow-900/50 text-yellow-400',unhealthy:'bg-red-900/50 text-red-400'};
      b.className = 'px-3 py-1 rounded-full text-sm font-medium ' + (c[d.status] || 'bg-secondary');
      b.textContent = d.status.charAt(0).toUpperCase() + d.status.slice(1);
    }

    function renderHealthScore(d) {
      const el = document.querySelector('#health-score .text-3xl');
      el.textContent = d.healthScore + '%';
      el.className = 'text-3xl font-bold mt-1 ' + (d.healthScore >= 90 ? 'text-green-400' : d.healthScore >= 70 ? 'text-yellow-400' : 'text-red-400');
      document.querySelector('#alerts-count .text-3xl').textContent = d.totalAlerts || 0;
    }

    function renderAgents() {
      const c = document.getElementById('agents-list');
      if (!agents.length) { c.innerHTML = '<div class="text-muted-foreground text-sm">No agents found</div>'; return; }
      let active = 0, completed = 0;
      c.innerHTML = agents.map(({type, state: s}) => {
        if (s.status === 'busy') active++;
        completed += s.tasksCompleted || 0;
        return '<div class="p-4 rounded-lg border border-border bg-card hover:border-accent transition-colors"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full ' + (s.status === 'busy' ? 'bg-yellow-400 animate-pulse-slow' : 'bg-green-400') + '"></span><span class="font-medium capitalize">' + type + '</span></div><span class="text-xs ' + statusClass(s.status) + '">' + s.status + '</span></div><div class="mt-2 text-sm text-muted-foreground grid grid-cols-2 gap-2"><div>Completed: ' + (s.tasksCompleted || 0) + '</div><div>Failed: ' + (s.tasksFailed || 0) + '</div></div><div class="mt-2 text-xs text-muted-foreground">Last: ' + formatDate(s.lastActivity) + '</div></div>';
      }).join('');
      document.querySelector('#active-tasks .text-3xl').textContent = active;
      document.querySelector('#completed-today .text-3xl').textContent = completed;
    }

    function renderPipelineSelect() {
      document.getElementById('pipeline-select').innerHTML = '<option value="">Select pipeline...</option>' + pipelines.map(p => '<option value="' + p.id + '">' + p.name + ' (' + p.steps + ' steps)</option>').join('');
    }

    function renderPipelineRuns() {
      const c = document.getElementById('pipeline-runs');
      if (!pipelineRuns.length) { c.innerHTML = '<div class="text-muted-foreground text-sm">No recent pipeline runs</div>'; return; }
      c.innerHTML = pipelineRuns.slice(0,5).map(r => '<div class="p-3 rounded-lg border border-border bg-card flex items-center justify-between flex-wrap gap-2"><div><span class="font-medium">' + r.pipelineId + '</span><span class="text-xs text-muted-foreground ml-2">Step ' + (r.currentStep + 1) + '</span></div><div class="flex items-center gap-3"><span class="text-xs ' + statusClass(r.status) + '">' + r.status + '</span><span class="text-xs text-muted-foreground">' + formatDate(r.startedAt) + '</span></div></div>').join('');
    }

    function renderTasks() {
      const c = document.getElementById('tasks-list');
      if (!tasks.length) { c.innerHTML = '<div class="text-muted-foreground text-sm">No recent tasks</div>'; return; }
      c.innerHTML = tasks.map(t => '<div class="p-3 rounded-lg border border-border bg-card"><div class="flex items-center justify-between flex-wrap gap-2"><div class="flex items-center gap-2"><span class="text-xs px-2 py-0.5 rounded bg-secondary">' + t.agentType + '</span><span class="font-medium text-sm">' + t.name + '</span></div><span class="text-xs ' + statusClass(t.status) + '">' + t.status + '</span></div><div class="mt-1 text-xs text-muted-foreground flex gap-4 flex-wrap"><span>Created: ' + formatDate(t.createdAt) + '</span>' + (t.completedAt ? '<span>Duration: ' + formatDuration(new Date(t.completedAt) - new Date(t.startedAt)) + '</span>' : '') + '</div></div>').join('');
    }

    function renderAlerts() {
      const c = document.getElementById('alerts-list');
      if (!alerts.length) { c.innerHTML = '<div class="text-muted-foreground text-sm">No active alerts</div>'; return; }
      c.innerHTML = alerts.map(a => '<div class="p-3 rounded-lg border ' + (a.severity === 'critical' ? 'border-red-800 bg-red-900/20' : 'border-yellow-800 bg-yellow-900/20') + '"><div class="flex items-center justify-between"><span class="text-sm ' + (a.severity === 'critical' ? 'text-red-400' : 'text-yellow-400') + '">' + a.severity.toUpperCase() + '</span><button onclick="acknowledgeAlert(\\'' + a.id + '\\')" class="text-xs text-muted-foreground hover:text-foreground">Acknowledge</button></div><div class="mt-1 text-sm">' + a.message + '</div><div class="mt-1 text-xs text-muted-foreground">' + formatDate(a.created_at) + '</div></div>').join('');
    }

    async function triggerPipeline() {
      const id = document.getElementById('pipeline-select').value;
      if (!id) { alert('Please select a pipeline'); return; }
      const r = await postJSON('/pipelines/run', {pipelineId: id});
      if (r) { alert('Pipeline started: ' + id); setTimeout(() => { fetchPipelineRuns(); fetchTasks(); }, 1000); }
    }

    async function acknowledgeAlert(id) {
      await postJSON('/agents/health/alerts/' + id + '/acknowledge', {});
      fetchAlerts();
    }

    async function refreshAll() {
      document.getElementById('last-updated').textContent = 'Refreshing...';
      await Promise.all([fetchHealth(), fetchAgents(), fetchPipelines(), fetchPipelineRuns(), fetchTasks(), fetchAlerts(), fetchHealthReport()]);
      document.getElementById('last-updated').textContent = new Date().toLocaleString();
    }

    document.addEventListener('DOMContentLoaded', () => {
      refreshAll();
      refreshInterval = setInterval(refreshAll, 30000);
    });
  </script>
</body>
</html>`;
