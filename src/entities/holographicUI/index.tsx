/**
 * HolographicBreathUI - Minimal holographic UI around the globe
 *
 * Features:
 * - Circular progress arc showing current cycle progress
 * - Phase segment indicators (Inhale, Hold, Exhale)
 * - Time remaining display
 * - Holographic aesthetic with subtle glow
 *
 * Syncs with UTC-based breathing cycle for global sync.
 */

import { Ring, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';
import { calculatePhaseInfo } from '../../lib/breathPhase';
import { breathPhase as breathPhaseTrait } from '../breath/traits';

/**
 * Phase configuration for the ring segments
 */
const PHASES = [
  { name: 'Inhale', duration: BREATH_PHASES.INHALE, color: '#7ec8d4' }, // Teal
  { name: 'Hold', duration: BREATH_PHASES.HOLD_IN, color: '#d4a574' }, // Gold
  { name: 'Exhale', duration: BREATH_PHASES.EXHALE, color: '#c49a8c' }, // Rose
];

/**
 * Calculate the start and end angles for each phase segment
 */
function calculatePhaseAngles() {
  const angles: { startRatio: number; endRatio: number; midAngle: number }[] = [];
  let accumulated = 0;

  for (const phase of PHASES) {
    const startRatio = accumulated / BREATH_TOTAL_CYCLE;
    accumulated += phase.duration;
    const endRatio = accumulated / BREATH_TOTAL_CYCLE;
    // Mid angle for label positioning (in radians, starting from top)
    const midAngle = ((startRatio + endRatio) / 2) * Math.PI * 2 - Math.PI / 2;
    angles.push({ startRatio, endRatio, midAngle });
  }

  return angles;
}

const PHASE_ANGLES = calculatePhaseAngles();

/**
 * Progress arc that fills as the cycle progresses
 */
function ProgressArc({
  innerRadius,
  outerRadius,
  progress,
  phaseIndex,
  breathPhase,
}: {
  innerRadius: number;
  outerRadius: number;
  progress: number; // 0-1 through entire cycle
  phaseIndex: number;
  breathPhase: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create a ring geometry
  const geometry = useMemo(() => {
    return new THREE.RingGeometry(innerRadius, outerRadius, 128, 1, 0, Math.PI * 2);
  }, [innerRadius, outerRadius]);

  // Simple shader that shows progress as a filled arc
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        progress: { value: 0 },
        phaseIndex: { value: 0 },
        breathPhase: { value: 0 },
        color0: { value: new THREE.Color(PHASES[0]?.color ?? '#7ec8d4') },
        color1: { value: new THREE.Color(PHASES[1]?.color ?? '#d4a574') },
        color2: { value: new THREE.Color(PHASES[2]?.color ?? '#c49a8c') },
        phase0End: { value: PHASE_ANGLES[0]?.endRatio ?? 0.21 },
        phase1End: { value: PHASE_ANGLES[1]?.endRatio ?? 0.58 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float progress;
        uniform float phaseIndex;
        uniform float breathPhase;
        uniform vec3 color0;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float phase0End;
        uniform float phase1End;

        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Calculate angle from position (atan2 gives angle from center)
          float angle = atan(vPosition.y, vPosition.x);
          // Normalize to 0-1, starting from top (where angle = PI/2)
          float normalizedAngle = mod((angle - 1.5707963) / 6.28318530718 + 1.0, 1.0);

          // Determine which phase this fragment is in
          vec3 phaseColor;
          if (normalizedAngle < phase0End) {
            phaseColor = color0;
          } else if (normalizedAngle < phase1End) {
            phaseColor = color1;
          } else {
            phaseColor = color2;
          }

          // Is this fragment in the filled (progress) region?
          float filled = step(normalizedAngle, progress);

          // Calculate opacity based on filled state and breathing
          float baseOpacity = mix(0.08, 0.6, filled);
          float breathPulse = breathPhase * 0.15;
          float opacity = baseOpacity + breathPulse * filled;

          // Add subtle glow at edges
          float edgeGlow = smoothstep(0.0, 0.1, abs(normalizedAngle - progress)) * 0.3;
          opacity += (1.0 - edgeGlow) * filled * 0.2;

          // Mix filled color with dim gray for unfilled
          vec3 finalColor = mix(vec3(0.3, 0.32, 0.35), phaseColor, filled);

          gl_FragColor = vec4(finalColor, opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  // Update uniforms each frame
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.progress.value = progress;
      materialRef.current.uniforms.phaseIndex.value = phaseIndex;
      materialRef.current.uniforms.breathPhase.value = breathPhase;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

/**
 * Phase divider lines to separate the ring segments
 */
function PhaseDividers({ radius }: { radius: number }) {
  const dividers = useMemo(() => {
    return PHASE_ANGLES.map((angle, i) => {
      // Draw divider at the END of each phase (start of next)
      const endAngle = angle.endRatio * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(endAngle) * radius;
      const z = Math.sin(endAngle) * radius;
      const rotation = -endAngle + Math.PI / 2;
      return { x, z, rotation, key: i };
    });
  }, [radius]);

  return (
    <group>
      {dividers.map((d) => (
        <mesh key={d.key} position={[d.x, 0.02, d.z]} rotation={[Math.PI / 2, 0, d.rotation]}>
          <planeGeometry args={[0.35, 0.04]} />
          <meshBasicMaterial
            color="#a0a8b0"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Phase labels positioned around the ring
 */
function PhaseLabels({ radius, activePhase }: { radius: number; activePhase: number }) {
  return (
    <group>
      {PHASES.map((phase, i) => {
        const angle = PHASE_ANGLES[i]?.midAngle ?? 0;
        const labelRadius = radius + 0.5;
        const x = Math.cos(angle) * labelRadius;
        const z = Math.sin(angle) * labelRadius;
        const isActive = i === activePhase;

        return (
          <Text
            key={phase.name}
            position={[x, 0.05, z]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={isActive ? 0.22 : 0.16}
            color={isActive ? phase.color : '#707880'}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.12}
            outlineWidth={isActive ? 0.008 : 0}
            outlineColor={phase.color}
          >
            {phase.name.toUpperCase()}
          </Text>
        );
      })}
    </group>
  );
}

/**
 * Time remaining display
 */
function TimeDisplay({
  timeRemaining,
  phaseColor,
  radius,
}: {
  timeRemaining: number;
  phaseColor: string;
  radius: number;
}) {
  const displayTime = Math.ceil(timeRemaining);

  return (
    <group position={[0, 0.05, radius * 0.4]}>
      {/* Time number */}
      <Text
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color={phaseColor}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.02}
      >
        {displayTime}
      </Text>
      {/* "seconds" label */}
      <Text
        position={[0.35, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.15}
        color="#808890"
        anchorX="left"
        anchorY="middle"
        letterSpacing={0.05}
      >
        s
      </Text>
    </group>
  );
}

/**
 * Outer decorative ring with subtle glow
 */
function OuterGlowRing({ radius, breathPhase }: { radius: number; breathPhase: number }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ringRef.current) {
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.06 + breathPhase * 0.08;
    }
  });

  return (
    <Ring ref={ringRef} args={[radius * 1.02, radius * 1.06, 128]} rotation={[Math.PI / 2, 0, 0]}>
      <meshBasicMaterial
        color="#7ec8d4"
        transparent
        opacity={0.08}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </Ring>
  );
}

/**
 * Inner subtle ring
 */
function InnerRing({ radius }: { radius: number }) {
  return (
    <Ring args={[radius * 0.96, radius * 0.98, 128]} rotation={[Math.PI / 2, 0, 0]}>
      <meshBasicMaterial
        color="#505860"
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </Ring>
  );
}

/**
 * HolographicBreathUI Props
 */
interface HolographicBreathUIProps {
  /** Inner radius of the progress ring @default 2.2 */
  innerRadius?: number;
  /** Outer radius of the progress ring @default 2.5 */
  outerRadius?: number;
  /** Y position offset @default 0 */
  yOffset?: number;
  /** Show phase labels @default true */
  showLabels?: boolean;
  /** Show time display @default true */
  showTime?: boolean;
  /** Show divider lines @default true */
  showDividers?: boolean;
}

/**
 * HolographicBreathUI - Main component
 */
export function HolographicBreathUI({
  innerRadius = 2.2,
  outerRadius = 2.5,
  yOffset = 0,
  showLabels = true,
  showTime = true,
  showDividers = true,
}: Partial<HolographicBreathUIProps> = {}) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);

  // State for display updates (throttled at ~10fps for React components)
  const [displayState, setDisplayState] = useState({
    phaseIndex: 0,
    phaseProgress: 0,
    cycleProgress: 0,
    timeRemaining: 4,
    breathPhase: 0,
  });

  // Refs for smooth animation (updated every frame)
  const animRef = useRef({
    cycleProgress: 0,
    breathPhase: 0,
  });

  // Update animation values every frame, display state at 10fps
  const lastUpdateRef = useRef(0);

  useFrame(() => {
    try {
      // Get breath phase from ECS
      const breathEntity = world?.queryFirst?.(breathPhaseTrait);
      const breathPhaseValue = breathEntity?.get?.(breathPhaseTrait)?.value ?? 0;

      // Calculate current phase info from UTC time
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const cycleProgress = cycleTime / BREATH_TOTAL_CYCLE;
      const { phaseIndex, phaseProgress, phaseDuration } = calculatePhaseInfo(cycleTime);
      const timeRemaining = (1 - phaseProgress) * phaseDuration;

      // Update animation refs (every frame for smooth progress arc)
      animRef.current.cycleProgress = cycleProgress;
      animRef.current.breathPhase = breathPhaseValue;

      // Throttle React state updates to ~10fps
      if (now - lastUpdateRef.current > 0.1) {
        lastUpdateRef.current = now;
        setDisplayState({
          phaseIndex,
          phaseProgress,
          cycleProgress,
          timeRemaining,
          breathPhase: breathPhaseValue,
        });
      }
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  const { phaseIndex, timeRemaining, breathPhase } = displayState;
  const currentPhase = PHASES[phaseIndex] ?? PHASES[0];

  return (
    <group ref={groupRef} position={[0, yOffset, 0]} name="Holographic Breath UI">
      {/* Main progress arc */}
      <ProgressArc
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        progress={animRef.current.cycleProgress}
        phaseIndex={phaseIndex}
        breathPhase={animRef.current.breathPhase}
      />

      {/* Outer decorative glow ring */}
      <OuterGlowRing radius={outerRadius} breathPhase={breathPhase} />

      {/* Inner subtle ring */}
      <InnerRing radius={innerRadius} />

      {/* Phase divider lines */}
      {showDividers && <PhaseDividers radius={(innerRadius + outerRadius) / 2} />}

      {/* Phase labels */}
      {showLabels && <PhaseLabels radius={outerRadius} activePhase={phaseIndex} />}

      {/* Time remaining display */}
      {showTime && currentPhase && (
        <TimeDisplay
          timeRemaining={timeRemaining}
          phaseColor={currentPhase.color}
          radius={outerRadius}
        />
      )}
    </group>
  );
}

export default HolographicBreathUI;
