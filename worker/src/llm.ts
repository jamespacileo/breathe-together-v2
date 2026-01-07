/**
 * LLM integration for generating inspirational messages
 * Uses Vercel AI SDK for multi-provider support (OpenAI, Anthropic, etc.)
 *
 * NOTE: This module is prepared for future Vercel AI SDK integration
 * Currently uses mock generation for demonstration/testing
 *
 * To enable real LLM generation:
 * 1. npm install @ai-sdk/openai or @ai-sdk/anthropic
 * 2. Set LLM_ENABLED=true in environment
 * 3. Set LLM_API_KEY and LLM_PROVIDER
 */

import type { GenerationRequest, LLMConfig } from './llm-config';
import type { InspirationMessage, MessageBatch } from './types/inspirational';

/**
 * Generate inspirational messages using LLM
 * Returns a message batch ready for use
 */
export async function generateInspirationalMessages(
  config: LLMConfig,
  request: GenerationRequest,
): Promise<MessageBatch> {
  if (!config.enabled) {
    console.log('LLM disabled - using mock generation');
    return generateMockMessages(request);
  }

  try {
    // TODO: Implement real LLM generation once Vercel AI SDK is installed
    // Example (when ready):
    // const { text } = await generateText({
    //   model: getModel(config),
    //   messages: [{
    //     role: 'user',
    //     content: formatGenerationPrompt(request),
    //   }],
    //   system: getSystemPrompt(request.theme, request.intensity),
    // });
    // const messages = validateLLMResponse(text);
    // if (!messages) return generateMockMessages(request);

    // For now, use mock generation
    return generateMockMessages(request);
  } catch (err) {
    console.error('LLM generation failed, falling back to mock:', err);
    return generateMockMessages(request);
  }
}

/**
 * Mock generation for testing without LLM
 * Supports both individual messages and story arcs
 */
function generateMockMessages(request: GenerationRequest): MessageBatch {
  const messageTemplates = {
    gratitude: {
      subtle: [
        { top: 'Grateful', bottom: 'For this breath' },
        { top: 'Thank you', bottom: 'For being here' },
        { top: 'Appreciation', bottom: 'Fills the heart' },
      ],
      profound: [
        { top: 'Gratitude flows', bottom: 'Through every fiber' },
        { top: 'In deep thanks', bottom: 'We find peace' },
        { top: 'Blessed', bottom: 'Beyond measure' },
      ],
      energetic: [
        { top: 'Gratitude energizes', bottom: 'The spirit bright' },
        { top: 'Thanks awakens', bottom: 'Inner joy' },
        { top: 'Appreciation', bottom: 'Ignites the soul' },
      ],
    },
    presence: {
      subtle: [
        { top: 'Here now', bottom: 'Fully present' },
        { top: 'This moment', bottom: 'Is all we have' },
        { top: 'Notice', bottom: 'The breath' },
      ],
      profound: [
        { top: 'Deep presence', bottom: 'Reveals the sacred' },
        { top: 'In stillness', bottom: 'Truth emerges' },
        { top: 'Presence itself', bottom: 'Is the gift' },
      ],
      energetic: [
        { top: 'Fully here', bottom: 'Alive and awake' },
        { top: 'Present power', bottom: 'Flows through me' },
        { top: 'Here now', bottom: 'Completely engaged' },
      ],
    },
    release: {
      subtle: [
        { top: 'Let it go', bottom: 'With each exhale' },
        { top: 'Breathe out', bottom: 'What no longer serves' },
        { top: 'Release', bottom: 'Gently' },
      ],
      profound: [
        { top: 'In releasing', bottom: 'We find freedom' },
        { top: 'Let go', bottom: 'Of what binds' },
        { top: 'Surrender', bottom: 'Opens the way' },
      ],
      energetic: [
        { top: 'Release', bottom: 'With fierce grace' },
        { top: 'Break free', bottom: 'From the past' },
        { top: 'Liberate', bottom: 'The spirit' },
      ],
    },
    connection: {
      subtle: [
        { top: 'We breathe', bottom: 'As one' },
        { top: 'Connected', bottom: 'Through breath' },
        { top: 'Together', bottom: 'In rhythm' },
      ],
      profound: [
        { top: 'Unity', bottom: 'In every heartbeat' },
        { top: 'One breath', bottom: 'Shared by all' },
        { top: 'Connected', bottom: 'In the eternal' },
      ],
      energetic: [
        { top: 'United', bottom: 'Strong together' },
        { top: 'One pulse', bottom: 'Millions breathing' },
        { top: 'We are', bottom: 'All connected' },
      ],
    },
  };

  const intensity = request.intensity as keyof (typeof messageTemplates)['gratitude'];
  const templates = messageTemplates[request.theme][intensity];
  const now = Date.now();
  const isStory = request.type === 'story';

  // Generate requested number of messages by cycling through templates
  const messages: InspirationMessage[] = [];

  for (let i = 0; i < request.count; i++) {
    const template = templates[i % templates.length];
    const storyId = isStory ? `story-${request.theme}-${now}` : undefined;
    const storyPosition = isStory ? i + 1 : undefined;
    const storyTotal = isStory ? request.count : undefined;

    messages.push({
      id: `generated-${request.theme}-${i}`,
      top: template.top,
      bottom: template.bottom,
      cyclesPerMessage: 2,
      authoredAt: now,
      source: 'llm',
      storyId,
      storyPosition,
      storyTotal,
      metadata: {
        theme: request.theme,
        intensity: request.intensity,
        // biome-ignore lint/suspicious/noExplicitAny: storyType only exists on StoryGenerationRequest variant
        narrativeType: isStory ? (request as any).storyType || 'complete-arc' : undefined,
      },
    });
  }

  const themeLabel = request.theme.charAt(0).toUpperCase() + request.theme.slice(1);
  const batchName = isStory
    ? // biome-ignore lint/suspicious/noExplicitAny: storyType only exists on StoryGenerationRequest variant
      `${themeLabel} Story - ${(request as any).storyType || 'complete-arc'} (${request.intensity})`
    : `${themeLabel} Messages (${request.intensity})`;

  return {
    id: `batch-${request.theme}-${now}`,
    name: batchName,
    messages,
    source: 'llm',
    createdAt: now,
    metadata: {
      theme: request.theme,
      generatedBy: 'mock', // Change to 'vercel-ai' when real LLM enabled
    },
  };
}
