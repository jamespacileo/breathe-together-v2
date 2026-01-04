/**
 * StageVariants - Multiple stage/backdrop variations for the breathing scene
 *
 * Provides 4 distinct visual environments:
 * 1. Portal - Clean white/cream minimalist stage with floor and soft shadows
 * 2. Cosmos - Deep space with stars, galaxies, and nebula
 * 3. Aurora - Northern lights with flowing color bands
 * 4. Void - Abstract dark zen space with subtle gradients
 *
 * Each variant uses drei components for reliable, good-looking results out of the box.
 *
 * References:
 * - drei Stage: https://drei.docs.pmnd.rs/staging/environment
 * - drei Stars: https://github.com/pmndrs/react-three-fiber/discussions/2972
 * - Aurora effect: codepen.io/favina/pen/bemzVK
 */

import { ContactShadows, GradientTexture, Sparkles, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useViewport } from '../../hooks/useViewport';
import { CloudSystem } from './CloudSystem';

export type StageVariant = 'portal' | 'cosmos' | 'aurora' | 'void';

interface StageVariantsProps {
  variant?: StageVariant;
  /** Show ambient light @default true */
  showAmbientLight?: boolean;
  /** Ambient light intensity @default 0.5 */
  ambientIntensity?: number;
  /** Ambient light color @default '#ffffff' */
  ambientColor?: string;
  /** Show key light @default true */
  showKeyLight?: boolean;
  /** Key light intensity @default 0.8 */
  keyIntensity?: number;
  /** Key light color @default '#ffffff' */
  keyColor?: string;
  /** Show clouds @default false */
  showClouds?: boolean;
  /** Cloud opacity @default 0.4 */
  cloudOpacity?: number;
  /** Cloud speed @default 0.3 */
  cloudSpeed?: number;
}

/**
 * Portal Stage - Clean white/cream minimalist environment
 *
 * Inspired by Portal game's test chambers:
 * - Pure white/cream background
 * - Subtle floor plane with soft shadows
 * - Even, diffuse lighting
 * - Clean, clinical aesthetic
 */
function PortalStage() {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new THREE.Color('#f5f0e8');
    return () => {
      scene.background = null;
    };
  }, [scene]);

  return (
    <group>
      {/* Ambient fill light for even illumination */}
      <ambientLight intensity={0.7} color="#fff8f0" />

      {/* Main key light - soft and diffuse */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.6}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Fill light from opposite side */}
      <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#f0f5ff" />

      {/* Subtle hemisphere for sky/ground bounce */}
      <hemisphereLight args={['#ffffff', '#f0ebe0', 0.4]} />

      {/* Floor plane - soft cream color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#ebe5dc" roughness={0.9} metalness={0} />
      </mesh>

      {/* Contact shadows for soft shadow effect */}
      <ContactShadows
        position={[0, -2.99, 0]}
        opacity={0.35}
        scale={20}
        blur={2.5}
        far={6}
        color="#a0927d"
      />

      {/* Very subtle sparkles for depth */}
      <Sparkles count={30} scale={15} size={1.5} speed={0.2} opacity={0.15} color="#ffffff" />
    </group>
  );
}

/**
 * Cosmos Stage - Deep space environment
 *
 * Features:
 * - Dark space background
 * - Multiple star layers with parallax
 * - Nebula-like color gradients
 * - Galaxy dust particles
 */
