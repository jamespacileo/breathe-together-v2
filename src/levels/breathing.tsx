import { Html, PresentationControls } from '@react-three/drei';
import { Suspense, useCallback, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SimpleGaiaUI } from '../components/SimpleGaiaUI';
import { TopRightControls } from '../components/TopRightControls';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { useSimulatedUserFlow } from '../hooks/useSimulatedUserFlow';
import type { BreathingLevelProps } from '../types/sceneProps';

/** Generate a random mood index (0-3) */
function randomMood(): number {
  return Math.floor(Math.random() * 4);
}

/**
 * Generate a randomized mood array for initial display
 * Each element is a mood index (0-3) representing the 4 mood categories
 *
 * @param count - Number of users to generate
 * @returns Array of mood indices (only active moods, no -1 values)
 */
function generateRandomMoodArray(count: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    result.push(randomMood());
  }
  return result;
}

/**
 * Tuning defaults for visual aesthetics (matching reference)
 */
const TUNING_DEFAULTS = {
  particleCounts: { sparse: 24, normal: 48, dense: 96 },
  ior: 1.3, // Index of Refraction
  backfaceIntensity: 0.3, // Glass depth/distortion
  orbitRadius: 4.5, // Base orbit radius
  shardSize: 0.5, // Max shard size
  atmosphereDensity: 100, // Atmospheric particle count
  // Depth of Field settings
  enableDepthOfField: true,
  focusDistance: 15, // Focus on center (camera distance)
  focalRange: 8, // Range that stays sharp
  maxBlur: 3, // Maximum blur intensity
};

/**
 * BreathingLevel - Core meditation environment.
 * Uses 3-pass FBO refraction pipeline for Monument Valley frosted glass effect.
 *
 * User Ordering System (Dec 2024):
 * - Uses ordered mood array where each element is a mood index (0-3)
 * - Slot-based system ready for real user data from backend
 * - Set `simulateUserFlow=true` to enable dynamic arrivals/departures demo
 */
