/**
 * ContentAgent - Content maintenance and management
 *
 * Responsibilities:
 * - Inspirational message batch management
 * - Content freshness monitoring
 * - Stale content cleanup
 * - Content generation triggers
 *
 * Tools:
 * - checkContentFreshness: Verify content isn't stale
 * - cleanupStaleContent: Remove old/unused content
 * - triggerContentGeneration: Request new content from LLM
 * - getContentStats: Content inventory statistics
 */

import { BaseAgent } from '../../core/base-agent';
import type { AgentType, Env, Task, TaskResult } from '../../core/types';

// Content configuration
const CONTENT_CONFIG = {
  inspirationalBatchTTLDays: 30, // Batches older than this are stale
  minActiveBatches: 3, // Minimum batches to keep
  maxStoredBatches: 20, // Maximum batches to retain
  userOverrideTTLDays: 7, // User overrides expire after this
};

export class ContentAgent extends BaseAgent {
  readonly agentType: AgentType = 'content';
  readonly version = '1.0.0';
  readonly description = 'Content maintenance, freshness monitoring, and cleanup';
  readonly tools = [
    'checkContentFreshness',
    'cleanupStaleContent',
    'triggerContentGeneration',
    'getContentStats',
  ];

  private env: Env | null = null;

  setEnv(env: Env): void {
    this.env = env;
  }

  protected initializeSchema(): void {
    this.sql.exec(`
      -- Content inventory tracking
      CREATE TABLE IF NOT EXISTS content_inventory (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        key TEXT NOT NULL,
        size_bytes INTEGER,
        created_at TEXT,
        last_accessed TEXT,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_content_type ON content_inventory(content_type);

      -- Content operations log
      CREATE TABLE IF NOT EXISTS content_operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL,
        content_type TEXT NOT NULL,
        affected_count INTEGER,
        details TEXT,
        performed_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Keep only last 500 operations
      CREATE TRIGGER IF NOT EXISTS content_operations_cleanup
      AFTER INSERT ON content_operations
      WHEN (SELECT COUNT(*) FROM content_operations) > 500
      BEGIN
        DELETE FROM content_operations WHERE id IN (
          SELECT id FROM content_operations ORDER BY id ASC LIMIT 50
        );
      END;
    `);
  }

  // ============================================================================
  // Task Execution
  // ============================================================================

