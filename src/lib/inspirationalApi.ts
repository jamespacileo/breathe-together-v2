/**
 * Client API for inspirational text backend
 * Handles communication with /api/inspirational endpoints
 */

import type { InspirationMessage, UserTextOverride } from './types/inspirational';

export class InspirationTextApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_PRESENCE_API_URL || 'http://localhost:8787';
  }

  /**
   * Create or update a text override for a user
   * Used for tutorials, first-time flows, seasonal content, etc.
   */
  async createOverride(
    sessionId: string,
    type: 'tutorial' | 'first-time-flow' | 'custom' | 'seasonal',
    messages: InspirationMessage[],
    durationMinutes: number,
    reason?: string,
  ): Promise<UserTextOverride> {
    const response = await fetch(`${this.baseUrl}/admin/inspirational/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        type,
        messages,
        durationMinutes,
        reason,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create override: ${response.statusText}`);
    }

    const data = (await response.json()) as { success: boolean; override: UserTextOverride };
    return data.override;
  }
}

// Singleton instance
export const inspirationApi = new InspirationTextApiClient();
