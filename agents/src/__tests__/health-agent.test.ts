/**
 * Health Agent Tests
 *
 * Tests the health monitoring functionality using Miniflare.
 * Run with: npm run agents:test
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

describe('HealthAgent', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    // Start local worker instance
    worker = await unstable_dev('src/index.ts', {
      config: 'wrangler.toml',
      experimental: { disableExperimentalWarning: true },
      local: true,
      persist: false, // Fresh state for each test run
    });
  });

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
