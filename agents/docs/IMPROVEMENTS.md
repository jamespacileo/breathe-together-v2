# Agents Improvement Proposals

Analysis of potential libraries, design patterns, and workflows to enhance the Cloudflare Agents service.

---

## 1. Library Additions

### 1.1 Schema Validation: Zod (Already Installed)

**Current Status**: Imported but underutilized

**Proposal**: Add runtime validation for all external data

```typescript
// Example: GitHub API response validation
const GitHubPRSchema = z.object({
  number: z.number(),
  title: z.string(),
  state: z.enum(['open', 'closed']),
  head: z.object({
    ref: z.string(),
    sha: z.string(),
  }),
  draft: z.boolean(),
});

// Usage in GitHubAgent
const prs = GitHubPRSchema.array().parse(await response.json());
```

| Pros | Cons |
|------|------|
| Already installed (zero bundle cost) | Adds validation overhead |
| Type-safe runtime validation | Need to maintain schemas alongside types |
| Better error messages for malformed data | |
| Can generate TypeScript types from schemas | |

**Recommendation**: ✅ Implement - Low effort, high value

---

### 1.2 HTTP Client: `ky` or `ofetch`

**Current Status**: Using raw `fetch()` with manual error handling

**Proposal**: Lightweight HTTP client with built-in retries

```typescript
// With ky
import ky from 'ky';

const github = ky.create({
  prefixUrl: 'https://api.github.com',
  headers: { Authorization: `Bearer ${token}` },
  retry: { limit: 3, methods: ['get'] },
  timeout: 10000,
});

const prs = await github.get('repos/owner/repo/pulls').json();
```

| Library | Size | Pros | Cons |
|---------|------|------|------|
| **ky** | 3.5KB | Retry logic, timeout, hooks, widely used | Another dependency |
| **ofetch** | 2KB | Smaller, auto-retry, JSON parsing | Less mature |
| **Native fetch** | 0KB | No dependency | Manual retry/timeout logic |

**Recommendation**: ⚠️ Consider - Current manual approach works, but error-prone

---

### 1.3 Rate Limiting: `bottleneck` or `p-limit`

**Current Status**: No rate limiting for GitHub API calls

**Proposal**: Add rate limiter for external API calls

```typescript
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 100, // 10 requests/second max
});

// Wrap all GitHub API calls
const fetchPRs = limiter.wrap(async () => {
  return fetch('https://api.github.com/repos/.../pulls');
});
```

| Library | Pros | Cons |
|---------|------|------|
| **bottleneck** | Clustering, persistence, queuing | Heavier (15KB) |
| **p-limit** | Simple, tiny (1KB) | No persistence |
| **Custom** | Cloudflare-native (Durable Objects) | More code to maintain |

**Recommendation**: ⚠️ Defer - Build custom with Durable Objects for persistence

---

### 1.4 Cron Parsing: `cron-parser`

**Current Status**: Manual cron validation (splits by space, checks 5 parts)

**Proposal**: Proper cron expression parsing and next-run calculation

```typescript
import parser from 'cron-parser';

const interval = parser.parseExpression('*/5 * * * *');
const nextRun = interval.next().toDate();
const prevRun = interval.prev().toDate();
```

| Pros | Cons |
|------|------|
| Accurate next/prev run calculation | 8KB dependency |
| Handles edge cases (leap years, DST) | May be overkill for simple crons |
| Good for debugging scheduled tasks | |

**Recommendation**: ✅ Implement - Useful for dashboard/debugging

---

### 1.5 Observability: `@opentelemetry/api`

**Current Status**: Logs to SQLite only, no external observability

**Proposal**: Add OpenTelemetry for distributed tracing

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('agents');

