# Testing Guide

This document describes testing strategies for the Cloudflare Agents service, following [official Cloudflare testing guidelines](https://developers.cloudflare.com/workers/testing/).

## Test Categories

| Category | Purpose | Tools | Speed |
|----------|---------|-------|-------|
| **Unit Tests** | Test pure functions in isolation | Vitest | Fast |
| **Integration Tests** | Test agent behavior with mocked bindings | Vitest + Miniflare | Medium |
| **E2E Tests** | Test deployed worker | Vitest + fetch | Slow |

---

## Running Tests

```bash
# Run all tests
npm run agents:test

# Run with watch mode
npm run agents:test -- --watch

# Run specific test file
npm run agents:test -- src/__tests__/pipelines.test.ts

# Run with coverage
npm run agents:test -- --coverage

# Run only unit tests (fast)
npm run agents:test -- --testNamePattern="unit"

# Run only integration tests
npm run agents:test -- --testNamePattern="integration"
```

---

## Test Structure

```
agents/src/__tests__/
├── unit/                     # Pure function tests (no I/O)
│   ├── pipelines.test.ts    # Pipeline definitions
│   ├── registry.test.ts     # Agent registry logic
│   └── types.test.ts        # Type guards and validators
│
├── integration/              # Tests with mocked Cloudflare bindings
│   ├── health-agent.test.ts # Health agent with mock KV
│   ├── github-agent.test.ts # GitHub agent with mock API
│   └── orchestrator.test.ts # Pipeline orchestration
│
└── e2e/                      # End-to-end tests (requires deployed worker)
    └── smoke.test.ts        # Basic endpoint checks
```

---

## Unit Tests

Unit tests are fast and don't require Cloudflare bindings.

### Example: Testing Pipeline Definitions

```typescript
// src/__tests__/unit/pipelines.test.ts
import { describe, expect, it } from 'vitest';
import { getPipeline, PIPELINES } from '../../pipelines';

describe('unit: Pipeline Definitions', () => {
  it('all pipelines have unique IDs', () => {
    const ids = PIPELINES.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all steps reference valid agent types', () => {
    const validAgents = ['orchestrator', 'health', 'content', 'github'];

    for (const pipeline of PIPELINES) {
      for (const step of pipeline.steps) {
        expect(validAgents).toContain(step.agent);
      }
    }
  });

  it('scheduled pipelines have valid cron expressions', () => {
    const cronRegex = /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/;

    for (const pipeline of PIPELINES) {
      if (pipeline.schedule) {
        expect(pipeline.schedule).toMatch(cronRegex);
      }
    }
  });
});
```

---

## Integration Tests

Integration tests use Miniflare to simulate Cloudflare bindings locally.

### Setup with `unstable_dev`

```typescript
// src/__tests__/integration/health-agent.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

describe('integration: HealthAgent', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      config: 'wrangler.toml',
      experimental: { disableExperimentalWarning: true },
      local: true,
      persist: false, // Fresh state each test run
    });
  }, 30000); // 30s timeout for worker startup

  afterAll(async () => {
    await worker?.stop();
  });

  it('returns agent metadata', async () => {
    const response = await worker.fetch('/agents/health/metadata');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.type).toBe('health');
    expect(data.version).toBeDefined();
    expect(Array.isArray(data.tools)).toBe(true);
  });

  it('creates and retrieves tasks', async () => {
    // Create task
    const createRes = await worker.fetch('/agents/health/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'checkEndpoint',
        payload: { url: 'https://example.com' },
      }),
    });
    expect(createRes.status).toBe(201);

    const { taskId } = await createRes.json();
    expect(taskId).toBeDefined();

    // Retrieve task
    const getRes = await worker.fetch(`/agents/health/tasks/${taskId}`);
    expect(getRes.status).toBe(200);

    const task = await getRes.json();
    expect(task.name).toBe('checkEndpoint');
  });
});
```

### Mocking External APIs

For tests that call external APIs (GitHub, Vertex AI), use MSW or fetch mocking:

```typescript
// src/__tests__/integration/github-agent.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

// Mock fetch globally for external API calls
const mockFetch = vi.fn();

describe('integration: GitHubAgent', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    // Mock GitHub API responses
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('api.github.com/repos') && url.includes('/pulls')) {
        return new Response(JSON.stringify([
          {
            number: 123,
            title: 'Test PR',
            head: { ref: 'feature/test' },
            user: { login: 'testuser' },
            state: 'open',
          },
        ]), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    });

    worker = await unstable_dev('src/index.ts', {
      config: 'wrangler.toml',
      local: true,
      persist: false,
    });
  }, 30000);

  afterEach(() => {
    mockFetch.mockClear();
  });

  afterAll(async () => {
    await worker?.stop();
  });

  it('fetches open PRs', async () => {
    const response = await worker.fetch('/agents/github/prs');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.prs)).toBe(true);
  });
});
```

---

## Testing Durable Objects

Durable Objects require special handling in tests.

### Testing State Persistence

```typescript
describe('integration: Durable Object State', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      config: 'wrangler.toml',
      local: true,
      persist: true, // Persist state between requests
    });
  });

  it('maintains state across requests', async () => {
    // Create a task
    await worker.fetch('/agents/health/tasks', {
      method: 'POST',
      body: JSON.stringify({ name: 'test', payload: {} }),
    });

    // State should persist
    const response = await worker.fetch('/agents/health/state');
    const state = await response.json();
    expect(state.tasksCompleted).toBeGreaterThanOrEqual(0);
  });
});
```

### Testing SQLite Queries

```typescript
describe('integration: SQLite Operations', () => {
  it('handles concurrent task creation', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      worker.fetch('/agents/health/tasks', {
        method: 'POST',
        body: JSON.stringify({ name: `task-${i}`, payload: {} }),
      })
    );

    const responses = await Promise.all(promises);
    const allSuccessful = responses.every(r => r.status === 201);
    expect(allSuccessful).toBe(true);
  });
});
```

---

## Testing Scheduled Events

Cron triggers can be tested using the `__SCHEDULED__` endpoint.

```typescript
describe('integration: Scheduled Events', () => {
  it('handles cron trigger', async () => {
    // Simulate cron trigger
    const response = await worker.fetch('/__scheduled', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cron: '*/15 * * * *', // Quick health check cron
      }),
    });

    // Should not error (may return 200 or 204)
    expect(response.status).toBeLessThan(400);
  });
});
```

---

## Test Fixtures

Create reusable fixtures for common test data:

```typescript
// src/__tests__/fixtures/index.ts
export const mockPR = {
  number: 123,
  title: 'Add new feature',
  head: { ref: 'feature/new-feature', sha: 'abc123' },
  base: { ref: 'main' },
  user: { login: 'developer' },
  state: 'open',
  draft: false,
  updated_at: new Date().toISOString(),
  mergeable_state: 'clean',
};

export const mockWorkflowRun = {
  id: 456,
  name: 'CI',
  status: 'completed',
  conclusion: 'success',
  head_sha: 'abc123',
};

export const mockTask = {
  name: 'checkEndpoint',
  payload: {
    url: 'https://example.com',
    expectedStatus: 200,
  },
};
```

---

## Vitest Configuration

```typescript
// agents/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Avoid port conflicts
      },
    },
    // Categorize tests
    typecheck: {
      enabled: true,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/**/*.test.ts'],
    },
  },
});
```

---

## Best Practices

### 1. Isolate Tests

Each test should be independent and not rely on state from other tests.

```typescript
// ❌ Bad: Shared state
let taskId: string;

it('creates task', async () => {
  taskId = await createTask();
});

it('retrieves task', async () => {
  await getTask(taskId); // Depends on previous test
});

// ✅ Good: Self-contained
it('creates and retrieves task', async () => {
  const taskId = await createTask();
  const task = await getTask(taskId);
  expect(task).toBeDefined();
});
```

### 2. Test Error Cases

```typescript
it('returns 400 for invalid task name', async () => {
  const response = await worker.fetch('/agents/health/tasks', {
    method: 'POST',
    body: JSON.stringify({ name: '', payload: {} }), // Empty name
  });
  expect(response.status).toBe(400);
});

it('returns 404 for unknown task ID', async () => {
  const response = await worker.fetch('/agents/health/tasks/nonexistent');
  expect(response.status).toBe(404);
});
```

### 3. Test Retry Logic

```typescript
it('retries failed tasks with backoff', async () => {
  // Create task that will fail
  const { taskId } = await createTask('willFail', { shouldFail: true });

  // Wait for retry
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check retry count increased
  const task = await getTask(taskId);
  expect(task.retryCount).toBeGreaterThan(0);
});
```

### 4. Use Descriptive Test Names

```typescript
// ❌ Vague
it('works', () => { /* ... */ });

// ✅ Descriptive
it('returns 200 with agent metadata when GET /agents/health/metadata', () => { /* ... */ });
```

---

## CI/CD Integration

Add to GitHub Actions:

```yaml
# .github/workflows/agents-test.yml
name: Agents Tests

on:
  push:
    paths:
      - 'agents/**'
  pull_request:
    paths:
      - 'agents/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Type Check
        run: npm run agents:typecheck

      - name: Run Tests
        run: npm run agents:test -- --coverage

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: agents/coverage/coverage-final.json
          flags: agents
```

---

## Debugging Tests

### Verbose Output

```bash
npm run agents:test -- --reporter=verbose
```

### Debug Single Test

```bash
npm run agents:test -- --testNamePattern="creates task" --reporter=verbose
```

### Inspect Worker Logs

```typescript
beforeAll(async () => {
  worker = await unstable_dev('src/index.ts', {
    config: 'wrangler.toml',
    local: true,
    logLevel: 'debug', // Enable debug logs
  });
});
```
