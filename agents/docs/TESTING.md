# Testing Guide

This document describes testing strategies for the Cloudflare Agents service, following [official Cloudflare testing guidelines](https://developers.cloudflare.com/workers/testing/).

## Test Categories

| Category | Purpose | Tools | Speed |
|----------|---------|-------|-------|
| **Unit Tests** | Test pure functions and API interactions | Vitest + MSW | Fast |
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
npm run agents:test -- src/test/unit/pipelines.test.ts

# Run with coverage
npm run agents:test -- --coverage

# Run only unit tests (fast)
npm run agents:test -- src/test/unit

# Run only integration tests
npm run agents:test -- src/test/integration
```

---

## Test Structure

```
agents/src/test/
├── setup.ts                    # Global test setup (MSW server)
│
├── fixtures/                   # Test data
│   └── github.ts              # GitHub API fixtures (PRs, workflows, deployments)
│
├── mocks/                      # MSW handlers
│   ├── github.ts              # GitHub API mock handlers
│   ├── handlers.ts            # Combined handlers export
│   └── server.ts              # MSW server setup
│
├── unit/                       # Unit tests (fast, no worker)
│   ├── pipelines.test.ts      # Pipeline definitions
│   └── github-agent.test.ts   # GitHub agent + API mocking with MSW
│
└── integration/                # Integration tests (requires worker)
    └── health-agent.test.ts   # Health agent with Miniflare
```

---

## MSW Setup

We use [MSW (Mock Service Worker)](https://mswjs.io/) to mock external APIs like GitHub.

### Global Setup (`setup.ts`)

```typescript
// src/test/setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

### Creating Fixtures (`fixtures/github.ts`)

```typescript
// src/test/fixtures/github.ts
export const mockPullRequest = {
  number: 123,
  title: 'feat: add new feature',
  state: 'open',
  head: { ref: 'feature/new', sha: 'abc123' },
  base: { ref: 'main' },
  user: { login: 'developer', avatar_url: 'https://...' },
  draft: false,
  labels: [{ name: 'enhancement', color: 'a2eeef' }],
};

export const mockWorkflowRun = {
  id: 456,
  name: 'CI',
  status: 'completed',
  conclusion: 'success',
  head_branch: 'feature/new',
  head_sha: 'abc123',
};
```

### Creating Handlers (`mocks/github.ts`)

```typescript
// src/test/mocks/github.ts
import { http, HttpResponse } from 'msw';
import { mockPullRequest } from '../fixtures/github';

export const pullRequestsHandler = http.get(
  'https://api.github.com/repos/:owner/:repo/pulls',
  ({ request }) => {
    const url = new URL(request.url);
    const state = url.searchParams.get('state') || 'open';
    return HttpResponse.json([mockPullRequest]);
  }
);

export const githubHandlers = [pullRequestsHandler];
```

### Using MSW in Tests

```typescript
// src/test/unit/github-agent.test.ts
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../mocks/server';

describe('GitHub API Interactions', () => {
  it('fetches open pull requests', async () => {
    const response = await fetch(
      'https://api.github.com/repos/owner/repo/pulls?state=open'
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('handles API errors', async () => {
    // Override handler for this test only
    server.use(
      http.get('https://api.github.com/repos/:owner/:repo/pulls', () => {
        return HttpResponse.json(
          { message: 'Internal Server Error' },
          { status: 500 }
        );
      }, { once: true })
    );

    const response = await fetch(
      'https://api.github.com/repos/owner/repo/pulls'
    );

    expect(response.status).toBe(500);
  });
});
```

---

## Unit Tests

Unit tests are fast and mock all external dependencies.

### Example: Testing Pipelines

```typescript
// src/test/unit/pipelines.test.ts
import { describe, expect, it } from 'vitest';
import { getPipeline, PIPELINES } from '../../pipelines';

describe('Pipeline Registry', () => {
  it('all pipelines have unique IDs', () => {
    const ids = PIPELINES.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('returns pipeline by ID', () => {
    const pipeline = getPipeline('daily-maintenance');
    expect(pipeline?.name).toBe('Daily Maintenance');
  });
});
```

---

## Integration Tests

Integration tests use Miniflare to run a local worker instance.

### Setup with `unstable_dev`

```typescript
// src/test/integration/health-agent.test.ts
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Unstable_DevWorker, unstable_dev } from 'wrangler';

const agentsDir = path.resolve(__dirname, '../../..');
const srcPath = path.join(agentsDir, 'src/index.ts');
const configPath = path.join(agentsDir, 'wrangler.toml');

// Skip if proxy detected (CI environments)
const hasProxy = Boolean(process.env.HTTP_PROXY || process.env.HTTPS_PROXY);
const describeIntegration = hasProxy ? describe.skip : describe;

describeIntegration('Health Agent Integration', () => {
  let worker: Unstable_DevWorker;

  beforeAll(async () => {
    worker = await unstable_dev(srcPath, {
      config: configPath,
      local: true,
      persist: false,
    });
  }, 60000);

  afterAll(async () => {
    await worker?.stop();
  });

  it('returns health status', async () => {
    const response = await worker.fetch('/health');
    expect(response.status).toBe(200);
  });
});
```

---

## Vitest Configuration

```typescript
// agents/vitest.config.ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: path.resolve(__dirname),
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    isolate: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

---

## Best Practices

### 1. Use MSW for External APIs

```typescript
// ❌ Bad: Mocking fetch directly
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ✅ Good: Use MSW handlers
server.use(
  http.get('https://api.github.com/...', () => {
    return HttpResponse.json({ data: 'mocked' });
  })
);
```

### 2. Isolate Tests

```typescript
// ❌ Bad: Shared state
let taskId: string;
it('creates task', () => { taskId = '...'; });
it('uses task', () => { getTask(taskId); });

// ✅ Good: Self-contained
it('creates and uses task', () => {
  const taskId = createTask();
  const task = getTask(taskId);
  expect(task).toBeDefined();
});
```

### 3. Test Error Scenarios

```typescript
it('handles rate limiting', async () => {
  server.use(
    http.get('https://api.github.com/repos/:owner/:repo/pulls', () => {
      return HttpResponse.json(
        { message: 'Rate limit exceeded' },
        { status: 403, headers: { 'X-RateLimit-Remaining': '0' } }
      );
    }, { once: true })
  );

  const response = await fetch('...');
  expect(response.status).toBe(403);
});
```

### 4. Use Descriptive Names

```typescript
// ❌ Vague
it('works', () => {});

// ✅ Descriptive
it('returns 200 with PR list when fetching open PRs', () => {});
```

---

## CI/CD Integration

```yaml
# .github/workflows/agents-test.yml
name: Agents Tests

on:
  push:
    paths: ['agents/**']
  pull_request:
    paths: ['agents/**']

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
```

---

## Debugging

```bash
# Verbose output
npm run agents:test -- --reporter=verbose

# Single test
npm run agents:test -- --testNamePattern="fetches open PRs"

# Watch mode
npm run agents:test -- --watch
```
