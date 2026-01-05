/**
 * OrchestratorAgent - Master agent for pipeline coordination
 *
 * Responsibilities:
 * - Execute multi-step pipelines
 * - Delegate tasks to specialized agents
 * - Track pipeline run state
 * - Handle scheduled triggers
 *
 * Patterns implemented:
 * - Orchestrator-Worker: Delegates to child agents
 * - Chronic Sentinel: Self-healing via alarm rescheduling
 */

import { BaseAgent } from '../../core/base-agent';
import { forwardToAgent, parseAgentType } from '../../core/registry';
import type {
  AgentType,
  Env,
  Pipeline,
  PipelineRun,
  PipelineStep,
  Task,
  TaskResult,
} from '../../core/types';
import { PIPELINES } from '../../pipelines';

export class OrchestratorAgent extends BaseAgent {
  readonly agentType: AgentType = 'orchestrator';
  readonly version = '1.0.0';
  readonly description = 'Master orchestrator for pipeline execution and task delegation';
  readonly tools = ['runPipeline', 'delegateTask', 'getPipelineStatus', 'cancelPipeline'];

  private env: Env | null = null;

  setEnv(env: Env): void {
    this.env = env;
  }

  protected initializeSchema(): void {
    this.sql.exec(`
      -- Pipeline runs tracking
      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id TEXT PRIMARY KEY,
        pipeline_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        current_step INTEGER NOT NULL DEFAULT 0,
        step_results TEXT NOT NULL DEFAULT '[]',
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
      CREATE INDEX IF NOT EXISTS idx_pipeline_runs_pipeline ON pipeline_runs(pipeline_id);

      -- Delegated tasks tracking (tasks sent to other agents)
      CREATE TABLE IF NOT EXISTS delegated_tasks (
        id TEXT PRIMARY KEY,
        pipeline_run_id TEXT,
        agent_type TEXT NOT NULL,
        task_name TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending',
        result TEXT,
        error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );
    `);
  }

  // ============================================================================
  // Task Execution
  // ============================================================================

