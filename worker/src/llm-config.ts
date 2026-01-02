/**
 * Centralized LLM configuration for inspirational message generation
 *
 * Supports multiple providers (OpenAI, Anthropic, etc.) via Vercel AI SDK
 * Disabled by default - set LLM_ENABLED=true to activate
 *
 * Required environment variables:
 * - LLM_ENABLED: 'true' | 'false' (default: false)
 * - LLM_PROVIDER: 'openai' | 'anthropic' (default: openai)
 * - LLM_API_KEY: API key for chosen provider
 * - LLM_MODEL: Model ID (e.g., 'gpt-4', 'claude-3-haiku')
 */

export interface LLMConfig {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'disabled';
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface GenerationRequest {
  theme: 'gratitude' | 'presence' | 'release' | 'connection';
  intensity: 'subtle' | 'profound' | 'energetic';
  count: number; // Number of messages to generate (16-64)
  style?: 'poetic' | 'direct' | 'metaphorical';
}

/**
 * Load LLM config from environment variables
 * Returns config with enabled=false if not properly configured
 */
export function loadLLMConfig(env: Record<string, string | undefined>): LLMConfig {
  const enabled = env.LLM_ENABLED === 'true';

  if (!enabled) {
    return {
      enabled: false,
      provider: 'disabled',
      apiKey: '',
      model: '',
      maxTokens: 2000,
      temperature: 0.7,
    };
  }

  const provider = (env.LLM_PROVIDER as 'openai' | 'anthropic') || 'openai';
  const apiKey = env.LLM_API_KEY || '';
  const model =
    env.LLM_MODEL || (provider === 'openai' ? 'gpt-3.5-turbo' : 'claude-3-haiku-20240307');

  if (!apiKey) {
    console.warn('LLM_ENABLED=true but LLM_API_KEY not set. LLM disabled.');
    return {
      enabled: false,
      provider: 'disabled',
      apiKey: '',
      model: '',
      maxTokens: 2000,
      temperature: 0.7,
    };
  }

  return {
    enabled: true,
    provider,
    apiKey,
    model,
    maxTokens: parseInt(env.LLM_MAX_TOKENS || '2000', 10),
    temperature: parseFloat(env.LLM_TEMPERATURE || '0.7'),
  };
}

/**
 * System prompt for inspirational message generation
 */
export function getSystemPrompt(theme: string, intensity: string): string {
  return `You are a spiritual guide and wellness expert creating inspirational messages for a global meditation app called "Breathe Together".

Theme: ${theme}
Intensity: ${intensity}

Requirements:
- Messages should be 2-3 words each for the "top" line
- Messages should be 2-4 words each for the "bottom" line
- Keep language universal and accessible
- No religious references, but can reference universal concepts
- Should evoke calm, connection, and presence
- Messages will be displayed one every 32 seconds (2 breathing cycles)

Format your response as a JSON array with exactly this structure (no markdown, just JSON):
[
  { "top": "word1 word2", "bottom": "word3 word4" },
  { "top": "word1 word2", "bottom": "word3 word4" }
]

Generate messages that complement deep breathing and meditation.`;
}

/**
 * Validate that the LLM response is properly formatted
 */
export function validateLLMResponse(
  response: string,
): Array<{ top: string; bottom: string }> | null {
  try {
    const parsed = JSON.parse(response.trim());
    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (msg) =>
          typeof msg.top === 'string' &&
          typeof msg.bottom === 'string' &&
          msg.top.trim() &&
          msg.bottom.trim(),
      )
    ) {
      console.warn('LLM response invalid format:', response);
      return null;
    }
    return parsed.map((msg) => ({
      top: msg.top.trim(),
      bottom: msg.bottom.trim(),
    }));
  } catch (err) {
    console.warn('Failed to parse LLM response:', err, response);
    return null;
  }
}

/**
 * Format a generation request into a user prompt
 */
export function formatGenerationPrompt(req: GenerationRequest): string {
  const styleHint = req.style ? `\n\nStyle preference: ${req.style}` : '';

  return `Generate exactly ${req.count} inspirational message pairs for a meditation app.

Theme: ${req.theme}
Intensity: ${req.intensity}${styleHint}

Return as valid JSON array of {top, bottom} objects.`;
}
