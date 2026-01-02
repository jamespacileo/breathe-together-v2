/**
 * Centralized LLM configuration for inspirational message generation
 *
 * Supports multiple providers (OpenAI, Anthropic, Google Gemini, etc.) via Vercel AI SDK
 * Disabled by default - set LLM_ENABLED=true to activate
 *
 * Required environment variables:
 * - LLM_ENABLED: 'true' | 'false' (default: false)
 * - LLM_PROVIDER: 'openai' | 'anthropic' | 'gemini' (default: gemini)
 * - LLM_API_KEY: API key for chosen provider
 * - LLM_MODEL: Model ID (e.g., 'gpt-4', 'claude-3-haiku', 'gemini-2.0-flash')
 */

export interface LLMConfig {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'gemini' | 'disabled';
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
  type?: 'messages' | 'story'; // Generate individual messages or a story arc
  recentMessageIds?: string[]; // Recent messages shown to avoid repetition
  narrativeContext?: string; // Previous context for coherence
}

export interface StoryGenerationRequest extends GenerationRequest {
  type: 'story';
  messageCount: number; // Messages per story (3-12 typically)
  storyType: 'complete-arc' | 'beginning' | 'middle' | 'end'; // Story structure
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

  const provider = (env.LLM_PROVIDER as 'openai' | 'anthropic' | 'gemini') || 'gemini';
  const apiKey = env.LLM_API_KEY || '';
  const model =
    env.LLM_MODEL ||
    (provider === 'openai'
      ? 'gpt-3.5-turbo'
      : provider === 'anthropic'
        ? 'claude-3-haiku-20240307'
        : 'gemini-2.0-flash');

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
 * Includes theme-specific guidance and examples
 */
export function getSystemPrompt(
  theme: string,
  intensity: string,
  context?: {
    recentMessages?: string[];
    storyType?: string;
    messageCount?: number;
  },
): string {
  const themeGuidance = getThemeGuidance(theme);
  const intensityGuidance = getIntensityGuidance(intensity);
  const avoidanceContext =
    context?.recentMessages && context.recentMessages.length > 0
      ? `\n\nRECENT MESSAGES (avoid repeating themes):\n${context.recentMessages.join('\n')}`
      : '';
  const storyContext = context?.storyType
    ? `\n\nNARRATIVE STRUCTURE: Create a ${context.storyType} narrative arc with ${context.messageCount} messages. Each message should flow into the next.`
    : '';

  return `You are a contemplative writer and meditation guide creating inspirational messages for a global breathing meditation app called "Breathe Together".

THEME: ${theme}
${themeGuidance}

INTENSITY: ${intensity}
${intensityGuidance}

CORE REQUIREMENTS:
- Top line: 2-3 words maximum (brief focal point)
- Bottom line: 2-4 words maximum (supporting thought)
- Language: Universal, non-religious, accessible to all cultures
- Tone: Calming, grounding, present-moment focused
- Display: Each message shown for 32 seconds (2 breathing cycles)
${storyContext}${avoidanceContext}

RESPONSE FORMAT: Valid JSON array only (no markdown, no explanation):
[
  { "top": "word1 word2", "bottom": "word3 word4" },
  { "top": "word1 word2", "bottom": "word3 word4" }
]`;
}

/**
 * Theme-specific guidance and few-shot examples
 */
function getThemeGuidance(theme: string): string {
  const guidance: Record<string, string> = {
    gratitude: `Focus on appreciation, acknowledgment, and thankfulness.
Examples:
  - Top: "I am grateful" Bottom: "For this breath"
  - Top: "Blessings abound" Bottom: "In each moment"`,
    presence: `Focus on being here now, awareness, and consciousness.
Examples:
  - Top: "Present now" Bottom: "Fully aware"
  - Top: "Here, breathing" Bottom: "Centered within"`,
    release: `Focus on letting go, surrendering, and acceptance.
Examples:
  - Top: "Release tension" Bottom: "Welcome peace"
  - Top: "Let it go" Bottom: "Find stillness"`,
    connection: `Focus on unity, interconnectedness, and belonging.
Examples:
  - Top: "We breathe together" Bottom: "One breath, many hearts"
  - Top: "Connected always" Bottom: "In shared silence"`,
  };
  return guidance[theme] || '';
}

/**
 * Intensity-specific guidance
 */
function getIntensityGuidance(intensity: string): string {
  const guidance: Record<string, string> = {
    subtle: `Keep messages gentle, whisper-soft, understated. Use simple, everyday language. Avoid bold statements.`,
    profound: `Deliver deeper truths, philosophical depth, meaningful insight. Use more elaborate but accessible language.`,
    energetic: `Bring vitality, brightness, and movement. Use active language and uplifting concepts.`,
  };
  return guidance[intensity] || '';
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
 * Supports both individual messages and story arcs
 */
export function formatGenerationPrompt(req: GenerationRequest): string {
  const isStory = req.type === 'story';
  const count = isStory ? (req as StoryGenerationRequest).messageCount : req.count;
  const styleHint = req.style ? `\nStyle: ${req.style}` : '';
  const contextHint =
    req.narrativeContext && isStory ? `\nPrevious context: ${req.narrativeContext}` : '';

  const basePrompt = isStory
    ? `Create a narrative story with exactly ${count} messages forming a ${(req as StoryGenerationRequest).storyType} arc.

Theme: ${req.theme}
Intensity: ${req.intensity}${styleHint}${contextHint}

The messages should:
- Progress logically from one to the next
- Build emotional or conceptual resonance
- Form a complete arc or segment
- Work together as a unified journey

Return exactly ${count} message pairs as valid JSON array.`
    : `Generate exactly ${req.count} inspirational message pairs for a meditation app.

Theme: ${req.theme}
Intensity: ${req.intensity}${styleHint}${contextHint}

Return as valid JSON array of {top, bottom} objects.`;

  return basePrompt;
}