  protected async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    switch (task.name) {
      case 'runPipeline':
        return this.executePipeline(task.payload as { pipelineId: string }, startTime);

      case 'delegateTask':
        return this.executeDelegatedTask(
          task.payload as { agentType: string; taskName: string; params: unknown },
          startTime,
        );

      case 'continuePipeline':
        return this.continuePipelineRun(task.payload as { runId: string }, startTime);

      default:
        return {
          success: false,
          error: `Unknown task: ${task.name}`,
          duration: Date.now() - startTime,
        };
    }
  }

  // ============================================================================
  // Pipeline Execution
  // ============================================================================

  private async executePipeline(
    params: { pipelineId: string },
    startTime: number,
  ): Promise<TaskResult> {
    const pipeline = PIPELINES.find((p) => p.id === params.pipelineId);
    if (!pipeline) {
      return {
        success: false,
        error: `Pipeline not found: ${params.pipelineId}`,
        duration: Date.now() - startTime,
      };
    }

    // Create pipeline run record
    const runId = crypto.randomUUID();
    this.sql.exec(`INSERT INTO pipeline_runs (id, pipeline_id) VALUES (?, ?)`, runId, pipeline.id);

    this.log('info', `Starting pipeline: ${pipeline.name}`, { runId, pipelineId: pipeline.id });

    // Execute first step
    const result = await this.executeStep(runId, pipeline, 0, []);

    return {
      success: result.success,
      data: { runId, pipelineId: pipeline.id, firstStepResult: result },
      duration: Date.now() - startTime,
    };
  }

  private async executeStep(
    runId: string,
    pipeline: Pipeline,
    stepIndex: number,
    previousResults: TaskResult[],
  ): Promise<TaskResult> {
    const step = pipeline.steps[stepIndex];
    if (!step) {
      // All steps completed
      this.completePipelineRun(runId, previousResults);
      return {
        success: true,
        data: { completed: true, results: previousResults },
        duration: 0,
      };
    }

    // Check condition if present
    if (step.condition && !step.condition(previousResults)) {
      this.log('info', `Skipping step due to condition`, { runId, stepIndex, stepId: step.id });
      return this.executeStep(runId, pipeline, stepIndex + 1, previousResults);
    }

    // Update current step
    this.sql.exec(`UPDATE pipeline_runs SET current_step = ? WHERE id = ?`, stepIndex, runId);

    // Delegate to agent
    const result = await this.delegateToAgent(step);

    // Store result
    const results = [...previousResults, result];
    this.sql.exec(
      `UPDATE pipeline_runs SET step_results = ? WHERE id = ?`,
      JSON.stringify(results),
      runId,
    );

    // Handle step failure
    if (!result.success && !step.continueOnError) {
      this.failPipelineRun(runId, `Step ${step.id} failed: ${result.error}`);
      return result;
    }

    // Continue to next step (schedule as task to avoid deep call stacks)
    this.createTask('continuePipeline', { runId, pipeline, stepIndex: stepIndex + 1, results });

    return result;
  }

  private async continuePipelineRun(
    params: { runId: string },
    startTime: number,
  ): Promise<TaskResult> {
    const run = this.getPipelineRun(params.runId);
    if (!run || run.status !== 'running') {
      return {
        success: false,
        error: 'Pipeline run not found or not running',
        duration: Date.now() - startTime,
      };
    }

    const pipeline = PIPELINES.find((p) => p.id === run.pipelineId);
    if (!pipeline) {
      return {
        success: false,
        error: 'Pipeline definition not found',
        duration: Date.now() - startTime,
      };
    }

    return this.executeStep(run.id, pipeline, run.currentStep + 1, run.stepResults);
  }

  private async delegateToAgent(step: PipelineStep): Promise<TaskResult> {
    if (!this.env) {
      return { success: false, error: 'Environment not set', duration: 0 };
    }

    const startTime = Date.now();

    try {
      const agentType = parseAgentType(step.agent);
      const response = await forwardToAgent(this.env, agentType, '/tasks', {
        method: 'POST',
        body: {
          name: step.task,
          payload: step.params,
        },
      });

      const data = await response.json();

      return {
        success: response.ok,
        data,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delegation failed',
        duration: Date.now() - startTime,
      };
    }
  }

  // ============================================================================
  // Delegated Task Execution (single task, not pipeline)
  // ============================================================================

  private async executeDelegatedTask(
    params: { agentType: string; taskName: string; params: unknown },
    startTime: number,
  ): Promise<TaskResult> {
    if (!this.env) {
      return { success: false, error: 'Environment not set', duration: 0 };
    }

    try {
      const agentType = parseAgentType(params.agentType);
      const response = await forwardToAgent(this.env, agentType, '/tasks', {
        method: 'POST',
        body: {
          name: params.taskName,
          payload: params.params,
        },
      });

      const data = await response.json();

      return {
        success: response.ok,
        data,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delegation failed',
        duration: Date.now() - startTime,
      };
    }
  }

  // ============================================================================
  // Pipeline Run Management
  // ============================================================================

  private getPipelineRun(runId: string): PipelineRun | null {
    const row = this.sql.exec('SELECT * FROM pipeline_runs WHERE id = ?', runId).one();
    if (!row) return null;

    return {
      id: row.id as string,
      pipelineId: row.pipeline_id as string,
      status: row.status as PipelineRun['status'],
      currentStep: row.current_step as number,
      stepResults: JSON.parse((row.step_results as string) || '[]'),
      startedAt: row.started_at as string,
      completedAt: (row.completed_at as string) || undefined,
      error: (row.error as string) || undefined,
    };
  }

  private completePipelineRun(runId: string, results: TaskResult[]): void {
    this.sql.exec(
      `
      UPDATE pipeline_runs SET
        status = 'completed',
        step_results = ?,
        completed_at = datetime('now')
      WHERE id = ?
    `,
      JSON.stringify(results),
      runId,
    );

    this.log('info', 'Pipeline completed', { runId });
  }

  private failPipelineRun(runId: string, error: string): void {
    this.sql.exec(
      `
      UPDATE pipeline_runs SET
        status = 'failed',
        error = ?,
        completed_at = datetime('now')
      WHERE id = ?
    `,
      error,
      runId,
    );

    this.log('error', 'Pipeline failed', { runId, error });
  }

  // ============================================================================
  // Custom Routes
  // ============================================================================

  protected handleCustomRoute(request: Request, path: string): Response | Promise<Response> {
    // List available pipelines
    if (path === '/pipelines' && request.method === 'GET') {
      return this.jsonResponse({
        pipelines: PIPELINES.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          steps: p.steps.length,
          schedule: p.schedule,
        })),
      });
    }

    // Get pipeline run status
    if (path.startsWith('/pipelines/runs/') && request.method === 'GET') {
      const runId = path.split('/')[3];
      const run = this.getPipelineRun(runId);
      if (!run) {
        return this.jsonResponse({ error: 'Run not found' }, 404);
      }
      return this.jsonResponse(run);
    }

    // List pipeline runs
    if (path === '/pipelines/runs' && request.method === 'GET') {
      const runs = this.sql
        .exec('SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 50')
        .toArray()
        .map((row) => ({
          id: row.id,
          pipelineId: row.pipeline_id,
          status: row.status,
          currentStep: row.current_step,
          startedAt: row.started_at,
          completedAt: row.completed_at,
        }));

      return this.jsonResponse({ runs });
    }

    // Trigger pipeline
    if (path === '/pipelines/run' && request.method === 'POST') {
      return this.handleTriggerPipeline(request);
    }

    return this.jsonResponse({ error: 'Not found' }, 404);
  }

  private async handleTriggerPipeline(request: Request): Promise<Response> {
    const body = (await request.json()) as { pipelineId: string };
    if (!body.pipelineId) {
      return this.jsonResponse({ error: 'pipelineId required' }, 400);
    }

    const taskId = this.createTask('runPipeline', { pipelineId: body.pipelineId });

    // Run immediately
    const task = this.getTask(taskId);
    if (task) {
      this.runTask(task);
    }

    return this.jsonResponse({ taskId, status: 'started' }, 202);
  }
}
