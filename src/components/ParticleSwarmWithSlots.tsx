/**
 * ParticleSwarmWithSlots - Wrapper component demonstrating slot-based user ordering
 *
 * This component bridges the gap between the presence data (mood counts) and
 * the slot-based ParticleSwarm system. It handles:
 *
 * 1. Initial sync from mood counts to slots
 * 2. Smooth enter/exit animations when users join/leave
 *
 * **Usage:**
 * ```tsx
 * <ParticleSwarmWithSlots
 *   users={{ grateful: 3, anxious: 2 }}
 *   count={48}
 * />
 * ```
 *
 * For demo controls, use the standalone `UserSlotDemoControls` component.
 */

import { useEffect, useState } from 'react';
import { MOOD_IDS, type MoodId } from '../constants';
import { ParticleSwarm, type ParticleSwarmProps } from '../entities/particle/ParticleSwarm';
import { useMoodSlots } from '../hooks/useMoodSlots';

interface ParticleSwarmWithSlotsProps
  extends Omit<ParticleSwarmProps, 'slotStates' | 'onTickAnimations'> {
  /** Callback when user count changes (for external sync) */
  onUserCountChange?: (count: number) => void;
}

export function ParticleSwarmWithSlots({
  users,
  count = 48,
  onUserCountChange,
  ...restProps
}: ParticleSwarmWithSlotsProps) {
  const { slotStates, syncFromMoodCounts, tickAnimations, slots } = useMoodSlots({
    slotCount: count,
    animationDuration: 0.6,
  });

  // Initial sync from users prop
  useEffect(() => {
    if (users) {
      syncFromMoodCounts(users);
    }
  }, [users, syncFromMoodCounts]);

  // Notify parent of user count changes
  useEffect(() => {
    const userCount = slots.filter((s) => s !== null).length;
    onUserCountChange?.(userCount);
  }, [slots, onUserCountChange]);

  return (
    <ParticleSwarm
      {...restProps}
      count={count}
      slotStates={slotStates}
      onTickAnimations={tickAnimations}
    />
  );
}

/**
 * Standalone demo controls component for testing user join/leave
 * Use this outside the Canvas with Html or as a React portal
 */
export interface UserSlotDemoControlsProps {
  /** Add a user with the specified mood */
  onAddUser: (mood: MoodId) => void;
  /** Remove the user at the specified slot index */
  onRemoveUser: (slotIndex: number) => void;
  /** Current slots state for display */
  slots: (MoodId | null)[];
  /** Current slot count */
  slotCount: number;
}

export function UserSlotDemoControls({
  onAddUser,
  onRemoveUser,
  slots,
  slotCount,
}: UserSlotDemoControlsProps) {
  const [selectedMood, setSelectedMood] = useState<MoodId>('gratitude');
  const occupiedCount = slots.filter((s) => s !== null).length;

  const handleAddBatch = (batchSize: number) => {
    for (let i = 0; i < batchSize; i++) {
      const randomMood = MOOD_IDS[Math.floor(Math.random() * MOOD_IDS.length)];
      setTimeout(() => onAddUser(randomMood), i * 100);
    }
  };

  const handleRemoveBatch = (batchSize: number) => {
    for (let i = 0; i < batchSize; i++) {
      setTimeout(() => {
        // Find last occupied slot (iterate backwards for ES2020 compat)
        let lastOccupiedIndex = -1;
        for (let j = slots.length - 1; j >= 0; j--) {
          if (slots[j] !== null) {
            lastOccupiedIndex = j;
            break;
          }
        }
        if (lastOccupiedIndex >= 0) {
          onRemoveUser(lastOccupiedIndex);
        }
      }, i * 100);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '16px',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        minWidth: '220px',
      }}
    >
      <div
        style={{
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}
      >
        User Ordering Demo
      </div>

      {/* Stats */}
      <div style={{ marginBottom: '12px', opacity: 0.8 }}>
        Users: {occupiedCount} / {slotCount} slots
      </div>

      {/* Mood Selector */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', opacity: 0.7 }}>
          Mood:
          <select
            value={selectedMood}
            onChange={(e) => setSelectedMood(e.target.value as MoodId)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: '13px',
              marginTop: '4px',
            }}
          >
            {MOOD_IDS.map((mood) => (
              <option key={mood} value={mood}>
                {mood}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Single User Actions */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => onAddUser(selectedMood)}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '6px',
            border: 'none',
            background: '#4ade80',
            color: '#000',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add User
        </button>
        <button
          type="button"
          onClick={() => {
            // Find last occupied slot (iterate backwards for ES2020 compat)
            let lastOccupiedIndex = -1;
            for (let i = slots.length - 1; i >= 0; i--) {
              if (slots[i] !== null) {
                lastOccupiedIndex = i;
                break;
              }
            }
            if (lastOccupiedIndex >= 0) onRemoveUser(lastOccupiedIndex);
          }}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '6px',
            border: 'none',
            background: '#f87171',
            color: '#000',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          - Remove User
        </button>
      </div>

      {/* Batch Actions */}
      <div style={{ opacity: 0.7, marginBottom: '6px' }}>Batch:</div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[5, 10, 20].map((n) => (
          <button
            key={`add-${n}`}
            type="button"
            onClick={() => handleAddBatch(n)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: 'none',
              background: 'rgba(74, 222, 128, 0.3)',
              color: '#4ade80',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            +{n}
          </button>
        ))}
        {[5, 10, 20].map((n) => (
          <button
            key={`remove-${n}`}
            type="button"
            onClick={() => handleRemoveBatch(n)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: 'none',
              background: 'rgba(248, 113, 113, 0.3)',
              color: '#f87171',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            -{n}
          </button>
        ))}
      </div>
    </div>
  );
}
