/**
 * Core types for the Agents SDK implementation
 *
 * These types define the contract for agents, tasks, and pipelines.
 */

import type { z } from 'zod';

// ============================================================================
// Environment Types
// ============================================================================

export interface Env {
  // Durable Object bindings
  ORCHESTRATOR: DurableObjectNamespace;
  HEALTH: DurableObjectNamespace;
  CONTENT: DurableObjectNamespace;
  GITHUB: DurableObjectNamespace;

  // KV bindings (shared with presence worker)
  PRESENCE_KV: KVNamespace;

  // Core environment variables
  ENVIRONMENT: string;

  // GitHub integration
  GITHUB_TOKEN?: string; // Secret
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_API_URL: string;

  // LLM / Vertex AI configuration
  LLM_PROVIDER: 'vertex' | 'openai' | 'anthropic';
  LLM_MODEL: string;
  VERTEX_PROJECT_ID: string;
  VERTEX_LOCATION: string;
  GOOGLE_SERVICE_ACCOUNT_KEY?: string; // Secret

  // Cloudflare Pages
  PAGES_PROJECT_NAME: string;
}

// ============================================================================
// Task Types
// ============================================================================

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Task {
  id: string;
  name: string;
  payload: unknown;
  status: TaskStatus;
  result?: unknown;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  scheduledFor?: string;
}

export interface TaskResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
}

// ============================================================================
// Agent Types
// ============================================================================

export type AgentType = 'orchestrator' | 'health' | 'content' | 'github';

export interface AgentMetadata {
  type: AgentType;
  version: string;
  description: string;
  tools: string[];
}

export interface AgentState {
  id: string;
  type: AgentType;
  status: 'idle' | 'busy' | 'error';
  lastActivity: string;
  tasksCompleted: number;
  tasksFailed: number;
}

// ============================================================================
// Pipeline Types
// ============================================================================

export interface PipelineStep<T = unknown> {
  id: string;
  agent: AgentType;
  task: string;
  params: T;
  /** Condition function - receives results from previous steps */
  condition?: (previousResults: TaskResult[]) => boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to continue pipeline if this step fails */
  continueOnError?: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  /** Cron expression for scheduled execution */
  schedule?: string;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  stepResults: TaskResult[];
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// ============================================================================
// Tool Types (for LLM integration)
// ============================================================================

export interface ToolDefinition<T extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: T;
  handler: (params: z.infer<T>) => Promise<unknown>;
}

// ============================================================================
// Scheduled Event Types
// ============================================================================

export type ScheduleType =
  | 'health-quick' // Every 15 min
  | 'health-full' // Every 6 hours
  | 'maintenance-daily' // 4 AM UTC
  | 'maintenance-weekly' // Sunday 3 AM UTC
  | 'github-refresh'; // Every 5 min

export interface ScheduledTask {
  type: ScheduleType;
  cron: string;
  pipeline?: string;
  agent?: AgentType;
  task?: string;
  description: string;
}

export const SCHEDULED_TASKS: ScheduledTask[] = [
  {
    type: 'health-quick',
    cron: '*/15 * * * *',
    agent: 'health',
    task: 'runHealthScan',
    description: 'Quick health check of critical endpoints',
  },
  {
    type: 'health-full',
    cron: '0 */6 * * *',
    pipeline: 'comprehensive-health',
    description: 'Full health scan including latency measurements',
  },
  {
    type: 'maintenance-daily',
    cron: '0 4 * * *',
    pipeline: 'daily-maintenance',
    description: 'Daily cleanup and optimization tasks',
  },
  {
    type: 'maintenance-weekly',
    cron: '0 3 * * 0',
    pipeline: 'weekly-maintenance',
    description: 'Deep maintenance including data compaction',
  },
  {
    type: 'github-refresh',
    cron: '*/5 * * * *',
    agent: 'github',
    task: 'refreshPRData',
    description: 'Refresh open PR status and deployments',
  },
];

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface AgentListResponse {
  agents: AgentState[];
  timestamp: number;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  timestamp: number;
}

export interface PipelineListResponse {
  pipelines: Pipeline[];
  timestamp: number;
}
