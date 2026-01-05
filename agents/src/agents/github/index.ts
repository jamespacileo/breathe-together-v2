/**
 * GitHubAgent - GitHub integration and PR monitoring
 *
 * Responsibilities:
 * - Track open pull requests
 * - Monitor preview deployments and their URLs
 * - Track workflow/action status
 * - Provide PR summaries for dashboard
 *
 * Tools:
 * - fetchOpenPRs: Get all open pull requests with metadata
 * - fetchPRDeployments: Get preview URLs for a PR
 * - fetchWorkflowRuns: Get recent workflow runs and statuses
 * - refreshPRData: Full refresh of all PR data
 */

import { BaseAgent } from '../../core/base-agent';
import type { AgentType, Env, Task, TaskResult } from '../../core/types';

// GitHub API types
interface GitHubPR {
  number: number;
  title: string;
  state: string;
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  draft: boolean;
  labels: Array<{ name: string; color: string }>;
}

interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

interface GitHubDeployment {
  id: number;
  ref: string;
  sha: string;
  environment: string;
  created_at: string;
  statuses_url: string;
}

interface GitHubDeploymentStatus {
  id: number;
  state: string;
  environment_url: string | null;
  created_at: string;
}

export class GitHubAgent extends BaseAgent {
  readonly agentType: AgentType = 'github';
  readonly version = '1.0.0';
  readonly description = 'GitHub integration, PR tracking, and deployment monitoring';
  readonly tools = ['fetchOpenPRs', 'fetchPRDeployments', 'fetchWorkflowRuns', 'refreshPRData'];

  private env: Env | null = null;

  setEnv(env: Env): void {
    this.env = env;
  }

  protected initializeSchema(): void {
    this.sql.exec(`
      -- Pull requests cache
      CREATE TABLE IF NOT EXISTS pull_requests (
        number INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        state TEXT NOT NULL,
        html_url TEXT NOT NULL,
        branch TEXT NOT NULL,
        head_sha TEXT NOT NULL,
        base_branch TEXT NOT NULL,
        author TEXT NOT NULL,
        author_avatar TEXT,
        is_draft INTEGER NOT NULL DEFAULT 0,
        labels TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_prs_state ON pull_requests(state);
      CREATE INDEX IF NOT EXISTS idx_prs_branch ON pull_requests(branch);

      -- Deployments cache
      CREATE TABLE IF NOT EXISTS deployments (
        id INTEGER PRIMARY KEY,
        pr_number INTEGER,
        ref TEXT NOT NULL,
        sha TEXT NOT NULL,
        environment TEXT NOT NULL,
        preview_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (pr_number) REFERENCES pull_requests(number)
      );

      CREATE INDEX IF NOT EXISTS idx_deployments_pr ON deployments(pr_number);
      CREATE INDEX IF NOT EXISTS idx_deployments_env ON deployments(environment);

      -- Workflow runs cache
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        head_branch TEXT,
        head_sha TEXT NOT NULL,
        status TEXT NOT NULL,
        conclusion TEXT,
        html_url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_workflows_branch ON workflow_runs(head_branch);
      CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflow_runs(status);

      -- Cleanup old data (keep last 100 workflow runs)
      CREATE TRIGGER IF NOT EXISTS workflow_runs_cleanup
      AFTER INSERT ON workflow_runs
      WHEN (SELECT COUNT(*) FROM workflow_runs) > 100
      BEGIN
        DELETE FROM workflow_runs WHERE id IN (
          SELECT id FROM workflow_runs ORDER BY created_at ASC LIMIT 10
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
      case 'fetchOpenPRs':
        return this.fetchOpenPRs(startTime);

      case 'fetchPRDeployments':
        return this.fetchPRDeployments(task.payload as { prNumber?: number }, startTime);

      case 'fetchWorkflowRuns':
        return this.fetchWorkflowRuns(
          task.payload as { branch?: string; limit?: number },
          startTime,
        );

      case 'refreshPRData':
        return this.refreshPRData(startTime);

      default:
        return {
          success: false,
          error: `Unknown task: ${task.name}`,
          duration: Date.now() - startTime,
        };
    }
  }

  // ============================================================================
  // GitHub API Helpers
  // ============================================================================

  private getApiConfig(): { baseUrl: string; headers: HeadersInit } | null {
    if (!this.env) {
      return null;
    }

    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'BreatheTogether-GitHubAgent/1.0',
    };

    if (this.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${this.env.GITHUB_TOKEN}`;
    }

    return {
      baseUrl: `${this.env.GITHUB_API_URL}/repos/${this.env.GITHUB_OWNER}/${this.env.GITHUB_REPO}`,
      headers,
    };
  }

