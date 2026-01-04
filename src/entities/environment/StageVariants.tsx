/**
 * StageVariants - Simple stage presets using drei components
 *
 * Design principle: Use ONLY drei components that work out of the box.
 * No custom shaders, no scene.background manipulation - just drei.
 *
 * Uses BackdropSphere pattern instead of scene.background for reliable
 * background rendering with the RefractionPipeline.
 *
 * References:
 * - https://drei.docs.pmnd.rs/staging/environment
 * - https://codesandbox.io/s/stage-presets-57iefg
 */

import {
  ContactShadows,
  Environment,
  GradientTexture,
  GradientType,
  Sparkles,
  Stars,
} from '@react-three/drei';
import * as THREE from 'three';
import { useViewport } from '../../hooks/useViewport';
import { CloudSystem } from './CloudSystem';

export type StageVariant = 'portal' | 'cosmos' | 'aurora' | 'void';

interface StageVariantsProps {
  variant?: StageVariant;
  /** Show clouds @default false */
  showClouds?: boolean;
  /** Cloud opacity @default 0.4 */
  cloudOpacity?: number;
  /** Cloud speed @default 0.3 */
  cloudSpeed?: number;
}

/**
 * BackdropSphere - Large inverted sphere for background color
 *
 * More reliable than scene.background for multi-pass rendering pipelines.
 * Uses BackSide rendering so we see the inside of the sphere.
 */
function BackdropSphere({ color, gradientColors }: { color?: string; gradientColors?: string[] }) {
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[200, 32, 32]} />
      {gradientColors ? (
        <meshBasicMaterial side={THREE.BackSide}>
          <GradientTexture
            attach="map"
            stops={[0, 0.5, 1]}
            colors={gradientColors}
            type={GradientType.Linear}
          />
        </meshBasicMaterial>
      ) : (
        <meshBasicMaterial color={color} side={THREE.BackSide} />
      )}
    </mesh>
  );
}

/**
 * Portal Stage - Clean white minimalist (Portal game inspired)
 *
 * Uses drei Environment with studio preset for clean, even lighting.
 */
function PortalStage() {
  return (
    <group>
      {/* Backdrop sphere for background */}
      <BackdropSphere color="#f8f6f3" />

      {/* drei Environment for PBR lighting */}
      <Environment preset="studio" environmentIntensity={0.5} />

      {/* Simple three-point lighting */}
      <ambientLight intensity={0.6} color="#ffffff" />
      <directionalLight position={[5, 10, 5]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#f0f5ff" />

      {/* Floor with contact shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#f0ece6" />
      </mesh>

      <ContactShadows position={[0, -2.99, 0]} opacity={0.4} scale={20} blur={2} far={4} />
    </group>
  );
}

/**
 * Cosmos Stage - Deep space with stars
 *
 * Uses drei Stars and Environment for space feel.
 */
function CosmosStage() {
  const { isMobile } = useViewport();

  return (
    <group>
      {/* Backdrop sphere for deep space */}
      <BackdropSphere color="#050510" />

      {/* drei Environment for subtle reflections */}
      <Environment preset="night" environmentIntensity={0.3} />

      {/* Subtle lighting */}
      <ambientLight intensity={0.15} color="#4444aa" />
      <directionalLight position={[5, 10, 5]} intensity={0.3} color="#6666ff" />
      <pointLight position={[-10, 5, -10]} intensity={0.2} color="#ff66aa" distance={30} />

      {/* drei Stars - just works */}
      <Stars
        radius={100}
        depth={50}
        count={isMobile ? 2000 : 5000}
        factor={4}
        saturation={0.5}
        fade
        speed={0.5}
      />

      {/* Sparkles for nebula dust effect */}
      <Sparkles count={isMobile ? 50 : 150} scale={40} size={3} speed={0.2} color="#8866ff" />
      <Sparkles count={isMobile ? 30 : 80} scale={35} size={2} speed={0.15} color="#ff66aa" />
    </group>
  );
}

/**
 * Aurora Stage - Night sky with aurora feel
 *
 * Uses gradient backdrop and colored lights for aurora effect.
 */
function AuroraStage() {
  const { isMobile } = useViewport();

  return (
    <group>
      {/* Gradient backdrop for aurora sky */}
      <BackdropSphere gradientColors={['#0a1520', '#102030', '#0a1520']} />

      {/* drei Environment for cold lighting */}
      <Environment preset="night" environmentIntensity={0.2} />

      {/* Cool moonlight feel */}
      <ambientLight intensity={0.1} color="#334455" />
      <directionalLight position={[5, 15, 10]} intensity={0.3} color="#aaccff" />

      {/* Aurora glow lights */}
      <pointLight position={[-5, 20, -20]} intensity={0.8} color="#44ff88" distance={50} />
      <pointLight position={[10, 25, -30]} intensity={0.5} color="#8844ff" distance={50} />
      <pointLight position={[-15, 18, -25]} intensity={0.4} color="#44aaff" distance={50} />

      {/* Stars in background */}
      <Stars
        radius={100}
        depth={50}
        count={isMobile ? 1000 : 3000}
        factor={3}
        saturation={0}
        fade
        speed={0.3}
      />

      {/* Subtle ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a2530" />
      </mesh>

      {/* Snow/ice particles */}
      <Sparkles count={isMobile ? 30 : 100} scale={30} size={1.5} speed={0.5} color="#ffffff" />
    </group>
  );
}

/**
 * Void Stage - Dark meditative space
 *
 * Minimal, dark, zen atmosphere.
 */
function VoidStage() {
  const { isMobile } = useViewport();

  return (
    <group>
      {/* Deep void backdrop */}
      <BackdropSphere color="#0a0a0f" />

      {/* Minimal environment */}
      <Environment preset="night" environmentIntensity={0.1} />

      {/* Very subtle lighting */}
      <ambientLight intensity={0.05} color="#222233" />
      <directionalLight position={[0, 10, 5]} intensity={0.15} color="#444466" />

      {/* Central glow */}
      <pointLight position={[0, 0, 0]} intensity={0.3} color="#443366" distance={15} />

      {/* Subtle floating particles */}
      <Sparkles count={isMobile ? 20 : 60} scale={40} size={2} speed={0.1} color="#665588" />
    </group>
  );
}

/**
 * Main StageVariants Component
 */
export function StageVariants({
  variant = 'portal',
  showClouds = false,
  cloudOpacity = 0.4,
  cloudSpeed = 0.3,
}: StageVariantsProps) {
  return (
    <group>
      {variant === 'portal' && <PortalStage />}
      {variant === 'cosmos' && <CosmosStage />}
      {variant === 'aurora' && <AuroraStage />}
      {variant === 'void' && <VoidStage />}

      {/* Optional clouds overlay */}
      {showClouds && <CloudSystem opacity={cloudOpacity} speed={cloudSpeed} enabled={true} />}
    </group>
  );
}

export default StageVariants;