  protected async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    switch (task.name) {
      case 'checkContentFreshness':
        return this.checkContentFreshness(startTime);

      case 'cleanupStaleContent':
        return this.cleanupStaleContent(task.payload as { dryRun?: boolean }, startTime);

      case 'getContentStats':
        return this.getContentStats(startTime);

      case 'syncInventory':
        return this.syncInventory(startTime);

      default:
        return {
          success: false,
          error: `Unknown task: ${task.name}`,
          duration: Date.now() - startTime,
        };
    }
  }

  // ============================================================================
  // Content Operations
  // ============================================================================

  private async checkContentFreshness(startTime: number): Promise<TaskResult> {
    if (!this.env) {
      return { success: false, error: 'Environment not set', duration: 0 };
    }

    const issues: string[] = [];

    // Check inspirational batches
    const batchList = await this.env.PRESENCE_KV.list({ prefix: 'inspiration:batch:' });
    const batchCount = batchList.keys.length;

    if (batchCount < CONTENT_CONFIG.minActiveBatches) {
      issues.push(`Low batch count: ${batchCount} (minimum: ${CONTENT_CONFIG.minActiveBatches})`);
    }

    // Check current batch exists
    const currentBatchId = await this.env.PRESENCE_KV.get('inspiration:currentBatchId');
    if (!currentBatchId) {
      issues.push('No current batch ID set');
    } else {
      const currentBatch = await this.env.PRESENCE_KV.get(`inspiration:batch:${currentBatchId}`);
      if (!currentBatch) {
        issues.push(`Current batch ${currentBatchId} not found`);
      }
    }

    // Log operation
    this.logOperation('checkFreshness', 'inspirational', batchCount, {
      issues,
      currentBatchId,
    });

    const isHealthy = issues.length === 0;

    this.log(isHealthy ? 'info' : 'warn', 'Content freshness check', {
      batchCount,
      issues,
    });

    return {
      success: isHealthy,
      data: {
        batchCount,
        currentBatchId,
        issues,
        healthy: isHealthy,
      },
      duration: Date.now() - startTime,
    };
  }

  private async cleanupStaleContent(
    params: { dryRun?: boolean },
    startTime: number,
  ): Promise<TaskResult> {
    if (!this.env) {
      return { success: false, error: 'Environment not set', duration: 0 };
    }

    const { dryRun = false } = params;
    const deleted: string[] = [];
    const kept: string[] = [];

    // Get all batches
    const batchList = await this.env.PRESENCE_KV.list({ prefix: 'inspiration:batch:' });

    // Get current batch ID to protect it
    const currentBatchId = await this.env.PRESENCE_KV.get('inspiration:currentBatchId');

    // Analyze each batch
    for (const key of batchList.keys) {
      const batchId = key.name.replace('inspiration:batch:', '');

      // Never delete current batch
      if (batchId === currentBatchId) {
        kept.push(batchId);
        continue;
      }

      // Check if batch is stale (would need metadata for proper staleness check)
      // For now, keep if under max limit
      if (kept.length < CONTENT_CONFIG.maxStoredBatches) {
        kept.push(batchId);
      } else {
        deleted.push(batchId);
        if (!dryRun) {
          await this.env.PRESENCE_KV.delete(key.name);
        }
      }
    }

    // Cleanup user overrides
    const overrideList = await this.env.PRESENCE_KV.list({ prefix: 'inspiration:override:' });
    let overridesDeleted = 0;

    for (const key of overrideList.keys) {
      const override = await this.env.PRESENCE_KV.get(key.name, 'json');
      // biome-ignore lint/suspicious/noExplicitAny: KV returns untyped data
      if (override && (override as any).expiresAt < Date.now()) {
        if (!dryRun) {
          await this.env.PRESENCE_KV.delete(key.name);
        }
        overridesDeleted++;
      }
    }

    // Log operation
    this.logOperation('cleanup', 'inspirational', deleted.length, {
      dryRun,
      batchesDeleted: deleted.length,
      batchesKept: kept.length,
      overridesDeleted,
    });

    this.log('info', 'Content cleanup', {
      dryRun,
      batchesDeleted: deleted.length,
      overridesDeleted,
    });

    return {
      success: true,
      data: {
        dryRun,
        batches: { deleted: deleted.length, kept: kept.length },
        overrides: { deleted: overridesDeleted },
      },
      duration: Date.now() - startTime,
    };
  }

  private async getContentStats(startTime: number): Promise<TaskResult> {
    if (!this.env) {
      return { success: false, error: 'Environment not set', duration: 0 };
    }

    // Inspirational batches
    const batchList = await this.env.PRESENCE_KV.list({ prefix: 'inspiration:batch:' });
    const currentBatchId = await this.env.PRESENCE_KV.get('inspiration:currentBatchId');

    // User overrides
    const overrideList = await this.env.PRESENCE_KV.list({ prefix: 'inspiration:override:' });

    // Presence data
    const presenceKeys = await this.env.PRESENCE_KV.list({ prefix: 'presence:' });

    const stats = {
      inspirational: {
        batches: batchList.keys.length,
        currentBatchId,
        overrides: overrideList.keys.length,
      },
      presence: {
        keys: presenceKeys.keys.length,
      },
      totals: {
        kvKeys: batchList.keys.length + overrideList.keys.length + presenceKeys.keys.length,
      },
    };

    this.log('info', 'Content stats retrieved', stats);

    return {
      success: true,
      data: stats,
      duration: Date.now() - startTime,
    };
  }

  private async syncInventory(startTime: number): Promise<TaskResult> {
    if (!this.env) {
      return { success: false, error: 'Environment not set', duration: 0 };
    }

    // Clear existing inventory
    this.sql.exec('DELETE FROM content_inventory');

    // Sync batches
    const batchList = await this.env.PRESENCE_KV.list({ prefix: 'inspiration:batch:' });
    let synced = 0;

    for (const key of batchList.keys) {
      const content = await this.env.PRESENCE_KV.get(key.name);
      if (content) {
        this.sql.exec(
          `
          INSERT INTO content_inventory (id, content_type, key, size_bytes, last_accessed)
          VALUES (?, ?, ?, ?, datetime('now'))
        `,
          key.name,
          'batch',
          key.name,
          content.length,
        );
        synced++;
      }
    }

    this.logOperation('syncInventory', 'all', synced, { synced });

    return {
      success: true,
      data: { synced },
      duration: Date.now() - startTime,
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private logOperation(
    operation: string,
    contentType: string,
    affectedCount: number,
    details?: unknown,
  ): void {
    this.sql.exec(
      `
      INSERT INTO content_operations (operation, content_type, affected_count, details)
      VALUES (?, ?, ?, ?)
    `,
      operation,
      contentType,
      affectedCount,
      details ? JSON.stringify(details) : null,
    );
  }

  // ============================================================================
  // Custom Routes
  // ============================================================================

  protected handleCustomRoute(request: Request, path: string): Response | Promise<Response> {
    // Content statistics
    if (path === '/stats' && request.method === 'GET') {
      return this.handleGetStats();
    }

    // Inventory
    if (path === '/inventory' && request.method === 'GET') {
      const inventory = this.sql
        .exec('SELECT * FROM content_inventory ORDER BY content_type, key')
        .toArray();
      return this.jsonResponse({ inventory });
    }

    // Operations log
    if (path === '/operations' && request.method === 'GET') {
      const operations = this.sql
        .exec('SELECT * FROM content_operations ORDER BY performed_at DESC LIMIT 100')
        .toArray();
      return this.jsonResponse({ operations });
    }

    // Trigger sync
    if (path === '/sync' && request.method === 'POST') {
      const taskId = this.createTask('syncInventory', {});
      const task = this.getTask(taskId);
      if (task) {
        this.runTask(task);
      }
      return this.jsonResponse({ taskId, status: 'started' }, 202);
    }

    return this.jsonResponse({ error: 'Not found' }, 404);
  }

  private async handleGetStats(): Promise<Response> {
    const taskId = this.createTask('getContentStats', {});
    const task = this.getTask(taskId);
    if (task) {
      const result = await this.runTask(task);
      return this.jsonResponse(result.data);
    }
    return this.jsonResponse({ error: 'Failed to get stats' }, 500);
  }
}