export function BreathingLevel({
  particleDensity,
  // DEBUG-ONLY: Entity visibility toggles (all default true)
  showGlobe = true,
  showParticles = true,
  showEnvironment = true,
  // User ordering system - enable dynamic simulation for demo
  simulateUserFlow = false,
}: Partial<BreathingLevelProps> & { simulateUserFlow?: boolean } = {}) {
  // UI State for tuning the aesthetic
  const [harmony, setHarmony] = useState(
    particleDensity === 'sparse'
      ? TUNING_DEFAULTS.particleCounts.sparse
      : particleDensity === 'dense'
        ? TUNING_DEFAULTS.particleCounts.dense
        : TUNING_DEFAULTS.particleCounts.normal,
  );
  const [ior, setIor] = useState(TUNING_DEFAULTS.ior);
  const [glassDepth, setGlassDepth] = useState(TUNING_DEFAULTS.backfaceIntensity);
  const [orbitRadius, setOrbitRadius] = useState(TUNING_DEFAULTS.orbitRadius);
  const [shardSize, setShardSize] = useState(TUNING_DEFAULTS.shardSize);
  const [atmosphereDensity, setAtmosphereDensity] = useState(TUNING_DEFAULTS.atmosphereDensity);
  // Depth of Field state
  const [enableDepthOfField] = useState(TUNING_DEFAULTS.enableDepthOfField);
  const [focusDistance] = useState(TUNING_DEFAULTS.focusDistance);
  const [focalRange] = useState(TUNING_DEFAULTS.focalRange);
  const [maxBlur] = useState(TUNING_DEFAULTS.maxBlur);

  // UI modal states (controlled by TopRightControls)
  const [showTuneControls, setShowTuneControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Managed mood array state - source of truth for particle swarm
  const initialCount = Math.floor(
    (particleDensity === 'sparse'
      ? TUNING_DEFAULTS.particleCounts.sparse
      : particleDensity === 'dense'
        ? TUNING_DEFAULTS.particleCounts.dense
        : TUNING_DEFAULTS.particleCounts.normal) * 0.7,
  );
  const [managedMoodArray, setManagedMoodArray] = useState<number[]>(() =>
    generateRandomMoodArray(initialCount),
  );

  // Dynamic simulated user flow (for demo/testing)
  const { moodArray: simulatedMoodArray } = useSimulatedUserFlow({
    maxSlots: harmony,
    initialUsers: Math.floor(harmony * 0.6),
    targetUserCount: Math.floor(harmony * 0.7),
    paused: !simulateUserFlow,
  });

  // Use simulated array when enabled, otherwise managed array
  const moodArray = simulateUserFlow ? simulatedMoodArray : managedMoodArray;

  /**
   * Handle harmony slider changes - adds/removes random moods to simulate real behavior
   */
  const handleHarmonyChange = useCallback(
    (newHarmony: number) => {
      setHarmony(newHarmony);

      // Target count is ~70% of harmony
      const targetCount = Math.floor(newHarmony * 0.7);
      const currentCount = managedMoodArray.length;

      if (targetCount > currentCount) {
        // Add random moods to reach target
        const newMoods = [...managedMoodArray];
        for (let i = 0; i < targetCount - currentCount; i++) {
          newMoods.push(randomMood());
        }
        setManagedMoodArray(newMoods);
      } else if (targetCount < currentCount) {
        // Remove random indices to reach target
        const newMoods = [...managedMoodArray];
        const removeCount = currentCount - targetCount;
        for (let i = 0; i < removeCount; i++) {
          const randomIndex = Math.floor(Math.random() * newMoods.length);
          newMoods.splice(randomIndex, 1);
        }
        setManagedMoodArray(newMoods);
      }
    },
    [managedMoodArray],
  );

  // Utility callbacks for testing
  const addRandomUser = useCallback(() => {
    setManagedMoodArray((prev) => [...prev, randomMood()]);
  }, []);

  const removeRandomUser = useCallback(() => {
    setManagedMoodArray((prev) => {
      if (prev.length === 0) return prev;
      const randomIndex = Math.floor(Math.random() * prev.length);
      return prev.filter((_, i) => i !== randomIndex);
    });
  }, []);

  const addBatchUsers = useCallback((count: number) => {
    setManagedMoodArray((prev) => {
      const newMoods = [...prev];
      for (let i = 0; i < count; i++) {
        newMoods.push(randomMood());
      }
      return newMoods;
    });
  }, []);

  const removeBatchUsers = useCallback((count: number) => {
    setManagedMoodArray((prev) => {
      const newMoods = [...prev];
      const actualRemove = Math.min(count, newMoods.length);
      for (let i = 0; i < actualRemove; i++) {
        const randomIndex = Math.floor(Math.random() * newMoods.length);
        newMoods.splice(randomIndex, 1);
      }
      return newMoods;
    });
  }, []);

  const shuffleMoods = useCallback(() => {
    setManagedMoodArray((prev) => prev.map(() => randomMood()));
  }, []);

  const clearAllUsers = useCallback(() => {
    setManagedMoodArray([]);
  }, []);

  const resetToDefault = useCallback(() => {
    const count = Math.floor(harmony * 0.7);
    setManagedMoodArray(generateRandomMoodArray(count));
  }, [harmony]);

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {/* 4-Pass FBO Refraction Pipeline handles background + refraction + depth of field rendering */}
        <RefractionPipeline
          ior={ior}
          backfaceIntensity={glassDepth}
          enableDepthOfField={enableDepthOfField}
          focusDistance={focusDistance}
          focalRange={focalRange}
          maxBlur={maxBlur}
        >
          {/* Monument Valley inspired atmosphere - clouds, lighting, fog */}
          {showEnvironment && <Environment showClouds={true} showStars={true} />}

          {/* Wrap rotatable entities in PresentationControls */}
          <PresentationControls
            global
            cursor={true}
            snap={false}
            speed={1}
            damping={0.3}
            polar={[-Math.PI * 0.3, Math.PI * 0.3]}
            azimuth={[-Infinity, Infinity]}
          >
            {showGlobe && <EarthGlobe />}

            {showParticles && (
              <ParticleSwarm
                moodArray={moodArray}
                baseRadius={orbitRadius}
                maxShardSize={shardSize}
              />
            )}

            {showParticles && (
              <AtmosphericParticles
                count={atmosphereDensity}
                size={0.08}
                baseOpacity={0.1}
                breathingOpacity={0.15}
              />
            )}
          </PresentationControls>
        </RefractionPipeline>

        {/* UI stays OUTSIDE pipeline (fixed HUD) - Simplified for first-time users */}
        <Html fullscreen>
          {/* Top-right control icons (audio + tune + settings) */}
          <TopRightControls
            onOpenTuneControls={() => setShowTuneControls(true)}
            onOpenSettings={() => setShowSettings(true)}
          />

          {/* Main UI with breathing phase, inspirational text, and modals */}
          <SimpleGaiaUI
            harmony={harmony}
            setHarmony={handleHarmonyChange}
            userCount={moodArray.length}
            ior={ior}
            setIor={setIor}
            glassDepth={glassDepth}
            setGlassDepth={setGlassDepth}
            orbitRadius={orbitRadius}
            setOrbitRadius={setOrbitRadius}
            shardSize={shardSize}
            setShardSize={setShardSize}
            atmosphereDensity={atmosphereDensity}
            setAtmosphereDensity={setAtmosphereDensity}
            showTuneControls={showTuneControls}
            onShowTuneControlsChange={setShowTuneControls}
            showSettings={showSettings}
            onShowSettingsChange={setShowSettings}
            // Utility callbacks for testing user events
            onAddUser={addRandomUser}
            onRemoveUser={removeRandomUser}
            onAddBatch={() => addBatchUsers(5)}
            onRemoveBatch={() => removeBatchUsers(5)}
            onShuffle={shuffleMoods}
            onClearAll={clearAllUsers}
            onReset={resetToDefault}
          />
        </Html>
      </Suspense>
    </ErrorBoundary>
  );
}

export default BreathingLevel;
