/**
 * LLM Module - Unified interface for language model access
 *
 * Supports multiple providers with Vertex AI / Gemini 2.0 Flash as default.
 *
 * Usage:
 *   const llm = createLLMClient(env);
 *   const response = await llm.generateText('Write a haiku about breathing');
 */

import type { Env } from './types';

// ============================================================================
// Types
// ============================================================================

export interface LLMConfig {
  provider: 'vertex' | 'openai' | 'anthropic';
  model: string;
  projectId?: string;
  location?: string;
  apiKey?: string;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface LLMClient {
  generateText(prompt: string, options?: GenerateOptions): Promise<LLMResponse>;
  generateJSON<T>(prompt: string, options?: GenerateOptions): Promise<T>;
}

// ============================================================================
// Vertex AI / Gemini Implementation
// ============================================================================

/**
 * Create Vertex AI client for Gemini models
 *
 * Uses Google Cloud REST API directly (no SDK needed in Workers).
 * Requires GOOGLE_SERVICE_ACCOUNT_KEY secret for authentication.
 */
async function createVertexClient(
  config: LLMConfig,
  serviceAccountKey?: string,
): Promise<LLMClient> {
  const { projectId, location = 'us-central1', model } = config;

  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID is required for Vertex AI');
  }

  // Parse service account key if provided
  let accessToken: string | null = null;

  if (serviceAccountKey) {
    accessToken = await getGoogleAccessToken(serviceAccountKey);
  }

  const baseUrl = `https://${location}-aiplatform.googleapis.com/v1`;
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${model}`;

  // Define generateText function that can be reused
  const generateText = async (
    prompt: string,
    options: GenerateOptions = {},
  ): Promise<LLMResponse> => {
    const { maxTokens = 1024, temperature = 0.7, topP = 0.95 } = options;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        topP,
        stopSequences: options.stopSequences,
      },
    };

    const response = await fetch(`${baseUrl}/${endpoint}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex AI error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as VertexResponse;

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usage = data.usageMetadata;

    return {
      text,
      usage: usage
        ? {
            promptTokens: usage.promptTokenCount || 0,
            completionTokens: usage.candidatesTokenCount || 0,
            totalTokens: usage.totalTokenCount || 0,
          }
        : undefined,
      finishReason: data.candidates?.[0]?.finishReason,
    };
  };

  const generateJSON = async <T>(prompt: string, options: GenerateOptions = {}): Promise<T> => {
    const jsonPrompt = `${prompt}\n\nRespond with valid JSON only, no markdown or explanation.`;
    const response = await generateText(jsonPrompt, options);

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }

    return JSON.parse(jsonText.trim()) as T;
  };

  return { generateText, generateJSON };
}

// Vertex AI response types
interface VertexResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

// ============================================================================
// Google Auth
// ============================================================================

/**
 * Get Google access token from service account key
 *
 * Uses JWT grant to exchange service account credentials for access token.
 */
async function getGoogleAccessToken(serviceAccountKeyJson: string): Promise<string> {
  const key = JSON.parse(serviceAccountKeyJson) as ServiceAccountKey;

  // Create JWT
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with private key
  const signature = await signWithRSA(signatureInput, key.private_key);
  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${tokenResponse.status}`);
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string };
  return tokenData.access_token;
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signWithRSA(data: string, privateKeyPem: string): Promise<string> {
  // Import the private key
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // Sign the data
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(data));

  // Base64url encode the signature
  const signatureArray = new Uint8Array(signature);
  const base64 = btoa(String.fromCharCode.apply(null, Array.from(signatureArray)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create LLM client from environment configuration
 */
export function createLLMClient(env: Env): LLMClient {
  const config: LLMConfig = {
    provider: env.LLM_PROVIDER || 'vertex',
    model: env.LLM_MODEL || 'gemini-2.0-flash-001',
    projectId: env.VERTEX_PROJECT_ID,
    location: env.VERTEX_LOCATION || 'us-central1',
  };

  switch (config.provider) {
    case 'vertex':
      // Return a lazy-initialized client
      return {
        async generateText(prompt: string, options?: GenerateOptions): Promise<LLMResponse> {
          const client = await createVertexClient(config, env.GOOGLE_SERVICE_ACCOUNT_KEY);
          return client.generateText(prompt, options);
        },
        async generateJSON<T>(prompt: string, options?: GenerateOptions): Promise<T> {
          const client = await createVertexClient(config, env.GOOGLE_SERVICE_ACCOUNT_KEY);
          return client.generateJSON<T>(prompt, options);
        },
      };

    // TODO: Add OpenAI and Anthropic providers
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

/**
 * Check if LLM is configured and available
 */
export function isLLMConfigured(env: Env): boolean {
  if (env.LLM_PROVIDER === 'vertex') {
    return Boolean(env.VERTEX_PROJECT_ID && env.GOOGLE_SERVICE_ACCOUNT_KEY);
  }
  return false;
}
