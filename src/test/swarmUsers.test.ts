import { describe, expect, it } from 'vitest';
import type { User } from '../entities/particle/SlotManager';
import { createUsersSignature } from '../entities/particle/swarmUsers';

describe('createUsersSignature', () => {
  it('returns empty string for empty list', () => {
    expect(createUsersSignature([])).toBe('');
  });

  it('changes when order or contents change', () => {
    const usersA: User[] = [
      { id: 'user-1', mood: 'presence' },
      { id: 'user-2', mood: 'gratitude' },
    ];
    const usersB: User[] = [
      { id: 'user-2', mood: 'gratitude' },
      { id: 'user-1', mood: 'presence' },
    ];

    expect(createUsersSignature(usersA)).not.toBe(createUsersSignature(usersB));
  });

  it('changes when mood changes for same user', () => {
    const usersA: User[] = [{ id: 'user-1', mood: 'presence' }];
    const usersB: User[] = [{ id: 'user-1', mood: 'release' }];

    expect(createUsersSignature(usersA)).not.toBe(createUsersSignature(usersB));
  });

  it('changes when length changes even if prefix is identical', () => {
    const usersA: User[] = [{ id: 'user-1', mood: 'presence' }];
    const usersB: User[] = [
      { id: 'user-1', mood: 'presence' },
      { id: 'user-2', mood: 'gratitude' },
    ];

    expect(createUsersSignature(usersA)).not.toBe(createUsersSignature(usersB));
  });
});
