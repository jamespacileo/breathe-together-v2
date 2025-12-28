import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_MOODS, type MoodId } from '../constants';
import { generateMockPresence } from '../lib/mockPresence';
import type { PopulationSnapshot } from '../lib/simulation';
import type { SimulatedUser } from '../lib/userGenerator';

/**
 * Detect if we're running in Triplex environment
 * Triplex runs at localhost:3333 or includes /triplex in pathname
 */
const IS_TRIPLEX = typeof window !== 'undefined' &&
	(window.location.port === '3333' ||
	 (window.location.hostname === 'localhost' && window.location.pathname.includes('triplex')));

export interface PresenceData {
	count: number;
	moods: Record<MoodId, number>; // mood id -> count
	users?: SimulatedUser[]; // Full user list (when simulated)
	isLoading?: boolean;
	isError?: boolean;
	error?: Error | null;
}

export interface UsePresenceOptions {
	pollInterval?: number; // ms between polls
	simulated?: boolean; // Use simulated data (for development)
	simulationSnapshot?: PopulationSnapshot; // Pass snapshot from useSimulation
}

async function fetchPresence(): Promise<PresenceData> {
	const response = await fetch('/api/presence');
	if (!response.ok) {
		throw new Error('Failed to fetch presence');
	}
	const data = await response.json();
	// Ensure moods object exists
	return {
		count: data.count ?? 0,
		moods: data.moods ?? { ...EMPTY_MOODS },
	};
}

/**
 * Hook for tracking global presence
 *
 * In simulated mode: Uses the snapshot from useSimulation (passed as prop)
 * In production mode: Uses TanStack Query to fetch from the Worker API
 *
 * Returns error and loading states for UI feedback
 */
export function usePresence(options: UsePresenceOptions = {}): PresenceData {
	const { pollInterval = 5000, simulated = true, simulationSnapshot } = options;

	// Force simulated mode in Triplex to prevent API errors
	const effectiveSimulated = simulated || IS_TRIPLEX;

	// Use TanStack Query for real API when not simulated
	const { data, isLoading, isError, error } = useQuery({
		queryKey: ['presence'],
		queryFn: fetchPresence,
		refetchInterval: pollInterval,
		enabled: !effectiveSimulated,
		retry: 3, // Retry failed requests 3 times
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
	});

	if (effectiveSimulated) {
		// Use provided snapshot, or generate mock data with 75 users
		const mockData = simulationSnapshot || generateMockPresence(75);
		return {
			count: mockData.count,
			moods: mockData.moods,
			users: simulationSnapshot?.users,
			isLoading: false,
			isError: false,
			error: null,
		};
	}

	return {
		count: data?.count ?? 0,
		moods: data?.moods ?? EMPTY_MOODS,
		isLoading,
		isError,
		error: error instanceof Error ? error : null,
	};
}

async function sendHeartbeat(sessionId: string, mood?: string): Promise<void> {
	const response = await fetch('/api/heartbeat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ sessionId, mood }),
	});
	if (!response.ok) {
		throw new Error('Failed to send heartbeat');
	}
}

export interface HeartbeatState {
	isError: boolean;
	consecutiveFailures: number;
}

/**
 * Hook for managing the current user's presence using TanStack Query
 * Automatically sends heartbeats and invalidates presence cache
 *
 * Features:
 * - Exponential backoff on failures
 * - Tracks consecutive failures for UI feedback
 * - Automatically recovers when connection is restored
 * - Adaptive interval that increases on failures
 */
export function useHeartbeat(
	sessionId: string | null,
	mood?: string,
): HeartbeatState {
	// Skip heartbeats in Triplex environment
	if (IS_TRIPLEX) {
		return { isError: false, consecutiveFailures: 0 };
	}

	const queryClient = useQueryClient();
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Track failure count in ref for scheduling (avoids race conditions)
	const failureCountRef = useRef(0);

	// Use state for UI updates
	const [heartbeatState, setHeartbeatState] = useState<HeartbeatState>({
		isError: false,
		consecutiveFailures: 0,
	});

	// Calculate interval based on failure count
	const getInterval = useCallback((failures: number) => {
		const baseInterval = 30000; // 30s
		const backoffMultiplier = Math.min(failures, 4);
		return baseInterval * (1 + backoffMultiplier * 0.5); // Max 90s interval
	}, []);

	const { mutate } = useMutation({
		mutationFn: (params: { sessionId: string; mood?: string }) =>
			sendHeartbeat(params.sessionId, params.mood),
		onSuccess: () => {
			// Reset failure count on success
			failureCountRef.current = 0;
			setHeartbeatState({ isError: false, consecutiveFailures: 0 });
			// Invalidate presence data after successful heartbeat
			queryClient.invalidateQueries({ queryKey: ['presence'] });
		},
		onError: (error) => {
			// Increment failure count
			failureCountRef.current += 1;
			const failures = failureCountRef.current;
			setHeartbeatState({
				isError: true,
				consecutiveFailures: failures,
			});
			console.warn(
				`Heartbeat failed (attempt ${failures}):`,
				error instanceof Error ? error.message : 'Unknown error',
			);
		},
		retry: 2, // Retry failed heartbeats twice
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
	});

	useEffect(() => {
		if (!sessionId) return;

		// Capture current values for the effect
		const currentSessionId = sessionId;
		const currentMood = mood;

		// Schedule next heartbeat with adaptive interval
		const scheduleNextHeartbeat = () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			const interval = getInterval(failureCountRef.current);
			timeoutRef.current = setTimeout(() => {
				mutate(
					{ sessionId: currentSessionId, mood: currentMood },
					{
						onSettled: () => {
							// Schedule next heartbeat after this one completes
							scheduleNextHeartbeat();
						},
					},
				);
			}, interval);
		};

		// Send initial heartbeat immediately
		mutate(
			{ sessionId: currentSessionId, mood: currentMood },
			{
				onSettled: () => {
					// Schedule next heartbeat after initial completes
					scheduleNextHeartbeat();
				},
			},
		);

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [sessionId, mood, mutate, getInterval]);

	return heartbeatState;
}
