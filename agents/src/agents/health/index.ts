/**
 * HealthAgent - Health monitoring and diagnostics
 *
 * Responsibilities:
 * - Endpoint health checks
 * - KV latency measurements
 * - Service availability monitoring
 * - Alert generation (future: Slack/Discord)
 *
 * Tools:
 * - checkEndpoint: HTTP health check with status verification
 * - checkKVLatency: Measure KV read/write latency
 * - runHealthScan: Comprehensive health scan of all services
 */

import { BaseAgent } from '../../core/base-agent';
import type { AgentType, Env, Task, TaskResult } from '../../core/types';

// Health check configuration
const ENDPOINTS = {
  production: 'https://breathe-together.pages.dev',
  presence: 'https://breathe-together-presence.workers.dev/api/config',
  github: 'https://api.github.com/repos/jamespacileo/breathe-together-v2',
};

const LATENCY_THRESHOLDS = {
  endpoint: { warn: 500, critical: 2000 }, // ms
  kv: { warn: 50, critical: 200 }, // ms
};

export class HealthAgent extends BaseAgent {
  readonly agentType: AgentType = 'health';
  readonly version = '1.0.0';
  readonly description = 'Health monitoring, endpoint checks, and diagnostics';
  readonly tools = ['checkEndpoint', 'checkKVLatency', 'runHealthScan', 'getHealthReport'];

  private env: Env | null = null;

  setEnv(env: Env): void {
    this.env = env;
  }

  protected initializeSchema(): void {
    this.sql.exec(`
      -- Health check results
      CREATE TABLE IF NOT EXISTS health_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_type TEXT NOT NULL,
        target TEXT NOT NULL,
        status TEXT NOT NULL,
        latency_ms INTEGER,
        status_code INTEGER,
        error TEXT,
        metadata TEXT,
        checked_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_health_checks_type ON health_checks(check_type);
      CREATE INDEX IF NOT EXISTS idx_health_checks_target ON health_checks(target);
      CREATE INDEX IF NOT EXISTS idx_health_checks_time ON health_checks(checked_at);

      -- Keep only last 7 days of health checks
      CREATE TRIGGER IF NOT EXISTS health_checks_cleanup
      AFTER INSERT ON health_checks
      WHEN (SELECT COUNT(*) FROM health_checks) > 10000
      BEGIN
        DELETE FROM health_checks WHERE checked_at < datetime('now', '-7 days');
      END;

      -- Alerts table
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        target TEXT,
        acknowledged INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        acknowledged_at TEXT
      );
    `);
  }

  // ============================================================================
  // Task Execution
  // ============================================================================

