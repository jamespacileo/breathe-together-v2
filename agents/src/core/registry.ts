/**
 * Agent Registry - Central registry for agent type resolution
 *
 * Provides:
 * - Type-safe agent namespace lookup
 * - Dynamic agent instantiation
 * - Pipeline step routing
 */

import type { AgentType, Env } from './types';

// ============================================================================
// Agent Registry
// ============================================================================

/**
 * Get the Durable Object namespace for an agent type
 */
export function getAgentNamespace(env: Env, agentType: AgentType): DurableObjectNamespace {
  switch (agentType) {
    case 'orchestrator':
      return env.ORCHESTRATOR;
    case 'health':
      return env.HEALTH;
    case 'content':
      return env.CONTENT;
    case 'github':
      return env.GITHUB;
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}

/**
 * Get a Durable Object stub for an agent
 * Uses a consistent ID strategy for each agent type
 */
export function getAgentStub(
  env: Env,
  agentType: AgentType,
  instanceId: string = 'default',
): DurableObjectStub {
  const namespace = getAgentNamespace(env, agentType);
  const id = namespace.idFromName(`${agentType}:${instanceId}`);
  return namespace.get(id);
}

/**
 * Forward a request to a specific agent
 */
export async function forwardToAgent(
  env: Env,
  agentType: AgentType,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    instanceId?: string;
  } = {},
): Promise<Response> {
  const stub = getAgentStub(env, agentType, options.instanceId);

  const request = new Request(`https://internal${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return stub.fetch(request);
}

// ============================================================================
// Agent Type Guards
// ============================================================================

const VALID_AGENT_TYPES: AgentType[] = ['orchestrator', 'health', 'content', 'github'];

export function isValidAgentType(type: string): type is AgentType {
  return VALID_AGENT_TYPES.includes(type as AgentType);
}

export function parseAgentType(type: string): AgentType {
  if (!isValidAgentType(type)) {
    throw new Error(`Invalid agent type: ${type}. Valid types: ${VALID_AGENT_TYPES.join(', ')}`);
  }
  return type;
}

// ============================================================================
// Agent Discovery
// ============================================================================

/**
 * Get metadata for all registered agents
 */
export async function getAllAgentMetadata(
  env: Env,
): Promise<Array<{ type: AgentType; metadata: unknown }>> {
  const results = await Promise.all(
    VALID_AGENT_TYPES.map(async (type) => {
      try {
        const response = await forwardToAgent(env, type, '/metadata');
        const metadata = await response.json();
        return { type, metadata };
      } catch (_error) {
        return { type, metadata: { error: 'Failed to fetch metadata' } };
      }
    }),
  );

  return results;
}

/**
 * Get state for all registered agents
 */
export async function getAllAgentStates(
  env: Env,
): Promise<Array<{ type: AgentType; state: unknown }>> {
  const results = await Promise.all(
    VALID_AGENT_TYPES.map(async (type) => {
      try {
        const response = await forwardToAgent(env, type, '/state');
        const state = await response.json();
        return { type, state };
      } catch (_error) {
        return { type, state: { error: 'Failed to fetch state' } };
      }
    }),
  );

  return results;
}