function CosmosStage() {
  const { scene } = useThree();
  const { isMobile, isTablet } = useViewport();
  const starsRef = useRef<THREE.Points>(null);
  const starsRef2 = useRef<THREE.Points>(null);

  // Reduce particle counts on mobile
  const starCount = isMobile ? 2000 : isTablet ? 4000 : 6000;
  const sparkleCount = isMobile ? 50 : isTablet ? 100 : 200;

  useEffect(() => {
    scene.background = new THREE.Color('#0a0612');
    return () => {
      scene.background = null;
    };
  }, [scene]);

  // Slow rotation for parallax depth effect
  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0001;
      starsRef.current.rotation.x += 0.00005;
    }
    if (starsRef2.current) {
      starsRef2.current.rotation.y -= 0.00015;
    }
  });

  return (
    <group>
      {/* Subtle ambient for visibility */}
      <ambientLight intensity={0.15} color="#4a3a6a" />

      {/* Key light with cool blue tint */}
      <directionalLight position={[10, 15, 5]} intensity={0.4} color="#8090ff" />

      {/* Accent light from below */}
      <directionalLight position={[-5, -10, 3]} intensity={0.15} color="#ff6090" />

      {/* Primary star field - distant */}
      <Stars
        ref={starsRef}
        radius={120}
        depth={80}
        count={starCount}
        factor={4}
        saturation={0.3}
        fade
        speed={0.3}
      />

      {/* Secondary star field - closer, brighter */}
      <Stars
        ref={starsRef2}
        radius={60}
        depth={40}
        count={Math.floor(starCount / 3)}
        factor={6}
        saturation={0.6}
        fade
        speed={0.2}
      />

      {/* Galaxy dust/nebula particles */}
      <Sparkles
        count={sparkleCount}
        scale={40}
        size={3}
        speed={0.15}
        opacity={0.4}
        color="#9060ff"
      />

      {/* Pink nebula accent particles */}
      <Sparkles
        count={Math.floor(sparkleCount / 2)}
        scale={35}
        size={2.5}
        speed={0.1}
        opacity={0.3}
        color="#ff6090"
      />

      {/* Nebula backdrop - large sphere with gradient */}
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[150, 32, 32]} />
        <meshBasicMaterial side={THREE.BackSide} transparent opacity={0.3}>
          <GradientTexture
            stops={[0, 0.3, 0.6, 1]}
            colors={['#0a0612', '#1a1030', '#2a1540', '#0a0612']}
          />
        </meshBasicMaterial>
      </mesh>

      {/* Hemisphere light for ambient color */}
      <hemisphereLight args={['#4a3a8a', '#0a0612', 0.2]} />
    </group>
  );
}

/**
 * Aurora Stage - Northern lights environment
 *
 * Features:
 * - Dark sky background with subtle stars
 * - Animated aurora bands using shader
 * - Cool blue/green/purple color palette
 * - Gentle pulsing glow
 */
