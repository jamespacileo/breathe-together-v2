/**
 * ShootingStars - Subtle, slow-drifting stars across the background
 *
 * Creates gentle magical moments with rare shooting stars that drift
 * slowly across the distant background. Subtle and meditative.
 *
 * Features:
 * - Random spawn timing (configurable frequency)
 * - Slow, graceful drift with delicate fading trail
 * - Multiple streak directions for variety
 * - Uses drei Line for efficient trail rendering
 *
 * Performance: Very lightweight - only 1 active at a time by default
 */

import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useState } from 'react';
import * as THREE from 'three';

interface ShootingStar {
  id: number;
  /** Start position */
  start: THREE.Vector3;
  /** Direction of travel (normalized) */
  direction: THREE.Vector3;
  /** Speed of the streak */
  speed: number;
  /** Trail length */
  trailLength: number;
  /** Current progress (0 = start, 1 = end) */
  progress: number;
  /** Lifetime in seconds */
  lifetime: number;
  /** Color of the streak */
  color: string;
}

// Streak direction presets (going diagonally across background)
const STREAK_DIRECTIONS = [
  { start: [-30, 20, -50], dir: [1, -0.3, 0.2] }, // Upper left to lower right
  { start: [30, 25, -50], dir: [-1, -0.4, 0.1] }, // Upper right to lower left
  { start: [-25, 15, -45], dir: [0.8, -0.5, 0.3] }, // Diagonal variation
  { start: [20, 22, -55], dir: [-0.7, -0.35, 0.15] }, // Another diagonal
  { start: [0, 28, -50], dir: [0.5, -0.6, 0.2] }, // Top center going down-right
];

// Soft pastel colors for shooting stars
const STAR_COLORS = [
  '#f8f0e8', // Warm white
  '#e8f4f0', // Cool white
  '#f8e8d0', // Soft gold
  '#e8e0f8', // Pale lavender
  '#d8f0e8', // Mint
];

interface ShootingStarTrailProps {
  star: ShootingStar;
}

/**
 * Renders a single shooting star trail
 */
function ShootingStarTrail({ star }: ShootingStarTrailProps) {
  // Calculate current head position
  const headPos = star.start.clone().addScaledVector(star.direction, star.progress * 100);

  // Calculate tail position (behind the head)
  const tailPos = headPos.clone().addScaledVector(star.direction, -star.trailLength);

  // Create points for the trail with fade
  const points: [number, number, number][] = [
    [tailPos.x, tailPos.y, tailPos.z],
    [headPos.x, headPos.y, headPos.z],
  ];

  // Opacity based on progress (fade in at start, fade out at end)
  const fadeIn = Math.min(star.progress * 3, 1);
  const fadeOut = Math.max(1 - (star.progress - 0.6) * 2.5, 0);
  const opacity = fadeIn * fadeOut * 0.35; // Much more subtle

  if (opacity <= 0.01) return null;

  return (
    <Line
      points={points}
      color={star.color}
      lineWidth={1}
      transparent
      opacity={opacity}
      // Gradient from tail (dim) to head (bright)
      vertexColors={[
        new THREE.Color(star.color).multiplyScalar(0.15).toArray() as [number, number, number],
        new THREE.Color(star.color).toArray() as [number, number, number],
      ]}
    />
  );
}

export interface ShootingStarsProps {
  /**
   * Average interval between shooting stars (seconds)
   * @default 15
   * @min 5
   * @max 60
   */
  interval?: number;

  /**
   * Randomness factor for interval (0 = exact, 1 = fully random)
   * @default 0.6
   * @min 0
   * @max 1
   */
  intervalVariance?: number;

  /**
   * Maximum number of concurrent shooting stars
   * @default 1
   * @min 1
   * @max 3
   */
  maxConcurrent?: number;

  /**
   * Enable/disable shooting stars
   * @default true
   */
  enabled?: boolean;
}

/**
 * ShootingStars - Manages spawning and rendering of shooting stars
 */
export function ShootingStars({
  interval = 15,
  intervalVariance = 0.6,
  maxConcurrent = 1,
  enabled = true,
}: ShootingStarsProps) {
  const [stars, setStars] = useState<ShootingStar[]>([]);
  const [nextSpawnTime, setNextSpawnTime] = useState(Math.random() * interval);
  const [idCounter, setIdCounter] = useState(0);

  /**
   * Spawn a new shooting star
   */
  const spawnStar = useCallback(() => {
    // Pick random direction preset
    const preset = STREAK_DIRECTIONS[Math.floor(Math.random() * STREAK_DIRECTIONS.length)];
    const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];

    // Add some randomness to start position
    const startOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
    );

    const newStar: ShootingStar = {
      id: idCounter,
      start: new THREE.Vector3(...preset.start).add(startOffset),
      direction: new THREE.Vector3(...preset.dir).normalize(),
      speed: 0.25 + Math.random() * 0.15, // 0.25-0.4 progress per second (much slower)
      trailLength: 2 + Math.random() * 2, // 2-4 units (shorter, more delicate)
      progress: 0,
      lifetime: 4 + Math.random() * 2, // 4-6 seconds (leisurely drift)
      color,
    };

    setIdCounter((prev) => prev + 1);
    return newStar;
  }, [idCounter]);

  useFrame((state, delta) => {
    if (!enabled) return;

    const time = state.clock.elapsedTime;

    // Check if we should spawn a new star
    if (time >= nextSpawnTime && stars.length < maxConcurrent) {
      const newStar = spawnStar();
      setStars((prev) => [...prev, newStar]);

      // Calculate next spawn time with variance
      const variance = interval * intervalVariance;
      const nextInterval = interval - variance + Math.random() * variance * 2;
      setNextSpawnTime(time + nextInterval);
    }

    // Update existing stars
    setStars((prev) =>
      prev
        .map((star) => ({
          ...star,
          progress: star.progress + (delta * star.speed) / star.lifetime,
        }))
        // Remove completed stars
        .filter((star) => star.progress < 1),
    );
  });

  if (!enabled) return null;

  return (
    <group name="Shooting Stars">
      {stars.map((star) => (
        <ShootingStarTrail key={star.id} star={star} />
      ))}
    </group>
  );
}

export default ShootingStars;