  private async fetchGitHub<T>(endpoint: string): Promise<T | null> {
    const config = this.getApiConfig();
    if (!config) {
      this.log('error', 'GitHub API config not available');
      return null;
    }

    try {
      const response = await fetch(`${config.baseUrl}${endpoint}`, {
        headers: config.headers,
      });

      if (!response.ok) {
        this.log('error', `GitHub API error: ${response.status}`, {
          endpoint,
          status: response.status,
        });
        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      this.log(
        'error',
        `GitHub API fetch failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        {
          endpoint,
        },
      );
      return null;
    }
  }

  // ============================================================================
  // Task Implementations
  // ============================================================================

  private async fetchOpenPRs(startTime: number): Promise<TaskResult> {
    const prs = await this.fetchGitHub<GitHubPR[]>('/pulls?state=open&per_page=50');

    if (!prs) {
      return {
        success: false,
        error: 'Failed to fetch PRs from GitHub API',
        duration: Date.now() - startTime,
      };
    }

    // Update local cache
    for (const pr of prs) {
      this.sql.exec(
        `
        INSERT OR REPLACE INTO pull_requests
        (number, title, state, html_url, branch, head_sha, base_branch, author, author_avatar, is_draft, labels, created_at, updated_at, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
        pr.number,
        pr.title,
        pr.state,
        pr.html_url,
        pr.head.ref,
        pr.head.sha,
        pr.base.ref,
        pr.user.login,
        pr.user.avatar_url,
        pr.draft ? 1 : 0,
        JSON.stringify(pr.labels),
        pr.created_at,
        pr.updated_at,
      );
    }

    // Remove closed PRs from cache
    const openNumbers = prs.map((pr) => pr.number);
    if (openNumbers.length > 0) {
      this.sql.exec(
        `DELETE FROM pull_requests WHERE state = 'open' AND number NOT IN (${openNumbers.join(',')})`,
      );
    }

    this.log('info', `Fetched ${prs.length} open PRs`);

    return {
      success: true,
      data: {
        count: prs.length,
        prs: prs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          branch: pr.head.ref,
          author: pr.user.login,
          draft: pr.draft,
          url: pr.html_url,
        })),
      },
      duration: Date.now() - startTime,
    };
  }

  private async fetchPRDeployments(
    params: { prNumber?: number },
    startTime: number,
  ): Promise<TaskResult> {
    // Fetch deployments from GitHub
    const deployments = await this.fetchGitHub<GitHubDeployment[]>('/deployments?per_page=50');

    if (!deployments) {
      return {
        success: false,
        error: 'Failed to fetch deployments from GitHub API',
        duration: Date.now() - startTime,
      };
    }

    const results: Array<{
      id: number;
      environment: string;
      ref: string;
      previewUrl: string | null;
      status: string;
    }> = [];

    for (const deployment of deployments) {
      // Get deployment status to find preview URL
      const statuses = await this.fetchGitHub<GitHubDeploymentStatus[]>(
        `/deployments/${deployment.id}/statuses`,
      );

      const latestStatus = statuses?.[0];
      const previewUrl = latestStatus?.environment_url ?? null;
      const status = latestStatus?.state ?? 'pending';

      // Find associated PR by ref/sha
      const pr = this.sql
        .exec(
          `SELECT number FROM pull_requests WHERE branch = ? OR head_sha = ?`,
          deployment.ref,
          deployment.sha,
        )
        .one();

      // Update cache
      this.sql.exec(
        `
        INSERT OR REPLACE INTO deployments
        (id, pr_number, ref, sha, environment, preview_url, status, created_at, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
        deployment.id,
        pr ? (pr.number as number) : null,
        deployment.ref,
        deployment.sha,
        deployment.environment,
        previewUrl,
        status,
        deployment.created_at,
      );

      // Only include if filtering by PR or no filter
      if (!params.prNumber || (pr && (pr.number as number) === params.prNumber)) {
        results.push({
          id: deployment.id,
          environment: deployment.environment,
          ref: deployment.ref,
          previewUrl,
          status,
        });
      }
    }

    this.log('info', `Fetched ${deployments.length} deployments, ${results.length} match filter`);

    return {
      success: true,
      data: {
        total: deployments.length,
        filtered: results.length,
        deployments: results,
      },
      duration: Date.now() - startTime,
    };
  }

  private async fetchWorkflowRuns(
    params: { branch?: string; limit?: number },
    startTime: number,
  ): Promise<TaskResult> {
    const { branch, limit = 20 } = params;

    let endpoint = `/actions/runs?per_page=${limit}`;
    if (branch) {
      endpoint += `&branch=${encodeURIComponent(branch)}`;
    }

    const response = await this.fetchGitHub<{ workflow_runs: GitHubWorkflowRun[] }>(endpoint);

    if (!response) {
      return {
        success: false,
        error: 'Failed to fetch workflow runs from GitHub API',
        duration: Date.now() - startTime,
      };
    }

    const runs = response.workflow_runs;

    // Update cache
    for (const run of runs) {
      this.sql.exec(
        `
        INSERT OR REPLACE INTO workflow_runs
        (id, name, head_branch, head_sha, status, conclusion, html_url, created_at, updated_at, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
        run.id,
        run.name,
        run.head_branch,
        run.head_sha,
        run.status,
        run.conclusion,
        run.html_url,
        run.created_at,
        run.updated_at,
      );
    }

    this.log('info', `Fetched ${runs.length} workflow runs`);

    return {
      success: true,
      data: {
        count: runs.length,
        runs: runs.map((run) => ({
          id: run.id,
          name: run.name,
          branch: run.head_branch,
          status: run.status,
          conclusion: run.conclusion,
          url: run.html_url,
        })),
      },
      duration: Date.now() - startTime,
    };
  }

  private async refreshPRData(startTime: number): Promise<TaskResult> {
    // Full refresh: PRs → Deployments → Workflows
    const prResult = await this.fetchOpenPRs(Date.now());
    if (!prResult.success) {
      return { ...prResult, duration: Date.now() - startTime };
    }

    const deployResult = await this.fetchPRDeployments({}, Date.now());
    const workflowResult = await this.fetchWorkflowRuns({ limit: 30 }, Date.now());

    const success = prResult.success && deployResult.success && workflowResult.success;

    this.log('info', 'PR data refresh complete', {
      prs: (prResult.data as { count: number }).count,
      deployments:
        success && deployResult.data ? (deployResult.data as { total: number }).total : 0,
      workflows:
        success && workflowResult.data ? (workflowResult.data as { count: number }).count : 0,
    });

    return {
      success,
      data: {
        prs: prResult.data,
        deployments: deployResult.data,
        workflows: workflowResult.data,
      },
      duration: Date.now() - startTime,
    };
  }

  // ============================================================================
  // Custom Routes
  // ============================================================================

  protected handleCustomRoute(request: Request, path: string): Response | Promise<Response> {
    const url = new URL(request.url);

    // List all open PRs with their deployments
    if (path === '/prs' && request.method === 'GET') {
      return this.getPRsWithDeployments();
    }

    // Get specific PR details
    const prMatch = path.match(/^\/prs\/(\d+)$/);
    if (prMatch && request.method === 'GET') {
      return this.getPRDetails(parseInt(prMatch[1], 10));
    }

    // List deployments
    if (path === '/deployments' && request.method === 'GET') {
      const environment = url.searchParams.get('environment');
      return this.getDeployments(environment);
    }

    // List workflow runs
    if (path === '/workflows' && request.method === 'GET') {
      const branch = url.searchParams.get('branch');
      const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
      return this.getWorkflowRuns(branch, limit);
    }

    // Dashboard summary
    if (path === '/summary' && request.method === 'GET') {
      return this.getDashboardSummary();
    }

    return this.jsonResponse({ error: 'Not found' }, 404);
  }

  private getPRsWithDeployments(): Response {
    const prs = this.sql
      .exec(`SELECT * FROM pull_requests WHERE state = 'open' ORDER BY updated_at DESC`)
      .toArray();

    const result = prs.map((pr: Record<string, unknown>) => {
      const deployments = this.sql
        .exec(
          `SELECT * FROM deployments WHERE pr_number = ? ORDER BY created_at DESC`,
          pr.number as number,
        )
        .toArray();

      const workflows = this.sql
        .exec(
          `SELECT * FROM workflow_runs WHERE head_branch = ? ORDER BY created_at DESC LIMIT 5`,
          pr.branch as string,
        )
        .toArray();

      return {
        ...pr,
        labels: pr.labels ? JSON.parse(pr.labels as string) : [],
        deployments: deployments.map((d: Record<string, unknown>) => ({
          id: d.id,
          environment: d.environment,
          previewUrl: d.preview_url,
          status: d.status,
        })),
        workflows: workflows.map((w: Record<string, unknown>) => ({
          id: w.id,
          name: w.name,
          status: w.status,
          conclusion: w.conclusion,
          url: w.html_url,
        })),
      };
    });

    return this.jsonResponse({ prs: result });
  }

  private getPRDetails(prNumber: number): Response {
    const pr = this.sql.exec(`SELECT * FROM pull_requests WHERE number = ?`, prNumber).one();

    if (!pr) {
      return this.jsonResponse({ error: 'PR not found' }, 404);
    }

    const deployments = this.sql
      .exec(`SELECT * FROM deployments WHERE pr_number = ? ORDER BY created_at DESC`, prNumber)
      .toArray();

    const workflows = this.sql
      .exec(
        `SELECT * FROM workflow_runs WHERE head_branch = ? ORDER BY created_at DESC LIMIT 10`,
        pr.branch as string,
      )
      .toArray();

    return this.jsonResponse({
      pr: {
        ...pr,
        labels: pr.labels ? JSON.parse(pr.labels as string) : [],
      },
      deployments,
      workflows,
    });
  }

  private getDeployments(environment: string | null): Response {
    const query = environment
      ? `SELECT d.*, pr.title as pr_title FROM deployments d LEFT JOIN pull_requests pr ON d.pr_number = pr.number WHERE d.environment = ? ORDER BY d.created_at DESC`
      : `SELECT d.*, pr.title as pr_title FROM deployments d LEFT JOIN pull_requests pr ON d.pr_number = pr.number ORDER BY d.created_at DESC LIMIT 50`;

    const deployments = environment
      ? this.sql.exec(query, environment).toArray()
      : this.sql.exec(query).toArray();

    return this.jsonResponse({ deployments });
  }

  private getWorkflowRuns(branch: string | null, limit: number): Response {
    const query = branch
      ? `SELECT * FROM workflow_runs WHERE head_branch = ? ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM workflow_runs ORDER BY created_at DESC LIMIT ?`;

    const runs = branch
      ? this.sql.exec(query, branch, limit).toArray()
      : this.sql.exec(query, limit).toArray();

    return this.jsonResponse({ runs });
  }

  private getDashboardSummary(): Response {
    // Open PRs count
    const prCount = this.sql
      .exec(`SELECT COUNT(*) as count FROM pull_requests WHERE state = 'open'`)
      .one();

    // Draft vs ready
    const prStats = this.sql
      .exec(
        `SELECT
          SUM(CASE WHEN is_draft = 1 THEN 1 ELSE 0 END) as drafts,
          SUM(CASE WHEN is_draft = 0 THEN 1 ELSE 0 END) as ready
        FROM pull_requests WHERE state = 'open'`,
      )
      .one();

    // Active deployments
    const deploymentStats = this.sql
      .exec(
        `SELECT
          environment,
          COUNT(*) as count,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful
        FROM deployments
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY environment`,
      )
      .toArray();

    // Recent workflow status
    const workflowStats = this.sql
      .exec(
        `SELECT
          status,
          conclusion,
          COUNT(*) as count
        FROM workflow_runs
        WHERE created_at > datetime('now', '-24 hours')
        GROUP BY status, conclusion`,
      )
      .toArray();

    // Most recent PRs
    const recentPRs = this.sql
      .exec(
        `SELECT number, title, author, branch, is_draft, updated_at
        FROM pull_requests
        WHERE state = 'open'
        ORDER BY updated_at DESC
        LIMIT 5`,
      )
      .toArray();

    return this.jsonResponse({
      summary: {
        openPRs: (prCount?.count as number) ?? 0,
        draftPRs: (prStats?.drafts as number) ?? 0,
        readyPRs: (prStats?.ready as number) ?? 0,
      },
      deployments: deploymentStats,
      workflows: workflowStats,
      recentPRs,
      lastUpdated: new Date().toISOString(),
    });
  }
}