async function executeTask(task: Task) {
  return tracer.startActiveSpan('task.execute', async (span) => {
    span.setAttribute('task.id', task.id);
    span.setAttribute('task.type', task.name);
    try {
      const result = await doWork();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

| Pros | Cons |
|------|------|
| Industry standard | Larger bundle (~20KB) |
| Works with any backend (Datadog, Jaeger, etc.) | Requires collector setup |
| Distributed tracing across agents | Cloudflare Workers limitations |
| Built-in metrics support | |

**Recommendation**: ⚠️ Defer - Good for scale, but adds complexity. Start with Cloudflare's built-in analytics.

---

### 1.6 Testing: `@cloudflare/vitest-pool-workers`

**Current Status**: Using `unstable_dev` from wrangler (flaky)

**Proposal**: Official Cloudflare Vitest pool for Workers testing

```typescript
// vitest.config.ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});
```

| Pros | Cons |
|------|------|
| Official Cloudflare support | Newer, less documentation |
| Better Durable Objects testing | May require test restructuring |
| No `unstable_dev` flakiness | |
| Proper module resolution | |

**Recommendation**: ✅ Implement - More reliable integration tests

---

## 2. Design Patterns

### 2.1 Circuit Breaker Pattern

**Current Gap**: No protection against cascading failures

**Proposal**: Implement circuit breaker for external APIs

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure?: number;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure! > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

| Pros | Cons |
|------|------|
| Prevents cascade failures | More complex error handling |
| Fast-fail for known-bad services | State management complexity |
| Self-healing (half-open state) | May hide transient issues |

**Recommendation**: ✅ Implement for GitHub API calls

---

### 2.2 Event Sourcing (Light)

**Current**: Direct state updates via SQL

**Proposal**: Log all state changes as events

```typescript
interface AgentEvent {
  id: string;
  timestamp: number;
  type: 'task.created' | 'task.started' | 'task.completed' | 'alert.raised';
  payload: unknown;
  agentId: string;
}

// Store events, derive state
class EventStore {
  append(event: AgentEvent): void {
    this.sql.exec(`INSERT INTO events ...`);
  }

  replay(fromTimestamp?: number): AgentEvent[] {
    return this.sql.exec(`SELECT * FROM events WHERE timestamp > ?`);
  }
}
```

| Pros | Cons |
|------|------|
| Full audit trail | More storage |
| Time-travel debugging | Query complexity |
| Event replay for recovery | Learning curve |

**Recommendation**: ⚠️ Partial - Already have task history, add for alerts/pipelines

---

### 2.3 Saga Pattern for Pipelines

**Current**: Sequential step execution, no compensation

**Proposal**: Add rollback/compensation for failed pipelines

```typescript
interface PipelineStep {
  id: string;
  execute: (context: PipelineContext) => Promise<StepResult>;
  compensate?: (context: PipelineContext) => Promise<void>; // Rollback
}

async function runPipelineWithSaga(pipeline: Pipeline): Promise<void> {
  const completed: PipelineStep[] = [];

  for (const step of pipeline.steps) {
    try {
      await step.execute(context);
      completed.push(step);
    } catch (error) {
      // Rollback in reverse order
      for (const completedStep of completed.reverse()) {
        await completedStep.compensate?.(context);
      }
      throw error;
    }
  }
}
```

| Pros | Cons |
|------|------|
| Graceful failure handling | Not all operations are reversible |
| Consistent state after failures | More complex pipeline definitions |
| Better for multi-agent workflows | |

**Recommendation**: ⚠️ Consider - Useful for content/deployment pipelines

---

### 2.4 Command Query Responsibility Segregation (CQRS)

**Current**: Same methods for reads and writes

**Proposal**: Separate read/write paths

```typescript
// Commands (writes)
class TaskCommandHandler {
  async createTask(cmd: CreateTaskCommand): Promise<string> { ... }
  async cancelTask(cmd: CancelTaskCommand): Promise<void> { ... }
}

// Queries (reads)
class TaskQueryHandler {
  async getTask(id: string): Promise<Task> { ... }
  async listTasks(filter: TaskFilter): Promise<Task[]> { ... }
}
```

| Pros | Cons |
|------|------|
| Clearer code organization | Over-engineering for simple cases |
| Optimize reads/writes separately | More boilerplate |
| Better for complex queries | |

**Recommendation**: ❌ Skip - Current scale doesn't warrant this complexity

---

### 2.5 Plugin Architecture

**Current**: Hardcoded agent types and tools

**Proposal**: Dynamic agent/tool registration

```typescript
interface AgentPlugin {
  name: string;
  version: string;
  tools: ToolDefinition[];
  initialize(env: Env): Promise<void>;
}

class PluginRegistry {
  private plugins = new Map<string, AgentPlugin>();

  register(plugin: AgentPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  async executeToolFromPlugin(pluginName: string, toolName: string, params: unknown) {
    const plugin = this.plugins.get(pluginName);
    const tool = plugin?.tools.find(t => t.name === toolName);
    return tool?.execute(params);
  }
}
```

| Pros | Cons |
|------|------|
| Extensible without core changes | Dynamic loading complexity |
| Third-party integrations | Security considerations |
| Version management | Testing complexity |

**Recommendation**: ⚠️ Future - Good for extensibility, not needed yet

---

## 3. Additional Workflows

### 3.1 PR Preview Integration Workflow

**Purpose**: Notify agents when PR previews are deployed

```yaml
# .github/workflows/preview-notify-agents.yml
name: Notify Agents of Preview

on:
  deployment_status:
    types: [success]

jobs:
  notify-agents:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - name: Notify Agents Worker
        run: |
          curl -X POST "${{ secrets.AGENTS_URL }}/agents/github/tasks" \
            -H "Content-Type: application/json" \
            -d '{
              "name": "trackDeployment",
              "payload": {
                "prNumber": "${{ github.event.deployment.payload.pr_number }}",
                "environment": "${{ github.event.deployment.environment }}",
                "url": "${{ github.event.deployment_status.target_url }}"
              }
            }'
```

| Pros | Cons |
|------|------|
| Real-time deployment tracking | Requires AGENTS_URL secret |
| Better PR ↔ Deployment mapping | Additional workflow |
| Webhook-like behavior | |

---

### 3.2 Scheduled Health Report Workflow

**Purpose**: Generate and post weekly health reports

```yaml
# .github/workflows/weekly-health-report.yml
name: Weekly Health Report

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch Health Report
        id: health
        run: |
          REPORT=$(curl -s "${{ secrets.AGENTS_URL }}/agents/health/report?hours=168")
          echo "report=$REPORT" >> $GITHUB_OUTPUT

      - name: Create Issue if Score Low
        if: fromJSON(steps.health.outputs.report).healthScore < 90
        uses: actions/github-script@v7
        with:
          script: |
            const report = ${{ steps.health.outputs.report }};
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `⚠️ Weekly Health Report: Score ${report.healthScore}%`,
              body: `## Health Report\n\n- Score: ${report.healthScore}%\n- Checks: ${report.totalChecks}\n- Failures: ${report.failures}`,
              labels: ['health', 'automated']
            });
```

| Pros | Cons |
|------|------|
| Visibility into system health | GitHub API calls |
| Automated issue creation | May create noise |
| Historical tracking via issues | |

---

### 3.3 Dependency Update Workflow

**Purpose**: Track when dependencies are updated

```yaml
# .github/workflows/dependency-notify.yml
name: Dependency Update Notification

on:
  push:
    paths:
      - 'package.json'
      - 'package-lock.json'

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Detect Changes
        id: deps
        run: |
          CHANGES=$(git diff HEAD~1 package.json | grep '"version"' || echo "")
          echo "changes=$CHANGES" >> $GITHUB_OUTPUT

      - name: Notify Agents
        if: steps.deps.outputs.changes != ''
        run: |
          curl -X POST "${{ secrets.AGENTS_URL }}/agents/content/tasks" \
            -H "Content-Type: application/json" \
            -d '{"name": "trackDependencyUpdate", "payload": {}}'
```

---

### 3.4 Manual Agent Trigger Workflow

**Purpose**: Manually trigger agent tasks via GitHub Actions

```yaml
# .github/workflows/trigger-agent.yml
name: Trigger Agent Task

on:
  workflow_dispatch:
    inputs:
      agent:
        description: 'Agent type'
        required: true
        type: choice
        options: [health, github, content, orchestrator]
      task:
        description: 'Task name'
        required: true
        type: string
      payload:
        description: 'JSON payload'
        required: false
        default: '{}'

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Task
        run: |
          curl -X POST "${{ secrets.AGENTS_URL }}/agents/${{ inputs.agent }}/tasks" \
            -H "Content-Type: application/json" \
            -d '{
              "name": "${{ inputs.task }}",
              "payload": ${{ inputs.payload }}
            }'
```

| Pros | Cons |
|------|------|
| Manual intervention capability | Requires AGENTS_URL secret |
| Good for debugging | Could be misused |
| No direct Cloudflare access needed | |

---

### 3.5 Stale PR Cleanup Workflow

**Purpose**: Auto-close stale PRs and notify agents

```yaml
# .github/workflows/stale-pr-cleanup.yml
name: Stale PR Cleanup

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          stale-pr-message: 'This PR has been inactive for 30 days.'
          days-before-stale: 30
          days-before-close: 7
          stale-pr-label: 'stale'

      - name: Refresh Agents Data
        run: |
          curl -X POST "${{ secrets.AGENTS_URL }}/agents/github/tasks" \
            -H "Content-Type: application/json" \
            -d '{"name": "refreshPRData", "payload": {}}'
```

---

## 4. Priority Matrix

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Zod validation | High | Low | **P1** |
| Circuit breaker | High | Medium | **P1** |
| `@cloudflare/vitest-pool-workers` | High | Medium | **P1** |
| Cron parser | Medium | Low | **P2** |
| Manual trigger workflow | Medium | Low | **P2** |
| Weekly health report | Medium | Low | **P2** |
| Saga pattern | Medium | High | **P3** |
| Event sourcing | Low | High | **P4** |
| OpenTelemetry | Low | High | **P4** |
| Plugin architecture | Low | High | **P4** |

---

## 5. Quick Wins (< 1 hour each)

1. **Add Zod schemas** for GitHub API responses
2. **Add `cron-parser`** for better schedule debugging
3. **Create manual trigger workflow** (`workflow_dispatch`)
4. **Add circuit breaker** class (standalone, ~50 lines)
5. **Create weekly health report** workflow

---

## 6. Recommended Implementation Order

### Phase 1: Reliability (Week 1)
- [ ] Implement circuit breaker for GitHub API
- [ ] Add Zod validation for external data
- [ ] Switch to `@cloudflare/vitest-pool-workers`

### Phase 2: Observability (Week 2)
- [ ] Add `cron-parser` for schedule debugging
- [ ] Create weekly health report workflow
- [ ] Add manual agent trigger workflow

### Phase 3: Workflows (Week 3)
- [ ] PR preview notification workflow
- [ ] Dependency update tracking
- [ ] Stale PR cleanup integration

### Phase 4: Advanced (Future)
- [ ] Saga pattern for pipelines
- [ ] Light event sourcing for audits
- [ ] OpenTelemetry integration
