import { useEffect, useState } from 'react';
import { generateMockPresence, type MockPresenceData } from '../lib/mockPresence';

export interface PresenceData {
  total: number;
  moods: MockPresenceData['moods'];
  isLoading: boolean;
}

/**
 * usePresence - Hook for presence data
 *
 * Currently uses mock data. Will be replaced with real API calls.
 */
export function usePresence(): PresenceData {
  const [data, setData] = useState<PresenceData>({
    total: 0,
    moods: {} as MockPresenceData['moods'],
    isLoading: true,
  });

  useEffect(() => {
    // Simulate initial load
    const initialCount = 50 + Math.floor(Math.random() * 100);
    const mockData = generateMockPresence(initialCount);

    setData({
      total: mockData.count,
      moods: mockData.moods,
      isLoading: false,
    });

    // Simulate presence updates
    const interval = setInterval(() => {
      setData((prev) => {
        const delta = Math.floor(Math.random() * 10) - 3; // -3 to +6
        const newCount = Math.max(20, prev.total + delta);
        const newMockData = generateMockPresence(newCount);
        return {
          ...prev,
          total: newMockData.count,
          moods: newMockData.moods,
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return data;
}
