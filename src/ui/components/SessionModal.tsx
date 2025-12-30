import { useState } from 'react';
import { Button } from '../primitives/Button';
import { GlassCard } from '../primitives/GlassCard';
import { Divider, HStack, VStack } from '../primitives/Stack';
import { Heading, Label, Text } from '../primitives/Text';
import { colors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { Modal } from './Modal';
import { SegmentedControl } from './Slider';

// Breathing pattern definitions
const BREATHING_PATTERNS = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: 'Equal phases for calm focus',
    phases: [4, 4, 4, 4],
  },
  {
    id: '478',
    name: '4-7-8 Breathing',
    description: 'Extended exhale for relaxation',
    phases: [4, 7, 8, 0],
  },
  {
    id: 'coherent',
    name: 'Coherent Breathing',
    description: 'Simple 5-5 for heart rate variability',
    phases: [5, 0, 5, 0],
  },
] as const;

// Session duration options (in minutes)
const DURATION_OPTIONS = [
  { value: '1', label: '1 min' },
  { value: '3', label: '3 min' },
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
];

export interface SessionConfig {
  pattern: (typeof BREATHING_PATTERNS)[number]['id'];
  durationMinutes: number;
}

export interface WelcomeModalProps {
  /** Whether modal is visible */
  open: boolean;
  /** Called when session starts */
  onStart: (config: SessionConfig) => void;
  /** Current user count */
  userCount?: number;
}

/**
 * WelcomeModal - Session setup modal for new users
 *
 * Allows selecting breathing pattern and session duration.
 */
export function WelcomeModal({ open, onStart, userCount = 0 }: WelcomeModalProps) {
  const [pattern, setPattern] = useState<SessionConfig['pattern']>('box');
  const [duration, setDuration] = useState<string>('3');

  const handleStart = () => {
    onStart({
      pattern,
      durationMinutes: Number.parseInt(duration, 10),
    });
  };

  return (
    <Modal
      open={open}
      onClose={() => {}} // Prevent closing without starting
      hideCloseButton
      size="md"
    >
      <VStack gap="lg" align="center" style={{ textAlign: 'center' }}>
        {/* Header */}
        <VStack gap="xs" align="center">
          <Label>Breathe Together</Label>
          <Heading level={1} style={{ fontWeight: 300 }}>
            Welcome
          </Heading>
          {userCount > 0 && (
            <Text variant="body" color="secondary">
              Join {userCount.toLocaleString()} others breathing right now
            </Text>
          )}
        </VStack>

        <Divider />

        {/* Pattern Selection */}
        <VStack gap="md" fullWidth>
          <Label>Choose Your Pattern</Label>
          <VStack gap="sm" fullWidth>
            {BREATHING_PATTERNS.map((p) => (
              <PatternCard
                key={p.id}
                pattern={p}
                selected={pattern === p.id}
                onClick={() => setPattern(p.id)}
              />
            ))}
          </VStack>
        </VStack>

        <Divider />

        {/* Duration Selection */}
        <VStack gap="md" fullWidth>
          <SegmentedControl
            label="Session Length"
            options={DURATION_OPTIONS}
            value={duration}
            onChange={setDuration}
            fullWidth
          />
        </VStack>

        <Divider />

        {/* Start Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleStart}
          style={{ marginTop: spacing.sm }}
        >
          Begin Session
        </Button>

        <Text variant="bodySmall" color="dim">
          You&apos;ll breathe in sync with everyone worldwide
        </Text>
      </VStack>
    </Modal>
  );
}

/**
 * PatternCard - Selectable breathing pattern card
 */
interface PatternCardProps {
  pattern: (typeof BREATHING_PATTERNS)[number];
  selected: boolean;
  onClick: () => void;
}

function PatternCard({ pattern, selected, onClick }: PatternCardProps) {
  return (
    <GlassCard
      intensity={selected ? 'strong' : 'subtle'}
      padding="md"
      onClick={onClick}
      style={{
        border: `2px solid ${selected ? colors.accent.primary : 'transparent'}`,
        cursor: 'pointer',
      }}
    >
      <HStack justify="between" align="center" fullWidth>
        <VStack gap="xs" align="start">
          <Text variant="accent" color={selected ? 'accent' : 'primary'}>
            {pattern.name}
          </Text>
          <Text variant="bodySmall" color="secondary">
            {pattern.description}
          </Text>
        </VStack>

        {/* Phase visualization */}
        <HStack gap="xs">
          {pattern.phases.map((phase, phaseIndex) =>
            phase > 0 ? (
              <div
                key={`${pattern.id}-phase-${phaseIndex}`}
                style={{
                  width: `${phase * 4}px`,
                  height: '8px',
                  borderRadius: '4px',
                  background: selected ? colors.accent.primary : colors.border.medium,
                  opacity: 0.8,
                }}
              />
            ) : null,
          )}
        </HStack>
      </HStack>
    </GlassCard>
  );
}

/**
 * SessionCompleteModal - Post-session summary
 */
export interface SessionStats {
  durationSeconds: number;
  breathCycles: number;
  pattern: string;
}

export interface SessionCompleteModalProps {
  open: boolean;
  onClose: () => void;
  onNewSession: () => void;
  stats: SessionStats;
}

export function SessionCompleteModal({
  open,
  onClose,
  onNewSession,
  stats,
}: SessionCompleteModalProps) {
  const minutes = Math.floor(stats.durationSeconds / 60);
  const seconds = stats.durationSeconds % 60;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Session Complete"
      size="sm"
      footer={
        <HStack gap="sm">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
          <Button variant="primary" onClick={onNewSession}>
            New Session
          </Button>
        </HStack>
      }
    >
      <VStack gap="lg" align="center" style={{ textAlign: 'center', padding: spacing.md }}>
        {/* Celebration Icon */}
        <div
          style={{
            fontSize: '48px',
            lineHeight: 1,
          }}
        >
          🌱
        </div>

        <VStack gap="sm" align="center">
          <Heading level={2} style={{ fontWeight: 300 }}>
            Well done
          </Heading>
          <Text variant="body" color="secondary">
            You completed a {stats.pattern} session
          </Text>
        </VStack>

        {/* Stats Grid */}
        <HStack gap="xl" justify="center" style={{ marginTop: spacing.md }}>
          <VStack gap="xs" align="center">
            <Text variant="numberLarge" color="accent">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </Text>
            <Label>Duration</Label>
          </VStack>
          <VStack gap="xs" align="center">
            <Text variant="numberLarge" color="accent">
              {stats.breathCycles}
            </Text>
            <Label>Breaths</Label>
          </VStack>
        </HStack>
      </VStack>
    </Modal>
  );
}
