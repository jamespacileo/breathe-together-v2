/**
 * Health Agent Integration Tests
 *
 * Tests the health monitoring functionality using Miniflare.
 * Run with: npm run agents:test
 *
 * NOTE: These tests require network access and may be skipped
 * in restricted environments (e.g., CI with proxy).
 */

import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Unstable_DevWorker, unstable_dev } from 'wrangler';

// Resolve paths relative to the agents directory
const agentsDir = path.resolve(__dirname, '../..');
const srcPath = path.join(agentsDir, 'src/index.ts');
const configPath = path.join(agentsDir, 'wrangler.toml');

// Check if proxy is enabled (which may cause connection issues)
const hasProxy = Boolean(process.env.HTTP_PROXY || process.env.HTTPS_PROXY);

// Skip all integration tests if proxy is detected
const describeIntegration = hasProxy ? describe.skip : describe;

describeIntegration('HealthAgent Integration Tests', () => {
  let worker: Unstable_DevWorker;

  beforeAll(async () => {
    // Start local worker instance
    worker = await unstable_dev(srcPath, {
      config: configPath,
      experimental: { disableExperimentalWarning: true },
      local: true,
      persist: false, // Fresh state for each test run
    });
  }, 60000); // 60s timeout for worker startup

  afterAll(async () => {
    await worker?.stop();
  });

  describe('GET /health', () => {
    it('returns service health status', async () => {
      const response = await worker.fetch('/health');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('agents');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('GET /agents', () => {
    it('lists all registered agents', async () => {
      const response = await worker.fetch('/agents');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('agents');
      expect(Array.isArray(data.agents)).toBe(true);
    });
  });

  describe('Health Agent Tasks', () => {
    it('can create and retrieve tasks', async () => {
      // Create a task
      const createResponse = await worker.fetch('/agents/health/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'checkEndpoint',
          payload: { url: 'https://example.com', expectedStatus: 200 },
        }),
      });

      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      expect(createData).toHaveProperty('taskId');

      // List tasks
      const listResponse = await worker.fetch('/agents/health/tasks');
      expect(listResponse.status).toBe(200);

      const listData = await listResponse.json();
      expect(listData).toHaveProperty('tasks');
    });

    it('returns agent metadata', async () => {
      const response = await worker.fetch('/agents/health/metadata');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.type).toBe('health');
      expect(data.version).toBe('1.0.0');
      expect(data).toHaveProperty('tools');
      expect(Array.isArray(data.tools)).toBe(true);
    });

    it('returns agent state', async () => {
      const response = await worker.fetch('/agents/health/state');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.type).toBe('health');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('tasksCompleted');
    });
  });

  describe('Health Reports', () => {
    it('returns health report', async () => {
      const response = await worker.fetch('/agents/health/report?hours=1');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('healthScore');
      expect(data).toHaveProperty('period');
    });
  });
});
