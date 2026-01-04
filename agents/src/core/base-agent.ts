/**
 * BaseAgent - Foundation class for all Cloudflare Agents
 *
 * Provides:
 * - SQLite-backed task persistence
 * - Self-healing schedule/retry patterns
 * - Standard task lifecycle management
 * - Alarm-based deferred execution
 *
 * Usage:
 *   class MyAgent extends BaseAgent {
 *     protected initializeSchema() {
 *       // Create agent-specific tables
 *     }
 *     async executeTask(task: Task): Promise<TaskResult> {
 *       // Handle task execution
 *     }
 *   }
 */

import type { AgentMetadata, AgentState, AgentType, Task, TaskResult, TaskStatus } from './types';

export abstract class BaseAgent {
  protected state: DurableObjectState;
  protected sql: SqlStorage;
  protected agentId: string;

  // Agent metadata - override in subclasses
  abstract readonly agentType: AgentType;
  abstract readonly version: string;
  abstract readonly description: string;
  abstract readonly tools: string[];

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sql = state.storage.sql;
    this.agentId = state.id.toString();

    // Initialize base schema
    this.initializeBaseSchema();

    // Initialize agent-specific schema
    this.initializeSchema();
  }

  // ============================================================================
  // Schema Initialization
  // ============================================================================

  private initializeBaseSchema(): void {
    this.sql.exec(`
      -- Tasks table for tracking all work items
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending',
        result TEXT,
        error TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        started_at TEXT,
        completed_at TEXT,
        scheduled_for TEXT
      );

      -- Index for efficient status queries
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduled_for);

      -- Agent state table
      CREATE TABLE IF NOT EXISTS agent_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Logs table for observability
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        context TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Keep only last 1000 log entries
      CREATE TRIGGER IF NOT EXISTS logs_cleanup
      AFTER INSERT ON logs
      WHEN (SELECT COUNT(*) FROM logs) > 1000
      BEGIN
        DELETE FROM logs WHERE id IN (
          SELECT id FROM logs ORDER BY id ASC LIMIT 100
        );
      END;
    `);
  }

  /** Override to create agent-specific tables */
  protected abstract initializeSchema(): void;

  // ============================================================================
  // Task Management
  // ============================================================================

  /**
   * Create a new task and optionally schedule it
   */
  protected createTask(
    name: string,
    payload: unknown = {},
    options: { maxRetries?: number; scheduleFor?: Date } = {},
  ): string {
    const id = crypto.randomUUID();
    const { maxRetries = 3, scheduleFor } = options;

    this.sql.exec(
      `
      INSERT INTO tasks (id, name, payload, max_retries, scheduled_for)
      VALUES (?, ?, ?, ?, ?)
    `,
      id,
      name,
      JSON.stringify(payload),
      maxRetries,
      scheduleFor?.toISOString() ?? null,
    );

    this.log('info', `Task created: ${name}`, { taskId: id });

    // Schedule alarm if deferred
    if (scheduleFor) {
      this.scheduleAlarm(scheduleFor.getTime());
    }

    return id;
  }

  /**
   * Get a task by ID
   */
  protected getTask(taskId: string): Task | null {
    const row = this.sql.exec('SELECT * FROM tasks WHERE id = ?', taskId).one();
    return row ? this.rowToTask(row) : null;
  }

  /**
   * Get pending tasks (optionally filtered by name)
   */
  protected getPendingTasks(name?: string): Task[] {
    const query = name
      ? 'SELECT * FROM tasks WHERE status = ? AND name = ? ORDER BY created_at ASC'
      : 'SELECT * FROM tasks WHERE status = ? ORDER BY created_at ASC';

    const cursor = name ? this.sql.exec(query, 'pending', name) : this.sql.exec(query, 'pending');

    return cursor.toArray().map((row) => this.rowToTask(row));
  }

  /**
   * Update task status
   */
  protected updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    extra: { result?: unknown; error?: string } = {},
  ): void {
    const now = new Date().toISOString();
    const startedAt = status === 'running' ? now : null;
    const completedAt = ['completed', 'failed', 'cancelled'].includes(status) ? now : null;

    this.sql.exec(
      `
      UPDATE tasks SET
        status = ?,
        result = COALESCE(?, result),
        error = COALESCE(?, error),
        started_at = COALESCE(?, started_at),
        completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `,
      status,
      extra.result ? JSON.stringify(extra.result) : null,
      extra.error ?? null,
      startedAt,
      completedAt,
      taskId,
    );
  }

  /**
   * Increment retry count and optionally reschedule
   */
  protected retryTask(taskId: string, delayMs: number = 60000): boolean {
    const task = this.getTask(taskId);
    if (!task) return false;

    if (task.retryCount >= task.maxRetries) {
      this.updateTaskStatus(taskId, 'failed', {
        error: `Max retries (${task.maxRetries}) exceeded`,
      });
      return false;
    }

    const scheduledFor = new Date(Date.now() + delayMs);

    this.sql.exec(
      `
      UPDATE tasks SET
        status = 'pending',
        retry_count = retry_count + 1,
        scheduled_for = ?
      WHERE id = ?
    `,
      scheduledFor.toISOString(),
      taskId,
    );

    this.scheduleAlarm(scheduledFor.getTime());
    this.log('info', `Task scheduled for retry`, {
      taskId,
      retryCount: task.retryCount + 1,
      scheduledFor: scheduledFor.toISOString(),
    });

    return true;
  }

  private rowToTask(row: Record<string, SqlStorageValue>): Task {
    return {
      id: row.id as string,
      name: row.name as string,
      payload: JSON.parse((row.payload as string) || '{}'),
      status: row.status as TaskStatus,
      result: row.result ? JSON.parse(row.result as string) : undefined,
      error: (row.error as string) || undefined,
      retryCount: row.retry_count as number,
      maxRetries: row.max_retries as number,
      createdAt: row.created_at as string,
      startedAt: (row.started_at as string) || undefined,
      completedAt: (row.completed_at as string) || undefined,
      scheduledFor: (row.scheduled_for as string) || undefined,
    };
  }

  // ============================================================================
  // Scheduling & Alarms
  // ============================================================================

  /**
   * Schedule an alarm to wake the agent at a specific time
   */
  protected scheduleAlarm(timestamp: number): void {
    this.state.storage.setAlarm(timestamp);
  }

  /**
   * Schedule a retry with exponential backoff
   */
  protected scheduleRetryWithBackoff(taskId: string, attempt: number): void {
    // Exponential backoff: 2^attempt * 1000ms (1s, 2s, 4s, 8s, 16s...)
    const delayMs = Math.min(2 ** attempt * 1000, 300000); // Max 5 minutes
    this.retryTask(taskId, delayMs);
  }

  /**
   * Handle alarm - process scheduled tasks
   */
  async alarm(): Promise<void> {
    this.log('debug', 'Alarm triggered');

    // Find tasks that are due
    const now = new Date().toISOString();
    const dueTasks = this.sql
      .exec(
        `
      SELECT * FROM tasks
      WHERE status = 'pending'
        AND (scheduled_for IS NULL OR scheduled_for <= ?)
      ORDER BY created_at ASC
      LIMIT 10
    `,
        now,
      )
      .toArray()
      .map((row) => this.rowToTask(row));

    for (const task of dueTasks) {
      await this.runTask(task);
    }

    // Check if there are more scheduled tasks
    const nextTask = this.sql
      .exec(
        `
      SELECT scheduled_for FROM tasks
      WHERE status = 'pending' AND scheduled_for > ?
      ORDER BY scheduled_for ASC LIMIT 1
    `,
        now,
      )
      .one();

    if (nextTask?.scheduled_for) {
      const nextTime = new Date(nextTask.scheduled_for as string).getTime();
      this.scheduleAlarm(nextTime);
    }
  }

  // ============================================================================
  // Task Execution
  // ============================================================================

  /**
   * Run a single task with error handling
   */
  protected async runTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      this.updateTaskStatus(task.id, 'running');
      this.log('info', `Starting task: ${task.name}`, { taskId: task.id });

      const result = await this.executeTask(task);

      this.updateTaskStatus(task.id, 'completed', { result: result.data });
      this.log('info', `Task completed: ${task.name}`, {
        taskId: task.id,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Task failed: ${task.name}`, { taskId: task.id, error: errorMessage });

      // Attempt retry with backoff
      const retried = this.retryTask(task.id, Math.min(2 ** task.retryCount * 1000, 300000));

      if (!retried) {
        this.updateTaskStatus(task.id, 'failed', { error: errorMessage });
      }

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  /** Override to handle specific task execution */
  protected abstract executeTask(task: Task): Promise<TaskResult>;

  // ============================================================================
  // Logging
  // ============================================================================

  protected log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: unknown,
  ): void {
    this.sql.exec(
      `INSERT INTO logs (level, message, context) VALUES (?, ?, ?)`,
      level,
      message,
      context ? JSON.stringify(context) : null,
    );

    // Also log to console for development
    const prefix = `[${this.agentType}]`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';

    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}${contextStr}`);
        break;
      case 'info':
        console.info(`${prefix} ${message}${contextStr}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}${contextStr}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}${contextStr}`);
        break;
    }
  }

  // ============================================================================
  // State & Metadata
  // ============================================================================

  protected setState(key: string, value: unknown): void {
    this.sql.exec(
      `
      INSERT OR REPLACE INTO agent_state (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `,
      key,
      JSON.stringify(value),
    );
  }

  protected getState<T>(key: string): T | null {
    const row = this.sql.exec('SELECT value FROM agent_state WHERE key = ?', key).one();
    return row ? JSON.parse(row.value as string) : null;
  }

  getMetadata(): AgentMetadata {
    return {
      type: this.agentType,
      version: this.version,
      description: this.description,
      tools: this.tools,
    };
  }

  getAgentState(): AgentState {
    const stats = this.sql
      .exec(
        `
      SELECT
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        MAX(completed_at) as last_activity
      FROM tasks
    `,
      )
      .one();

    const runningCount = this.sql
      .exec(`SELECT COUNT(*) as count FROM tasks WHERE status = 'running'`)
      .one();

    return {
      id: this.agentId,
      type: this.agentType,
      status: (runningCount?.count as number) > 0 ? 'busy' : 'idle',
      lastActivity: (stats?.last_activity as string) || new Date().toISOString(),
      tasksCompleted: (stats?.completed as number) || 0,
      tasksFailed: (stats?.failed as number) || 0,
    };
  }

  // ============================================================================
  // HTTP Interface
  // ============================================================================

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: HTTP router requires branching for each route pattern
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Agent metadata
      if (path === '/metadata' && request.method === 'GET') {
        return this.jsonResponse(this.getMetadata());
      }

      // Agent state
      if (path === '/state' && request.method === 'GET') {
        return this.jsonResponse(this.getAgentState());
      }

      // List tasks
      if (path === '/tasks' && request.method === 'GET') {
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);

        const query = status
          ? `SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC LIMIT ?`
          : `SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?`;

        const cursor = status ? this.sql.exec(query, status, limit) : this.sql.exec(query, limit);

        const tasks = cursor.toArray().map((row) => this.rowToTask(row));
        return this.jsonResponse({ tasks, total: tasks.length });
      }

      // Get specific task
      if (path.startsWith('/tasks/') && request.method === 'GET') {
        const taskId = path.split('/')[2];
        const task = this.getTask(taskId);
        if (!task) {
          return this.jsonResponse({ error: 'Task not found' }, 404);
        }
        return this.jsonResponse(task);
      }

      // Create task
      if (path === '/tasks' && request.method === 'POST') {
        const body = (await request.json()) as {
          name: string;
          payload?: unknown;
          maxRetries?: number;
          scheduleFor?: string;
        };

        if (!body.name) {
          return this.jsonResponse({ error: 'Task name required' }, 400);
        }

        const taskId = this.createTask(body.name, body.payload || {}, {
          maxRetries: body.maxRetries,
          scheduleFor: body.scheduleFor ? new Date(body.scheduleFor) : undefined,
        });

        // Run immediately if not scheduled
        if (!body.scheduleFor) {
          const task = this.getTask(taskId);
          if (task) {
            // Don't await - let it run async
            this.runTask(task);
          }
        }

        return this.jsonResponse({ taskId, status: 'created' }, 201);
      }

      // Get logs
      if (path === '/logs' && request.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);
        const level = url.searchParams.get('level');

        const query = level
          ? `SELECT * FROM logs WHERE level = ? ORDER BY id DESC LIMIT ?`
          : `SELECT * FROM logs ORDER BY id DESC LIMIT ?`;

        const cursor = level ? this.sql.exec(query, level, limit) : this.sql.exec(query, limit);

        return this.jsonResponse({ logs: cursor.toArray() });
      }

      // Subclass-specific routes
      return this.handleCustomRoute(request, path);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      this.log('error', 'Request failed', { path, error: message });
      return this.jsonResponse({ error: message }, 500);
    }
  }

  /** Override to add custom routes */
  protected handleCustomRoute(_request: Request, _path: string): Response | Promise<Response> {
    return this.jsonResponse({ error: 'Not found' }, 404);
  }

  protected jsonResponse(data: unknown, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