function AuroraStage() {
  const { scene } = useThree();
  const { isMobile } = useViewport();
  const auroraRef = useRef<THREE.ShaderMaterial>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);

  useEffect(() => {
    scene.background = new THREE.Color('#0a1520');
    return () => {
      scene.background = null;
    };
  }, [scene]);

  // Aurora shader material
  const auroraMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
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
        uniform float time;
        varying vec2 vUv;
        varying vec3 vPosition;

        // Simplex noise for organic movement
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        float fbm(vec2 p) {
          float f = 0.0;
          f += 0.5000 * snoise(p); p *= 2.02;
          f += 0.2500 * snoise(p); p *= 2.03;
          f += 0.1250 * snoise(p);
          return f / 0.875;
        }

        void main() {
          vec2 uv = vUv;

          // Vertical bands with noise displacement
          float t = time * 0.15;

          // Create multiple aurora bands
          float band1 = sin(uv.x * 3.0 + fbm(vec2(uv.x * 2.0, t)) * 2.0) * 0.5 + 0.5;
          float band2 = sin(uv.x * 5.0 + fbm(vec2(uv.x * 3.0 + 10.0, t * 1.3)) * 2.5) * 0.5 + 0.5;
          float band3 = sin(uv.x * 2.0 + fbm(vec2(uv.x * 1.5 + 20.0, t * 0.8)) * 1.5) * 0.5 + 0.5;

          // Height-based curtain effect
          float curtain = smoothstep(0.2, 0.8, uv.y);
          float curtainFade = smoothstep(1.0, 0.6, uv.y);

          // Combine bands with height variation
          float aurora = band1 * 0.4 + band2 * 0.35 + band3 * 0.25;
          aurora *= curtain * curtainFade;

          // Add noise for organic texture
          float noise = fbm(uv * 8.0 + t * 0.5);
          aurora *= 0.7 + noise * 0.6;

          // Aurora colors - green, blue, purple gradient
          vec3 green = vec3(0.2, 0.9, 0.4);
          vec3 cyan = vec3(0.2, 0.7, 0.9);
          vec3 purple = vec3(0.5, 0.2, 0.8);

          // Mix colors based on position and time
          float colorMix = sin(uv.x * 4.0 + t * 2.0) * 0.5 + 0.5;
          float colorMix2 = sin(uv.x * 2.0 - t * 1.5 + 2.0) * 0.5 + 0.5;

          vec3 color = mix(green, cyan, colorMix);
          color = mix(color, purple, colorMix2 * 0.5);

          // Pulsing glow
          float pulse = sin(t * 0.8) * 0.1 + 0.9;

          // Final color with glow
          float alpha = aurora * pulse * 0.6;

          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
  }, []);

  // Aurora plane geometry
  const auroraGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(100, 40, 1, 1);
    geometryRef.current = geo;
    return geo;
  }, []);

  // Animate aurora
  useFrame((state) => {
    if (auroraRef.current) {
      auroraRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      auroraMaterial.dispose();
      geometryRef.current?.dispose();
    };
  }, [auroraMaterial]);

  return (
    <group>
      {/* Dark ambient */}
      <ambientLight intensity={0.1} color="#203040" />

      {/* Cool moonlight */}
      <directionalLight position={[5, 15, 10]} intensity={0.25} color="#90a0ff" />

      {/* Aurora glow light */}
      <pointLight position={[0, 20, -30]} intensity={0.5} color="#40ff80" distance={80} />

      {/* Stars in background */}
      <Stars
        radius={100}
        depth={50}
        count={isMobile ? 1500 : 3000}
        factor={3}
        saturation={0}
        fade
        speed={0.2}
      />

      {/* Aurora curtain - positioned above and behind */}
      <mesh position={[0, 25, -50]} geometry={auroraGeometry}>
        <primitive object={auroraMaterial} ref={auroraRef} attach="material" />
      </mesh>

      {/* Second aurora layer for depth */}
      <mesh position={[20, 20, -70]} rotation={[0, -0.3, 0]} geometry={auroraGeometry}>
        <primitive object={auroraMaterial.clone()} attach="material" uniforms-time-value={0.5} />
      </mesh>

      {/* Ground plane - snowy/icy feel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1a2535" roughness={0.95} metalness={0.1} />
      </mesh>

      {/* Subtle snow particles */}
      <Sparkles
        count={isMobile ? 30 : 80}
        scale={30}
        size={1}
        speed={0.3}
        opacity={0.4}
        color="#ffffff"
      />

      {/* Hemisphere for color blend */}
      <hemisphereLight args={['#304050', '#101820', 0.15]} />
    </group>
  );
}

/**
 * Void Stage - Abstract dark zen space
 *
 * Features:
 * - Deep dark gradient background
 * - Minimal geometric accents
 * - Subtle animated fog/mist
 * - Meditative, contemplative atmosphere
 */
