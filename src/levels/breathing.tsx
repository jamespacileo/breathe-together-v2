import { Html, PresentationControls } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SimpleGaiaUI } from '../components/SimpleGaiaUI';
import { TopRightControls } from '../components/TopRightControls';
import type { MoodId } from '../constants';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { generateRandomMoods, useMoodArray } from '../hooks/useMoodArray';
import type { BreathingLevelProps } from '../types/sceneProps';

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
 * **User Ordering (Dec 2024):**
 * Now uses slot-based user ordering for smooth enter/exit animations.
 * Press 'D' to toggle demo controls for testing user join/leave.
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
  // Depth of Field state
  const [enableDepthOfField] = useState(TUNING_DEFAULTS.enableDepthOfField);
  const [focusDistance] = useState(TUNING_DEFAULTS.focusDistance);
  const [focalRange] = useState(TUNING_DEFAULTS.focalRange);
  const [maxBlur] = useState(TUNING_DEFAULTS.maxBlur);

  // UI modal states (controlled by TopRightControls)
  const [showTuneControls, setShowTuneControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Demo controls state
  const [showDemoControls, setShowDemoControls] = useState(false);

  // Dynamic mood array system - count is derived from array length
  // This format matches the future backend: a direct array of mood IDs
  const { shardStates, addUser, removeUser, tickAnimations, moods, userCount } = useMoodArray({
    animationDuration: 0.6,
    // Initial random moods: ~60% of harmony count
    initialMoods: generateRandomMoods(Math.floor(harmony * 0.6)),
  });

  // Keyboard shortcut: Press 'D' to toggle demo controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        setShowDemoControls((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Callbacks for demo controls
  const handleAddUser = useCallback(
    (mood: MoodId) => {
      addUser(mood);
    },
    [addUser],
  );

  const handleRemoveUser = useCallback(
    (index: number) => {
      removeUser(index);
    },
    [removeUser],
  );

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
                count={shardStates.length}
                shardStates={shardStates}
                onTickAnimations={tickAnimations}
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

          {/* User Ordering Demo Controls - Press 'D' to toggle */}
          {showDemoControls && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
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
              <div style={{ marginBottom: '12px', fontWeight: 600 }}>Dynamic Mood Array Demo</div>
              <div style={{ marginBottom: '12px', opacity: 0.8 }}>
                Users: {userCount} (visible: {shardStates.length})
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleAddUser('gratitude')}
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
                  + Add
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveUser(moods.length - 1)}
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
                  - Remove
                </button>
              </div>
              <div style={{ fontSize: '11px', opacity: 0.6 }}>
                Moods: [{moods.slice(0, 5).join(', ')}
                {moods.length > 5 ? `, ...+${moods.length - 5}` : ''}]
              </div>
            </div>
          )}
        </Html>
      </Suspense>
    </ErrorBoundary>
  );
}

export default BreathingLevel;
