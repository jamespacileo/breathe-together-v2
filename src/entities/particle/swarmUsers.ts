import type { User } from './SlotManager';

/**
 * Create a deterministic signature for a user list.
 * Includes order, IDs, and moods so any membership or mood change is detected.
 */
export function createUsersSignature(users: readonly User[]): string {
  if (users.length === 0) return '';

  let signature = '';
  for (const user of users) {
    signature += `${user.id}:${user.mood}|`;
  }
  return signature;
}
