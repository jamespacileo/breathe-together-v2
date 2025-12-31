/**
 * useSimulatedUserFlow - Simulates users joining and leaving for testing
 *
 * Demonstrates the user ordering system with realistic arrival/departure patterns.
 * Users join gradually, stay for a while, then leave. New users fill vacated slots.
 *
 * Useful for:
 * - Testing smooth enter/exit animations
 * - Verifying color transitions work correctly
 * - Demonstrating the ordering system in action
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SimulatedUser {
  /** Unique user ID */
  id: number;
  /** Mood index (0-6) */
  moodIndex: number;
  /** When the user joined (timestamp) */
  joinedAt: number;
  /** When the user will leave (timestamp) */
  leavesAt: number;
}

export interface UseSimulatedUserFlowOptions {
  /** Maximum number of slots */
  maxSlots?: number;
  /** Initial number of users */
  initialUsers?: number;
  /** Average time a user stays (ms) */
  avgStayDuration?: number;
  /** Variance in stay duration (ms) */
  stayDurationVariance?: number;
  /** Average time between new user arrivals (ms) */
  avgArrivalInterval?: number;
  /** Target user count to maintain */
  targetUserCount?: number;
  /** Whether simulation is paused */
  paused?: boolean;
}

export interface UseSimulatedUserFlowReturn {
  /** Current mood array (pass to ParticleSwarm) */
  moodArray: number[];
  /** Active users with metadata */
  users: SimulatedUser[];
  /** Total user count */
  userCount: number;
  /** Add a user manually */
  addUser: (moodIndex?: number) => void;
  /** Remove a user by slot index */
  removeUser: (slotIndex: number) => void;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Generate a random mood index (0-3)
 * Matches the 4-category mood system: gratitude, presence, release, connection
 */
function randomMood(): number {
  return Math.floor(Math.random() * 4);
}

/**
 * Generate a random stay duration with variance
 */
function randomStayDuration(avg: number, variance: number): number {
  return avg + (Math.random() - 0.5) * 2 * variance;
}

/**
 * Hook for simulating user arrivals and departures
 *
 * @example
 * ```tsx
 * const { moodArray, userCount } = useSimulatedUserFlow({
 *   maxSlots: 48,
 *   initialUsers: 20,
 *   targetUserCount: 30,
 * });
 *
 * return <ParticleSwarm moodArray={moodArray} count={48} />;
 * ```
 */
export function useSimulatedUserFlow(
  options: UseSimulatedUserFlowOptions = {},
): UseSimulatedUserFlowReturn {
  const {
    maxSlots = 48,
    initialUsers = 20,
    avgStayDuration = 30000, // 30 seconds average stay
    stayDurationVariance = 15000, // ±15 seconds
    avgArrivalInterval = 2000, // New user every ~2 seconds
    targetUserCount = 30,
    paused = false,
  } = options;

  const nextUserIdRef = useRef(0);
  const [users, setUsers] = useState<SimulatedUser[]>([]);

  // Initialize with some users
  useEffect(() => {
    const now = Date.now();
    const initialUserList: SimulatedUser[] = [];

    for (let i = 0; i < Math.min(initialUsers, maxSlots); i++) {
      const stayDuration = randomStayDuration(avgStayDuration, stayDurationVariance);
      initialUserList.push({
        id: nextUserIdRef.current++,
        moodIndex: randomMood(),
        joinedAt: now - Math.random() * avgStayDuration * 0.5, // Stagger join times
        leavesAt: now + stayDuration * (0.5 + Math.random() * 0.5),
      });
    }

    setUsers(initialUserList);
  }, [initialUsers, maxSlots, avgStayDuration, stayDurationVariance]);

  // Simulation tick - handle departures and arrivals
  useEffect(() => {
    if (paused) return;

    const tick = () => {
      const now = Date.now();

      setUsers((prevUsers) => {
        let newUsers = [...prevUsers];

        // Handle departures (users whose time is up)
        newUsers = newUsers.filter((user) => user.leavesAt > now);

        // Handle arrivals (if below target)
        if (newUsers.length < targetUserCount && newUsers.length < maxSlots) {
          // Random chance to add user based on arrival interval
          if (Math.random() < 100 / avgArrivalInterval) {
            const stayDuration = randomStayDuration(avgStayDuration, stayDurationVariance);
            newUsers.push({
              id: nextUserIdRef.current++,
              moodIndex: randomMood(),
              joinedAt: now,
              leavesAt: now + stayDuration,
            });
          }
        }

        return newUsers;
      });
    };

    const interval = setInterval(tick, 100); // Check every 100ms
    return () => clearInterval(interval);
  }, [
    paused,
    targetUserCount,
    maxSlots,
    avgArrivalInterval,
    avgStayDuration,
    stayDurationVariance,
  ]);

  // Convert users to mood array (in arrival order)
  // Returns only active mood indices (no EMPTY_SLOT/-1 values)
  const moodArray = useCallback((): number[] => {
    // Sort users by join time (arrival order)
    const sortedUsers = [...users].sort((a, b) => a.joinedAt - b.joinedAt);

    // Build mood array with only active moods
    return sortedUsers.slice(0, maxSlots).map((user) => user.moodIndex);
  }, [users, maxSlots]);

  const addUser = useCallback(
    (moodIndex?: number) => {
      if (users.length >= maxSlots) return;

      const now = Date.now();
      const stayDuration = randomStayDuration(avgStayDuration, stayDurationVariance);

      setUsers((prev) => [
        ...prev,
        {
          id: nextUserIdRef.current++,
          moodIndex: moodIndex ?? randomMood(),
          joinedAt: now,
          leavesAt: now + stayDuration,
        },
      ]);
    },
    [users.length, maxSlots, avgStayDuration, stayDurationVariance],
  );

  const removeUser = useCallback((slotIndex: number) => {
    setUsers((prev) => {
      const sortedUsers = [...prev].sort((a, b) => a.joinedAt - b.joinedAt);
      if (slotIndex < 0 || slotIndex >= sortedUsers.length) return prev;

      const userToRemove = sortedUsers[slotIndex];
      return prev.filter((u) => u.id !== userToRemove.id);
    });
  }, []);

  const reset = useCallback(() => {
    nextUserIdRef.current = 0;
    setUsers([]);
  }, []);

  return {
    moodArray: moodArray(),
    users,
    userCount: users.length,
    addUser,
    removeUser,
    reset,
  };
}
