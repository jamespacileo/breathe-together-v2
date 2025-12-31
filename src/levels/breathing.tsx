import { Html, PresentationControls } from '@react-three/drei';
import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SimpleGaiaUI } from '../components/SimpleGaiaUI';
import { TopRightControls } from '../components/TopRightControls';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { UserShapeIndicator } from '../entities/particle/UserShapeIndicator';
import { generateMockPresence } from '../lib/mockPresence';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * Generate or retrieve persistent current user ID
 * Uses localStorage for session persistence
 */
function getCurrentUserId(): string {
  const STORAGE_KEY = 'breathe-together-user-id';
  let userId = localStorage.getItem(STORAGE_KEY);
  if (!userId) {
    // Generate a new user ID using crypto for randomness
    userId = `user-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(STORAGE_KEY, userId);
  }
  return userId;
}

// Current user ID (stable across session)
const CURRENT_USER_ID = getCurrentUserId();

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
 */
export function BreathingLevel({
  particleDensity,
  // DEBUG-ONLY: Entity visibility toggles (all default true)
  showGlobe = true,
  showParticles = true,
  showEnvironment = true,
}: Partial<BreathingLevelProps> = {}) {
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

  // Depth of Field settings - constants (not exposed to UI currently)
  const enableDepthOfField = TUNING_DEFAULTS.enableDepthOfField;
  const focusDistance = TUNING_DEFAULTS.focusDistance;
  const focalRange = TUNING_DEFAULTS.focalRange;
  const maxBlur = TUNING_DEFAULTS.maxBlur;

  // UI modal states (controlled by TopRightControls)
  const [showTuneControls, setShowTuneControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Current user's shard position getter (provided by ParticleSwarm)
  const positionGetterRef = useRef<(() => THREE.Vector3 | null) | null>(null);

  // Handler to receive position getter from ParticleSwarm
  const handlePositionGetter = useCallback((getter: () => THREE.Vector3 | null) => {
    positionGetterRef.current = getter;
  }, []);

  // Wrapper function that calls the stored getter
  const getShardPosition = useCallback(() => {
    return positionGetterRef.current?.() ?? null;
  }, []);

  // Generate mock users with randomized order for visual variety
  // Current user is always included in the list
  const mockUsers = useMemo(() => {
    const presence = generateMockPresence(harmony);
    // Convert aggregate mood counts to individual users
    const users: Array<{ id: string; mood: 'gratitude' | 'presence' | 'release' | 'connection' }> =
      [];
    for (const [mood, count] of Object.entries(presence.moods)) {
      for (let i = 0; i < count; i++) {
        users.push({
          id: `${mood}-${i}`,
          mood: mood as 'gratitude' | 'presence' | 'release' | 'connection',
        });
      }
    }

    // Shuffle users for visual variety (colors distributed across sphere)
    // Use Fisher-Yates shuffle with seeded random for consistency within session
    const seed = harmony; // Same count = same shuffle
    const seededRandom = (i: number) => {
      const x = Math.sin(seed * 9999 + i * 1234) * 10000;
      return x - Math.floor(x);
    };

    for (let i = users.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(i) * (i + 1));
      [users[i], users[j]] = [users[j], users[i]];
    }

    // Add current user at the beginning (will get slot 0)
    // Use 'connection' mood (rose color) to make the user stand out
    return [{ id: CURRENT_USER_ID, mood: 'connection' as const }, ...users];
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
                users={mockUsers}
                baseRadius={orbitRadius}
                maxShardSize={shardSize}
                currentUserId={CURRENT_USER_ID}
                onCurrentUserPositionGetter={handlePositionGetter}
              />
            )}

            {/* User "YOU" indicator - follows the current user's shard */}
            {showParticles && <UserShapeIndicator getShardPosition={getShardPosition} />}

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
            setHarmony={setHarmony}
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
          />
        </Html>
      </Suspense>
    </ErrorBoundary>
  );
}

export default BreathingLevel;
