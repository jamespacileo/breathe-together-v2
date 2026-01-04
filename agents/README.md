# Cloudflare Agents - Breathe Together

Autonomous agents for maintenance, health monitoring, and content management.

## Overview

This package provides utility agents built on the Cloudflare Agents SDK (Durable Objects) that handle:

- **Health monitoring** - Endpoint checks, KV latency measurements, alerting
- **Content maintenance** - Inspirational message batch management, stale content cleanup
- **Pipeline orchestration** - Multi-step workflows coordinated across agents

## Quick Start

```bash
# Development (runs on port 8788)
npm run agents:dev

# Type checking
npm run agents:typecheck

# Run tests
npm run agents:test

# Deploy to production
npm run agents:deploy
```

## Architecture

```
agents/
├── src/
│   ├── index.ts           # Entry point, exports Durable Objects
│   ├── router.ts          # HTTP request routing
│   │
│   ├── core/              # Shared infrastructure
│   │   ├── base-agent.ts  # Base class with SQLite, scheduling
│   │   ├── registry.ts    # Agent type resolution
│   │   └── types.ts       # TypeScript types
│   │
│   ├── agents/            # Individual agents
│   │   ├── orchestrator/  # Pipeline coordination
│   │   ├── health/        # Health monitoring
│   │   └── content/       # Content maintenance
│   │
│   └── pipelines/         # Multi-step workflows
│       └── index.ts       # Pipeline definitions
│
├── wrangler.toml          # Cloudflare config
└── README.md
```

## Agents

### OrchestratorAgent

Master agent for pipeline coordination and task delegation.

**Tools:**
- `runPipeline` - Execute a multi-step pipeline
- `delegateTask` - Send task to another agent
- `getPipelineStatus` - Check pipeline run status
- `cancelPipeline` - Cancel a running pipeline

### HealthAgent

Health monitoring and diagnostics.

**Tools:**
- `checkEndpoint` - HTTP health check with latency measurement
- `checkKVLatency` - Measure KV read/write latency
- `runHealthScan` - Comprehensive health scan
- `getHealthReport` - Aggregated health report

### ContentAgent

Content maintenance and management.

**Tools:**
- `checkContentFreshness` - Verify content isn't stale
- `cleanupStaleContent` - Remove old/unused content
- `syncInventory` - Sync content inventory from KV
- `getContentStats` - Content inventory statistics

## Pipelines

Pre-configured multi-step workflows:

| Pipeline | Schedule | Description |
|----------|----------|-------------|
| `comprehensive-health` | Every 6 hours | Full health scan of all endpoints |
| `daily-maintenance` | 4 AM UTC | Daily cleanup and health verification |
| `weekly-maintenance` | Sunday 3 AM | Deep maintenance with inventory sync |
| `content-refresh` | Manual | Check and refresh stale content |

## API Endpoints

```
GET  /                           # Service info
GET  /health                     # Quick health status
GET  /agents                     # List all agents
GET  /agents/:type/metadata      # Agent metadata
GET  /agents/:type/state         # Agent state
GET  /agents/:type/tasks         # List tasks
POST /agents/:type/tasks         # Create task
GET  /pipelines                  # List pipelines
POST /pipelines/run              # Trigger pipeline
GET  /pipelines/runs             # List pipeline runs
GET  /pipelines/runs/:id         # Pipeline run status
```

## Adding a New Agent

1. Create directory: `src/agents/myagent/`

2. Create the agent class:

```typescript
// src/agents/myagent/index.ts
import { BaseAgent } from '../../core/base-agent';
import type { AgentType, Task, TaskResult } from '../../core/types';

export class MyAgent extends BaseAgent {
  readonly agentType: AgentType = 'myagent';
  readonly version = '1.0.0';
  readonly description = 'My custom agent';
  readonly tools = ['myTask'];

  protected initializeSchema(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS my_data (
        id TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }

  protected async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    switch (task.name) {
      case 'myTask':
        // Implementation here
        return { success: true, duration: Date.now() - startTime };
      default:
        return { success: false, error: 'Unknown task', duration: 0 };
    }
  }
}
```

3. Register in `wrangler.toml`:

```toml
[durable_objects]
bindings = [
  # ... existing bindings
  { name = "MYAGENT", class_name = "MyAgent" },
]

[[migrations]]
tag = "v2"
new_classes = ["MyAgent"]
```

4. Add to registry (`src/core/registry.ts`) and types (`src/core/types.ts`)

5. Export from `src/index.ts`

## Adding a New Pipeline

Add to `src/pipelines/index.ts`:

```typescript
export const myPipeline: Pipeline = {
  id: 'my-pipeline',
  name: 'My Pipeline',
  description: 'Does something useful',
  schedule: '0 12 * * *', // Optional: noon UTC daily
  steps: [
    {
      id: 'step-1',
      agent: 'health',
      task: 'checkEndpoint',
      params: { url: 'https://example.com' },
    },
    {
      id: 'step-2',
      agent: 'content',
      task: 'getContentStats',
      params: {},
      condition: (prev) => prev[0].success, // Only if step-1 succeeded
    },
  ],
};

// Add to PIPELINES array
export const PIPELINES: Pipeline[] = [
  // ... existing
  myPipeline,
];
```

## Local Testing

The agents service runs separately from the main presence worker:

```bash
# Terminal 1: Presence worker (port 8787)
npm run worker:dev

# Terminal 2: Agents service (port 8788)
npm run agents:dev
```

Test with curl:

```bash
# Health check
curl http://localhost:8788/health

# List agents
curl http://localhost:8788/agents

# Trigger health scan
curl -X POST http://localhost:8788/agents/health/tasks \
  -H "Content-Type: application/json" \
  -d '{"name": "runHealthScan", "payload": {"quick": true}}'

# Trigger pipeline
curl -X POST http://localhost:8788/pipelines/run \
  -H "Content-Type: application/json" \
  -d '{"pipelineId": "daily-maintenance"}'
```

## Deployment

Agents are deployed separately from the main app and are NOT deployed on PR previews.

```bash
# Deploy to production
npm run agents:deploy

# Deploy to staging (for testing)
npm run agents:deploy -- --env staging
```

## Cost Model

Each Durable Object incurs:
- **Duration**: ~$0.001/GB-second
- **Requests**: First 1M free, then $0.15/million
- **Storage**: First 1GB free, then $0.20/GB-month

Expected cost at moderate usage: **<$5/month**