function VoidStage() {
  const { scene } = useThree();
  const { isMobile } = useViewport();
  const voidRef = useRef<THREE.ShaderMaterial>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);

  useEffect(() => {
    scene.background = new THREE.Color('#08080a');
    return () => {
      scene.background = null;
    };
  }, [scene]);

  // Void mist shader
  const voidMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        void main() {
          vec2 uv = vUv;
          float t = time * 0.05;

          // Flowing mist layers
          float mist1 = snoise(uv * 3.0 + vec2(t, t * 0.7)) * 0.5 + 0.5;
          float mist2 = snoise(uv * 2.0 + vec2(-t * 0.5, t * 0.3) + 10.0) * 0.5 + 0.5;
          float mist3 = snoise(uv * 4.0 + vec2(t * 0.3, -t * 0.4) + 20.0) * 0.5 + 0.5;

          // Combine with depth-based fading
          float depth = smoothstep(0.0, 0.5, uv.y) * smoothstep(1.0, 0.5, uv.y);
          float mist = (mist1 * 0.5 + mist2 * 0.3 + mist3 * 0.2) * depth;

          // Color gradient - deep purples and blues
          vec3 deepPurple = vec3(0.08, 0.04, 0.12);
          vec3 darkBlue = vec3(0.04, 0.06, 0.1);
          vec3 accent = vec3(0.15, 0.1, 0.2);

          vec3 color = mix(deepPurple, darkBlue, uv.x);
          color = mix(color, accent, mist * 0.5);

          // Subtle pulsing
          float pulse = sin(t * 2.0) * 0.05 + 0.95;

          float alpha = mist * 0.25 * pulse;

          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
  }, []);

  // Void plane geometry
  const voidGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(200, 100, 1, 1);
    geometryRef.current = geo;
    return geo;
  }, []);

  // Animate void mist
  useFrame((state) => {
    if (voidRef.current) {
      voidRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      voidMaterial.dispose();
      geometryRef.current?.dispose();
    };
  }, [voidMaterial]);

  return (
    <group>
      {/* Very subtle ambient */}
      <ambientLight intensity={0.08} color="#1a1020" />

      {/* Soft directional - creates subtle highlights */}
      <directionalLight position={[5, 10, 5]} intensity={0.15} color="#403050" />

      {/* Accent rim light */}
      <directionalLight position={[-10, 5, -10]} intensity={0.1} color="#302040" />

      {/* Central point light for focal glow */}
      <pointLight position={[0, 0, 0]} intensity={0.2} color="#504060" distance={15} />

      {/* Void mist backdrop */}
      <mesh position={[0, 0, -60]} geometry={voidGeometry}>
        <primitive object={voidMaterial} ref={voidRef} attach="material" />
      </mesh>

      {/* Very subtle floating particles - like distant stars or dust */}
      <Sparkles
        count={isMobile ? 20 : 60}
        scale={50}
        size={1.5}
        speed={0.05}
        opacity={0.2}
        color="#605080"
      />

      {/* Even more subtle accent particles */}
      <Sparkles
        count={isMobile ? 10 : 30}
        scale={40}
        size={2}
        speed={0.03}
        opacity={0.15}
        color="#8060a0"
      />

      {/* Hemisphere for subtle ambient color */}
      <hemisphereLight args={['#201830', '#080810', 0.1]} />

      {/* Optional: Add subtle grid or geometric elements */}
      {/* This creates a faint horizon line */}
      <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[30, 200, 64]} />
        <meshBasicMaterial color="#0a0a0f" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/**
 * Main StageVariants Component
 *
 * Renders the selected stage variant with optional lighting overrides.
 */
export function StageVariants({
  variant = 'portal',
  showAmbientLight = true,
  ambientIntensity = 0.5,
  ambientColor = '#ffffff',
  showKeyLight = true,
  keyIntensity = 0.8,
  keyColor = '#ffffff',
  showClouds = false,
  cloudOpacity = 0.4,
  cloudSpeed = 0.3,
}: StageVariantsProps) {
  // Each variant handles its own lighting, but we can add overrides
  const showOverrideLights = showAmbientLight || showKeyLight;

  return (
    <group>
      {/* Render selected stage variant */}
      {variant === 'portal' && <PortalStage />}
      {variant === 'cosmos' && <CosmosStage />}
      {variant === 'aurora' && <AuroraStage />}
      {variant === 'void' && <VoidStage />}

      {/* Optional clouds - can be added to any stage */}
      {showClouds && <CloudSystem opacity={cloudOpacity} speed={cloudSpeed} enabled={true} />}

      {/* Optional override lights - these add on top of variant lighting */}
      {showOverrideLights && (
        <group>
          {showAmbientLight && (
            <ambientLight intensity={ambientIntensity * 0.3} color={ambientColor} />
          )}
          {showKeyLight && (
            <directionalLight
              position={[10, 15, 5]}
              intensity={keyIntensity * 0.3}
              color={keyColor}
            />
          )}
        </group>
      )}
    </group>
  );
}

export default StageVariants;
