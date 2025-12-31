import { Html, PresentationControls } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SimpleGaiaUI } from '../components/SimpleGaiaUI';
import { TopRightControls } from '../components/TopRightControls';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE, MOOD_IDS, type MoodId } from '../constants';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { generateRandomMoods, useMoodArray } from '../hooks/useMoodArray';
import type { BreathingLevelProps } from '../types/sceneProps';

/** Get a random mood from the available moods */
const getRandomMood = (): MoodId => MOOD_IDS[Math.floor(Math.random() * MOOD_IDS.length)];

/**
 * Check if we're currently in a hold phase (good time to sync users)
 * Returns true during HOLD_IN phase (phase 1) which is 7 seconds long
 * This provides a natural sync point where visual changes are less jarring
 */
function isInHoldPhase(): boolean {
  const now = Date.now() / 1000;
  const cycleTime = now % BREATH_TOTAL_CYCLE;
  // Hold-in starts after inhale (4s) and lasts 7s
  const holdStart = BREATH_PHASES.INHALE;
  const holdEnd = holdStart + BREATH_PHASES.HOLD_IN;
  return cycleTime >= holdStart && cycleTime < holdEnd;
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
  const [isSimulating, setIsSimulating] = useState(false);
  const [inHoldPhase, setInHoldPhase] = useState(false);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

  // Track hold phase for UI indicator
  useEffect(() => {
    if (!showDemoControls) return;
    const checkPhase = () => setInHoldPhase(isInHoldPhase());
    checkPhase();
    const interval = setInterval(checkPhase, 100);
    return () => clearInterval(interval);
  }, [showDemoControls]);

  // Dynamic mood array system - count is derived from array length
  // This format matches the future backend: a direct array of mood IDs
  const { shardStates, addUser, removeUser, setMoods, tickAnimations, moods, userCount } =
    useMoodArray({
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

  // Batch operations
  const handleAddBatch = useCallback(
    (count: number) => {
      const newMoods = generateRandomMoods(count);
      setMoods([...moods, ...newMoods]);
    },
    [moods, setMoods],
  );

  const handleRemoveBatch = useCallback(
    (count: number) => {
      if (moods.length === 0) return;
      const removeCount = Math.min(count, moods.length);
      // Remove from random positions for more realistic behavior
      const newMoods = [...moods];
      for (let i = 0; i < removeCount; i++) {
        const randomIndex = Math.floor(Math.random() * newMoods.length);
        newMoods.splice(randomIndex, 1);
      }
      setMoods(newMoods);
    },
    [moods, setMoods],
  );

  // Set to target count (harmony slider integration)
  const handleSetTargetCount = useCallback(
    (target: number) => {
      if (target > moods.length) {
        // Add users to reach target
        const toAdd = target - moods.length;
        setMoods([...moods, ...generateRandomMoods(toAdd)]);
      } else if (target < moods.length) {
        // Remove users to reach target (from end)
        setMoods(moods.slice(0, target));
      }
    },
    [moods, setMoods],
  );

  // Ambient user sync - small automatic updates during each hold phase
  // This simulates real-world behavior where users join/leave naturally
  // Will be replaced by Cloudflare Workers backend later
  const lastHoldSyncRef = useRef<number>(0);
  const moodsLengthRef = useRef(moods.length);
  moodsLengthRef.current = moods.length; // Keep ref updated without re-running effect

  useEffect(() => {
    const checkAndSync = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const holdStart = BREATH_PHASES.INHALE;
      const holdEnd = holdStart + BREATH_PHASES.HOLD_IN;
      const inHold = cycleTime >= holdStart && cycleTime < holdEnd;

      // Only sync once per hold phase (track by cycle number)
      const cycleNumber = Math.floor(now / BREATH_TOTAL_CYCLE);

      if (inHold && cycleNumber !== lastHoldSyncRef.current) {
        lastHoldSyncRef.current = cycleNumber;

        // Small ambient changes: 1-3 users, 70% chance of change
        if (Math.random() < 0.7) {
          const changeCount = 1 + Math.floor(Math.random() * 2); // 1-2 changes

          for (let i = 0; i < changeCount; i++) {
            // 55% add, 45% remove (slight growth bias)
            const shouldAdd = Math.random() < 0.55;
            const currentLength = moodsLengthRef.current;

            if (shouldAdd || currentLength <= 5) {
              addUser(getRandomMood());
            } else {
              const randomIndex = Math.floor(Math.random() * currentLength);
              removeUser(randomIndex);
            }
          }
        }
      }
    };

    const interval = setInterval(checkAndSync, 200);
    return () => clearInterval(interval);
  }, [addUser, removeUser]); // Removed moods.length - use ref instead

  // Simulation: Random join/leave activity - only during hold phases
  // This syncs user changes with the natural breathing rhythm
  useEffect(() => {
    if (isSimulating) {
      const tick = () => {
        // Only apply changes during hold phase (less jarring visually)
        if (isInHoldPhase()) {
          // Random action: 60% add, 40% remove (net growth bias)
          const shouldAdd = Math.random() < 0.6;
          const currentLength = moodsLengthRef.current;

          if (shouldAdd) {
            addUser(getRandomMood());
          } else if (currentLength > 5) {
            // Keep minimum 5 users
            const randomIndex = Math.floor(Math.random() * currentLength);
            removeUser(randomIndex);
          }
        }

        // Check more frequently during hold phase, less during active breathing
        // Hold phase: 200-500ms intervals for responsive updates
        // Active phase: 500-1000ms intervals (will skip but still check)
        const inHold = isInHoldPhase();
        const nextInterval = inHold ? 200 + Math.random() * 300 : 500 + Math.random() * 500;
        simulationRef.current = setTimeout(tick, nextInterval);
      };

      // Start first tick
      simulationRef.current = setTimeout(tick, 500);

      return () => {
        if (simulationRef.current) {
          clearTimeout(simulationRef.current);
        }
      };
    }
  }, [isSimulating, addUser, removeUser]); // Removed moods.length - use ref instead

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
            userCount={userCount}
            onSetUserCount={handleSetTargetCount}
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
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '20px',
                color: '#fff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '13px',
                minWidth: '320px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  marginBottom: '16px',
                  fontWeight: 700,
                  fontSize: '15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>🎭 User Simulation</span>
                <span style={{ fontSize: '12px', opacity: 0.7, fontWeight: 400 }}>
                  Press D to close
                </span>
              </div>

              {/* Sync Phase Indicator */}
              <div
                style={{
                  marginBottom: '16px',
                  padding: '10px 12px',
                  background: inHoldPhase ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: inHoldPhase
                    ? '1px solid rgba(34, 197, 94, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: inHoldPhase ? '#22c55e' : '#666',
                    boxShadow: inHoldPhase ? '0 0 8px #22c55e' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 600 }}>
                    {inHoldPhase ? 'SYNC WINDOW OPEN' : 'WAITING FOR HOLD'}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.6 }}>
                    {inHoldPhase
                      ? 'Changes apply during hold phase'
                      : 'Changes queued until hold phase'}
                  </div>
                </div>
              </div>

              {/* User Count Display */}
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>
                    ACTIVE USERS
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{userCount}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>
                    VISIBLE SHARDS
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, opacity: 0.7 }}>
                    {shardStates.length}
                  </div>
                </div>
              </div>

              {/* Single Add/Remove */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '8px' }}>
                  SINGLE USER
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleAddUser(getRandomMood())}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#22c55e',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Add Random
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveUser(Math.floor(Math.random() * moods.length))}
                    disabled={moods.length === 0}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: moods.length === 0 ? '#666' : '#ef4444',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: moods.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    - Remove Random
                  </button>
                </div>
              </div>

              {/* Batch Add/Remove */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '8px' }}>
                  BATCH OPERATIONS
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleAddBatch(5)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#fff',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBatch(10)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#fff',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBatch(25)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#fff',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    +25
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveBatch(5)}
                    disabled={moods.length < 5}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: moods.length < 5 ? '#666' : '#dc2626',
                      color: '#fff',
                      fontWeight: 500,
                      cursor: moods.length < 5 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveBatch(10)}
                    disabled={moods.length < 10}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: moods.length < 10 ? '#666' : '#dc2626',
                      color: '#fff',
                      fontWeight: 500,
                      cursor: moods.length < 10 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    -10
                  </button>
                </div>
              </div>

              {/* Target Count Slider */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '8px' }}>
                  SET TARGET COUNT: {moods.length}
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={moods.length}
                  onChange={(e) => handleSetTargetCount(Number.parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    accentColor: '#3b82f6',
                  }}
                />
              </div>

              {/* Simulation Toggle */}
              <div style={{ marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsSimulating(!isSimulating)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSimulating
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {isSimulating ? '⏸ Stop Simulation' : '▶ Start Random Simulation'}
                </button>
                {isSimulating && (
                  <div
                    style={{
                      fontSize: '11px',
                      opacity: 0.6,
                      marginTop: '6px',
                      textAlign: 'center',
                    }}
                  >
                    Simulating random user joins/leaves every 0.5-2s
                  </div>
                )}
              </div>

              {/* Mood Distribution */}
              <div>
                <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '6px' }}>
                  MOOD DISTRIBUTION
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {MOOD_IDS.map((mood) => {
                    const count = moods.filter((m) => m === mood).length;
                    return (
                      <div
                        key={mood}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.1)',
                          fontSize: '11px',
                        }}
                      >
                        {mood}: {count}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Html>
      </Suspense>
    </ErrorBoundary>
  );
}

export default BreathingLevel;