  protected async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    switch (task.name) {
      case 'checkEndpoint':
        return this.checkEndpoint(
          task.payload as { url: string; expectedStatus?: number },
          startTime,
        );

      case 'checkKVLatency':
        return this.checkKVLatency(startTime);

      case 'runHealthScan':
        return this.runHealthScan(task.payload as { quick?: boolean }, startTime);

      default:
        return {
          success: false,
          error: `Unknown task: ${task.name}`,
          duration: Date.now() - startTime,
        };
    }
  }

  // ============================================================================
  // Health Check Implementations
  // ============================================================================

  private async checkEndpoint(
    params: { url: string; expectedStatus?: number },
    startTime: number,
  ): Promise<TaskResult> {
    const { url, expectedStatus = 200 } = params;
    const checkStart = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'BreatheTogether-HealthAgent/1.0' },
      });

      clearTimeout(timeout);

      const latency = Date.now() - checkStart;
      const isHealthy = response.status === expectedStatus;
      const severity = this.getLatencySeverity(latency, 'endpoint');

      // Store result
      this.sql.exec(
        `
        INSERT INTO health_checks (check_type, target, status, latency_ms, status_code)
        VALUES (?, ?, ?, ?, ?)
      `,
        'endpoint',
        url,
        isHealthy ? severity : 'critical',
        latency,
        response.status,
      );

      // Create alert if unhealthy
      if (!isHealthy || severity === 'critical') {
        this.createAlert(
          isHealthy ? 'warning' : 'critical',
          `Endpoint ${url} ${isHealthy ? 'slow' : 'unhealthy'}: ${response.status} (${latency}ms)`,
          url,
        );
      }

      this.log('info', `Endpoint check: ${url}`, {
        status: response.status,
        latency,
        healthy: isHealthy,
      });

      return {
        success: isHealthy,
        data: {
          url,
          status: response.status,
          latency,
          healthy: isHealthy,
          severity,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.sql.exec(
        `
        INSERT INTO health_checks (check_type, target, status, error)
        VALUES (?, ?, ?, ?)
      `,
        'endpoint',
        url,
        'critical',
        errorMessage,
      );

      this.createAlert('critical', `Endpoint ${url} unreachable: ${errorMessage}`, url);

      return {
        success: false,
        error: errorMessage,
        data: { url, healthy: false },
        duration: Date.now() - startTime,
      };
    }
  }

  private async checkKVLatency(startTime: number): Promise<TaskResult> {
    if (!this.env) {
      return { success: false, error: 'Environment not set', duration: 0 };
    }

    const testKey = `health:latency:${Date.now()}`;
    const testValue = JSON.stringify({ timestamp: Date.now(), test: true });

    try {
      // Write test
      const writeStart = Date.now();
      await this.env.PRESENCE_KV.put(testKey, testValue, { expirationTtl: 60 });
      const writeLatency = Date.now() - writeStart;

      // Read test
      const readStart = Date.now();
      await this.env.PRESENCE_KV.get(testKey);
      const readLatency = Date.now() - readStart;

      // Delete test key
      await this.env.PRESENCE_KV.delete(testKey);

      const avgLatency = (writeLatency + readLatency) / 2;
      const severity = this.getLatencySeverity(avgLatency, 'kv');

      // Store result
      this.sql.exec(
        `
        INSERT INTO health_checks (check_type, target, status, latency_ms, metadata)
        VALUES (?, ?, ?, ?, ?)
      `,
        'kv',
        'PRESENCE_KV',
        severity,
        avgLatency,
        JSON.stringify({ writeLatency, readLatency }),
      );

      if (severity === 'critical') {
        this.createAlert(
          'warning',
          `KV latency high: write=${writeLatency}ms, read=${readLatency}ms`,
          'PRESENCE_KV',
        );
      }

      this.log('info', 'KV latency check', { writeLatency, readLatency, severity });

      return {
        success: true,
        data: {
          writeLatency,
          readLatency,
          avgLatency,
          severity,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.sql.exec(
        `
        INSERT INTO health_checks (check_type, target, status, error)
        VALUES (?, ?, ?, ?)
      `,
        'kv',
        'PRESENCE_KV',
        'critical',
        errorMessage,
      );

      this.createAlert('critical', `KV unavailable: ${errorMessage}`, 'PRESENCE_KV');

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  private async runHealthScan(params: { quick?: boolean }, startTime: number): Promise<TaskResult> {
    const { quick = false } = params;
    const results: Array<{ check: string; result: TaskResult }> = [];

    // Check all endpoints
    const endpointsToCheck = quick ? [ENDPOINTS.production] : Object.values(ENDPOINTS);

    for (const url of endpointsToCheck) {
      const result = await this.checkEndpoint({ url }, Date.now());
      results.push({ check: `endpoint:${url}`, result });
    }

    // KV latency (skip on quick scan)
    if (!quick && this.env) {
      const kvResult = await this.checkKVLatency(Date.now());
      results.push({ check: 'kv:PRESENCE_KV', result: kvResult });
    }

    const allHealthy = results.every((r) => r.result.success);
    const summary = {
      total: results.length,
      healthy: results.filter((r) => r.result.success).length,
      unhealthy: results.filter((r) => !r.result.success).length,
    };

    this.log('info', `Health scan complete`, summary);

    return {
      success: allHealthy,
      data: { summary, results },
      duration: Date.now() - startTime,
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getLatencySeverity(
    latency: number,
    type: 'endpoint' | 'kv',
  ): 'healthy' | 'warning' | 'critical' {
    const thresholds = LATENCY_THRESHOLDS[type];
    if (latency >= thresholds.critical) return 'critical';
    if (latency >= thresholds.warn) return 'warning';
    return 'healthy';
  }

  private createAlert(severity: 'warning' | 'critical', message: string, target?: string): void {
    const id = crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO alerts (id, severity, message, target) VALUES (?, ?, ?, ?)`,
      id,
      severity,
      message,
      target ?? null,
    );

    this.log(severity === 'critical' ? 'error' : 'warn', `Alert: ${message}`, { target });
  }

  // ============================================================================
  // Custom Routes
  // ============================================================================

  protected handleCustomRoute(request: Request, path: string): Response | Promise<Response> {
    const url = new URL(request.url);

    // Health report
    if (path === '/report' && request.method === 'GET') {
      const hours = parseInt(url.searchParams.get('hours') || '24', 10);
      return this.getHealthReport(hours);
    }

    // Recent checks
    if (path === '/checks' && request.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const checkType = url.searchParams.get('type');

      const query = checkType
        ? `SELECT * FROM health_checks WHERE check_type = ? ORDER BY checked_at DESC LIMIT ?`
        : `SELECT * FROM health_checks ORDER BY checked_at DESC LIMIT ?`;

      const checks = checkType
        ? this.sql.exec(query, checkType, limit).toArray()
        : this.sql.exec(query, limit).toArray();

      return this.jsonResponse({ checks });
    }

    // Alerts
    if (path === '/alerts' && request.method === 'GET') {
      const unacknowledgedOnly = url.searchParams.get('unacknowledged') === 'true';

      const query = unacknowledgedOnly
        ? `SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC`
        : `SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100`;

      const alerts = this.sql.exec(query).toArray();
      return this.jsonResponse({ alerts });
    }

    // Acknowledge alert
    if (path.startsWith('/alerts/') && path.endsWith('/acknowledge') && request.method === 'POST') {
      const alertId = path.split('/')[2];
      this.sql.exec(
        `UPDATE alerts SET acknowledged = 1, acknowledged_at = datetime('now') WHERE id = ?`,
        alertId,
      );
      return this.jsonResponse({ success: true });
    }

    return this.jsonResponse({ error: 'Not found' }, 404);
  }

  private getHealthReport(hours: number): Response {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Aggregate by target
    const byTarget = this.sql
      .exec(
        `
      SELECT
        target,
        check_type,
        COUNT(*) as total_checks,
        SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warnings,
        SUM(CASE WHEN status = 'critical' THEN 1 ELSE 0 END) as critical,
        AVG(latency_ms) as avg_latency,
        MAX(latency_ms) as max_latency,
        MIN(latency_ms) as min_latency
      FROM health_checks
      WHERE checked_at >= ?
      GROUP BY target, check_type
    `,
        since,
      )
      .toArray();

    // Recent alerts
    const alerts = this.sql
      .exec(
        `
      SELECT * FROM alerts
      WHERE created_at >= ?
      ORDER BY created_at DESC
    `,
        since,
      )
      .toArray();

    // Overall health score (% healthy checks)
    const totals = this.sql
      .exec(
        `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy
      FROM health_checks
      WHERE checked_at >= ?
    `,
        since,
      )
      .one();

    const healthScore =
      totals && (totals.total as number) > 0
        ? Math.round(((totals.healthy as number) / (totals.total as number)) * 100)
        : 100;

    return this.jsonResponse({
      period: { hours, since },
      healthScore,
      byTarget,
      recentAlerts: alerts.slice(0, 10),
      totalAlerts: alerts.length,
    });
  }
}
