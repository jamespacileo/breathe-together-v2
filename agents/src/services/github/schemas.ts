/**
 * GitHub API Zod Schemas
 *
 * Runtime validation schemas for GitHub API responses.
 * Ensures type safety and provides clear error messages on API changes.
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const GitHubUserSchema = z.object({
  login: z.string(),
  avatar_url: z.string().url(),
  id: z.number().optional(),
});

export const GitHubLabelSchema = z.object({
  name: z.string(),
  color: z.string(),
  id: z.number().optional(),
  description: z.string().nullable().optional(),
});

// ============================================================================
// Pull Request Schemas
// ============================================================================

export const GitHubPRSchema = z.object({
  number: z.number(),
  title: z.string(),
  state: z.enum(['open', 'closed']),
  html_url: z.string().url(),
  head: z.object({
    ref: z.string(),
    sha: z.string(),
  }),
  base: z.object({
    ref: z.string(),
  }),
  user: GitHubUserSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  draft: z.boolean(),
  labels: z.array(GitHubLabelSchema),
  mergeable: z.boolean().nullable().optional(),
  merged: z.boolean().optional(),
});

export const GitHubPRListSchema = z.array(GitHubPRSchema);

// ============================================================================
// Workflow Run Schemas
// ============================================================================

export const GitHubWorkflowRunSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  head_branch: z.string().nullable(),
  head_sha: z.string(),
  status: z.enum(['queued', 'in_progress', 'completed', 'waiting', 'requested', 'pending']),
  conclusion: z
    .enum(['success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required', 'neutral'])
    .nullable(),
  html_url: z.string().url(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  run_number: z.number().optional(),
  run_attempt: z.number().optional(),
});

export const GitHubWorkflowRunsResponseSchema = z.object({
  total_count: z.number().optional(),
  workflow_runs: z.array(GitHubWorkflowRunSchema),
});

// ============================================================================
// Deployment Schemas
// ============================================================================

export const GitHubDeploymentSchema = z.object({
  id: z.number(),
  ref: z.string(),
  sha: z.string(),
  environment: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  statuses_url: z.string().url(),
  description: z.string().nullable().optional(),
});

export const GitHubDeploymentStatusSchema = z.object({
  id: z.number(),
  state: z.enum(['error', 'failure', 'inactive', 'in_progress', 'queued', 'pending', 'success']),
  environment_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  description: z.string().nullable().optional(),
});

export const GitHubDeploymentsListSchema = z.array(GitHubDeploymentSchema);
export const GitHubDeploymentStatusesListSchema = z.array(GitHubDeploymentStatusSchema);

// ============================================================================
// Check Run Schemas (for status checks)
// ============================================================================

export const GitHubCheckRunSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(['queued', 'in_progress', 'completed']),
  conclusion: z
    .enum(['success', 'failure', 'neutral', 'cancelled', 'skipped', 'timed_out', 'action_required'])
    .nullable(),
  html_url: z.string().url().nullable(),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
});

export const GitHubCheckRunsResponseSchema = z.object({
  total_count: z.number(),
  check_runs: z.array(GitHubCheckRunSchema),
});

// ============================================================================
// Rate Limit Schema
// ============================================================================

export const GitHubRateLimitSchema = z.object({
  resources: z.object({
    core: z.object({
      limit: z.number(),
      remaining: z.number(),
      reset: z.number(),
      used: z.number(),
    }),
  }),
  rate: z.object({
    limit: z.number(),
    remaining: z.number(),
    reset: z.number(),
    used: z.number(),
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GitHubUser = z.infer<typeof GitHubUserSchema>;
export type GitHubLabel = z.infer<typeof GitHubLabelSchema>;
export type GitHubPR = z.infer<typeof GitHubPRSchema>;
export type GitHubWorkflowRun = z.infer<typeof GitHubWorkflowRunSchema>;
export type GitHubWorkflowRunsResponse = z.infer<typeof GitHubWorkflowRunsResponseSchema>;
export type GitHubDeployment = z.infer<typeof GitHubDeploymentSchema>;
export type GitHubDeploymentStatus = z.infer<typeof GitHubDeploymentStatusSchema>;
export type GitHubCheckRun = z.infer<typeof GitHubCheckRunSchema>;
export type GitHubCheckRunsResponse = z.infer<typeof GitHubCheckRunsResponseSchema>;
export type GitHubRateLimit = z.infer<typeof GitHubRateLimitSchema>;
