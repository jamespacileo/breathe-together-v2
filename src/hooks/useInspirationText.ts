/**
 * Hook for fetching and caching inspirational text from backend
 * Ensures all users see the same message at the same time (UTC-synced)
 */

import { useEffect, useRef, useState } from 'react';
import type { InspirationMessage, InspirationResponse } from '../lib/types/inspirational';

interface UseInspirationTextState {
  message: InspirationMessage | null;
  isLoading: boolean;
  error: string | null;
  nextRotationTime: number;
}

const DEFAULT_CACHE_DURATION_MS = 30000; // 30 seconds

// In-memory cache to reduce API calls
const messageCache = {
  data: null as InspirationResponse | null,
  expiresAt: 0,
};

export function useInspirationText(sessionId?: string): UseInspirationTextState {
  const [state, setState] = useState<UseInspirationTextState>({
    message: null,
    isLoading: true,
    error: null,
    nextRotationTime: Date.now(),
  });

  const cacheTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex async fetch with cache logic and multiple error paths
    async function fetchMessage() {
      try {
        const now = Date.now();
        const apiBaseUrl = import.meta.env.VITE_PRESENCE_API_URL || 'http://localhost:8787';

        // Check cache first
        if (messageCache.data && messageCache.expiresAt > now && !sessionId) {
          if (isMounted) {
            setState({
              message: messageCache.data.message,
              isLoading: false,
              error: null,
              nextRotationTime: messageCache.data.nextRotationTime,
            });

            // Schedule next fetch when cache expires - only if still mounted
            const delay = messageCache.expiresAt - now;
            if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
            cacheTimeoutRef.current = setTimeout(fetchMessage, delay + 100);
          }
          return;
        }

        // Fetch from API
        const params = new URLSearchParams();
        if (sessionId) params.append('sessionId', sessionId);

        const response = await fetch(`${apiBaseUrl}/api/inspirational?${params}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch inspiration: ${response.statusText}`);
        }

        // Parse JSON with validation - response.json() can throw on malformed responses
        let data: InspirationResponse;
        try {
          const rawData = await response.json();
          // Basic validation to ensure required fields exist
          if (
            !rawData ||
            typeof rawData.message !== 'object' ||
            typeof rawData.cacheMaxAge !== 'number'
          ) {
            throw new Error('Invalid response format');
          }
          data = rawData as InspirationResponse;
        } catch (parseError) {
          throw new Error(
            `Failed to parse inspiration response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
          );
        }

        if (isMounted) {
          setState({
            message: data.message,
            isLoading: false,
            error: null,
            nextRotationTime: data.nextRotationTime,
          });

          // Cache response (unless user has override)
          if (!data.override) {
            messageCache.data = data;
            messageCache.expiresAt = now + data.cacheMaxAge * 1000;
          }

          // Schedule next fetch
          const cacheExpiry = Math.max(data.cacheMaxAge * 1000, DEFAULT_CACHE_DURATION_MS);
          if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
          cacheTimeoutRef.current = setTimeout(fetchMessage, cacheExpiry);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));

          // Retry on error with exponential backoff - only if still mounted
          if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
          cacheTimeoutRef.current = setTimeout(fetchMessage, 5000);
        }
      }
    }

    fetchMessage();

    return () => {
      isMounted = false;
      if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
    };
  }, [sessionId]);

  return state;
}
