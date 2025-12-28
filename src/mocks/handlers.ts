import { HttpResponse, http } from 'msw';
import { EMPTY_MOODS, MOOD_IDS, type MoodId } from '../constants';

// Initial state: 50 users
const users = Array.from({ length: 50 }, (_, i) => ({
  id: `user-${i}`,
  mood: MOOD_IDS[Math.floor(Math.random() * MOOD_IDS.length)],
}));

/**
 * Simulation logic to maintain roughly 50 users
 * Runs every 5 seconds to simulate churn
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const targetCount = 50;
    const variance = 5;

    // Randomly add or remove users to stay within [45, 55]
    if (users.length < targetCount - variance) {
      // Add a user
      users.push({
        id: `user-${Date.now()}`,
        mood: MOOD_IDS[Math.floor(Math.random() * MOOD_IDS.length)],
      });
    } else if (users.length > targetCount + variance) {
      // Remove a random user
      users.splice(Math.floor(Math.random() * users.length), 1);
    } else {
      // Small chance to add or remove
      const rand = Math.random();
      if (rand < 0.2) {
        users.push({
          id: `user-${Date.now()}`,
          mood: MOOD_IDS[Math.floor(Math.random() * MOOD_IDS.length)],
        });
      } else if (rand > 0.8) {
        users.splice(Math.floor(Math.random() * users.length), 1);
      }

      // Randomly change some moods
      users.forEach((u) => {
        if (Math.random() < 0.1) {
          u.mood = MOOD_IDS[Math.floor(Math.random() * MOOD_IDS.length)];
        }
      });
    }
  }, 5000);
}

export const handlers = [
  // Mock presence endpoint
  http.get('/api/presence', () => {
    const moodCounts = { ...EMPTY_MOODS };
    users.forEach((u) => {
      if (u.mood in moodCounts) {
        moodCounts[u.mood as MoodId]++;
      }
    });

    return HttpResponse.json({
      count: users.length,
      moods: moodCounts,
    });
  }),

  // Mock heartbeat endpoint
  http.post('/api/heartbeat', async ({ request }) => {
    try {
      const _body = (await request.json()) as { sessionId: string; mood?: string };

      // In a more complex mock, we could track the user's session
      // For now, we just return success to satisfy the hook
      return HttpResponse.json({ success: true });
    } catch (_error) {
      return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  }),

  // Mock leave endpoint
  http.delete('/api/presence', async () => {
    return HttpResponse.json({ success: true });
  }),
];
