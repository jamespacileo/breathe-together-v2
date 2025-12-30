/**
 * MoodSelector Component
 * Allows user to select their current mood
 */

import { useState } from 'react';
import { MOOD_IDS, type MoodId } from '../../constants';
import { getMonumentValleyMoodColor } from '../../lib/colors';
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  transitions,
  typography,
} from '../../styles/designTokens';

/**
 * Human-readable mood labels
 */
const MOOD_LABELS: Record<MoodId, string> = {
  moment: 'Present',
  anxious: 'Seeking Calm',
  processing: 'Processing',
  preparing: 'Preparing',
  grateful: 'Grateful',
  celebrating: 'Celebrating',
  here: 'Just Here',
};

/**
 * Mood descriptions for onboarding
 */
const MOOD_DESCRIPTIONS: Record<MoodId, string> = {
  moment: 'Fully present in this moment',
  anxious: 'Looking for peace and grounding',
  processing: 'Working through thoughts',
  preparing: 'Getting ready for something ahead',
  grateful: 'Feeling thankful and appreciative',
  celebrating: 'Joyful and energized',
  here: 'Simply being, no agenda',
};

export interface MoodSelectorProps {
  /** Currently selected mood */
  selectedMood: MoodId;
  /** Mood change handler */
  onMoodChange: (mood: MoodId) => void;
  /** Show descriptions under mood names */
  showDescriptions?: boolean;
  /** Layout style */
  layout?: 'grid' | 'list';
}

export function MoodSelector({
  selectedMood,
  onMoodChange,
  showDescriptions = false,
  layout = 'grid',
}: MoodSelectorProps) {
  const [hoveredMood, setHoveredMood] = useState<MoodId | null>(null);

  const containerStyle: React.CSSProperties =
    layout === 'grid'
      ? {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: spacing.md,
        }
      : {
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
        };

  return (
    <div style={containerStyle}>
      {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Mood button render requires conditional styling for selected/hover states and layout variants */}
      {MOOD_IDS.map((mood) => {
        const isSelected = mood === selectedMood;
        const isHovered = mood === hoveredMood;
        const moodColor = getMonumentValleyMoodColor(mood);

        return (
          <button
            key={mood}
            type="button"
            onClick={() => onMoodChange(mood)}
            onMouseEnter={() => setHoveredMood(mood)}
            onMouseLeave={() => setHoveredMood(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              padding: layout === 'grid' ? spacing.lg : spacing.md,
              background: isSelected ? colors.glassDark : isHovered ? colors.glass : 'transparent',
              border: `2px solid ${isSelected ? moodColor : isHovered ? colors.border : 'transparent'}`,
              borderRadius: borderRadius.lg,
              cursor: 'pointer',
              transition: transitions.normal,
              textAlign: 'left',
              boxShadow: isSelected ? shadows.md : 'none',
              transform: isSelected ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            {/* Color indicator */}
            <div
              style={{
                width: layout === 'grid' ? '16px' : '12px',
                height: layout === 'grid' ? '16px' : '12px',
                borderRadius: '50%',
                background: moodColor,
                boxShadow: isSelected ? `0 0 12px ${moodColor}40` : 'none',
                transition: transitions.normal,
                flexShrink: 0,
              }}
            />

            {/* Text content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: layout === 'grid' ? typography.fontSize.sm : typography.fontSize.xs,
                  fontWeight: isSelected
                    ? typography.fontWeight.semibold
                    : typography.fontWeight.medium,
                  color: isSelected ? colors.accent : colors.text,
                  textTransform: 'uppercase',
                  letterSpacing: typography.letterSpacing.wide,
                  marginBottom: showDescriptions ? spacing.xs : 0,
                }}
              >
                {MOOD_LABELS[mood]}
              </div>

              {showDescriptions && (
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.textDim,
                    lineHeight: typography.lineHeight.relaxed,
                  }}
                >
                  {MOOD_DESCRIPTIONS[mood]}
                </div>
              )}
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: colors.accent,
                  flexShrink: 0,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
