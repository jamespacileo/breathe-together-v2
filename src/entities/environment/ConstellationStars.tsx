/**
 * ConstellationStars - Real constellation rendering with astronomical accuracy.
 *
 * Renders actual star positions based on current UTC time, with connecting
 * lines forming constellation patterns. Uses warm, soft aesthetic to match
 * the Monument Valley meditation theme.
 *
 * Features:
 * - Real RA/Dec star coordinates from Yale Bright Star Catalogue
 * - UTC-synchronized celestial rotation (stars move with Earth's rotation)
 * - Constellation lines with elegant fade effects
 * - Magnitude-based star brightness and sizing
 * - Subtle glow and twinkle animations
 */

import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { calculateGMST, celestialToCartesian } from '../../lib/astronomy';
import {
  CONSTELLATION_LINES,
  magnitudeToBrightness,
  magnitudeToSize,
  STARS,
} from '../../lib/constellationData';

interface ConstellationStarsProps {
  /** Enable constellation rendering @default true */
  enabled?: boolean;
  /** Show constellation connecting lines @default true */
  showLines?: boolean;
  /** Distance from center (celestial sphere radius) @default 25 */
  radius?: number;
  /** Star base size multiplier @default 2.0 */
  starSize?: number;
  /** Star color - warm off-white for contrast @default '#fffaf0' */
  starColor?: string;
  /** Constellation line color - warm cream @default '#e8d4b8' */
  lineColor?: string;
  /** Line opacity @default 0.5 */
  lineOpacity?: number;
  /** Line width @default 1.5 */
  lineWidth?: number;
  /** Enable star twinkling @default true */
  twinkle?: boolean;
  /** Twinkle speed multiplier @default 1 */
  twinkleSpeed?: number;
  /** Overall opacity @default 0.9 */
  opacity?: number;
  /** Show debug gizmo @default false */
  showGizmo?: boolean;
}

/**
 * Individual star point with glow effect
 */
interface StarPoint {
  id: string;
  position: THREE.Vector3;
  brightness: number;
  size: number;
  baseOpacity: number;
}

/**
 * Constellation line segment
 */
interface LineSeg {
  start: THREE.Vector3;
  end: THREE.Vector3;
  constellation: string;
}

export const ConstellationStars = memo(function ConstellationStars({
  enabled = true,
  showLines = true,
  radius = 25,
  starSize = 2.0,
  starColor = '#fffaf0',
  lineColor = '#e8d4b8',
  lineOpacity = 0.5,
  lineWidth = 1.5,
  twinkle = true,
  twinkleSpeed = 1,
  opacity = 0.9,
  showGizmo = false,
}: ConstellationStarsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Points>(null);
  const gmstRef = useRef(calculateGMST(new Date()));

  // Calculate star positions and metadata
  const { lineSegments, positions, sizes, colors } = useMemo(() => {
    const gmst = calculateGMST(new Date());
    gmstRef.current = gmst;

    const starPointsArr: StarPoint[] = [];
    const lineSegsArr: LineSeg[] = [];
    const starMap = new Map<string, THREE.Vector3>();

    // Process all stars
    for (const star of STARS) {
      const [x, y, z] = celestialToCartesian(star.ra, star.dec, radius, gmst);
      const pos = new THREE.Vector3(x, y, z);
      starMap.set(star.id, pos);

      const brightness = magnitudeToBrightness(star.magnitude);
      const size = magnitudeToSize(star.magnitude, starSize);

      starPointsArr.push({
        id: star.id,
        position: pos,
        brightness,
        size,
        baseOpacity: brightness * opacity,
      });
    }

    // Process constellation lines
    for (const line of CONSTELLATION_LINES) {
      const startPos = starMap.get(line.from);
      const endPos = starMap.get(line.to);

      if (startPos && endPos) {
        lineSegsArr.push({
          start: startPos,
          end: endPos,
          constellation: line.constellation,
        });
      }
    }

    // Create typed arrays for Points geometry
    const posArr = new Float32Array(starPointsArr.length * 3);
    const sizeArr = new Float32Array(starPointsArr.length);
    const colorArr = new Float32Array(starPointsArr.length * 3);

    const baseColor = new THREE.Color(starColor);

    for (let i = 0; i < starPointsArr.length; i++) {
      const sp = starPointsArr[i];
      const i3 = i * 3;

      posArr[i3] = sp.position.x;
      posArr[i3 + 1] = sp.position.y;
      posArr[i3 + 2] = sp.position.z;

      sizeArr[i] = sp.size;

      // Slightly warm tint for brighter stars
      const warmth = sp.brightness * 0.15;
      colorArr[i3] = Math.min(1, baseColor.r + warmth);
      colorArr[i3 + 1] = baseColor.g;
      colorArr[i3 + 2] = Math.max(0, baseColor.b - warmth * 0.5);
    }

    return {
      starPoints: starPointsArr,
      lineSegments: lineSegsArr,
      positions: posArr,
      sizes: sizeArr,
      colors: colorArr,
    };
  }, [radius, starSize, starColor, opacity]);

  // Create geometry with attributes
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, sizes, colors]);

  // Custom shader material for stars with glow
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: opacity },
        twinkleEnabled: { value: twinkle ? 1.0 : 0.0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;

        void main() {
          vColor = color;
          vSize = size;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Scale point size for closer viewing distance
          gl_PointSize = size * (150.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 3.0); // Minimum 3px for visibility
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform float twinkleEnabled;
        varying vec3 vColor;
        varying float vSize;

        void main() {
          // Soft circular falloff for star glow
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          // Sharp core with soft glow
          float core = smoothstep(0.5, 0.1, dist);
          float glow = smoothstep(0.5, 0.0, dist) * 0.5;
          float alpha = (core + glow) * opacity;

          // Subtle twinkle based on position hash
          if (twinkleEnabled > 0.5) {
            float twinkle = sin(time * 2.0 + vSize * 100.0) * 0.15 + 0.85;
            alpha *= twinkle;
          }

          // Warm glow color
          vec3 finalColor = vColor + vec3(0.1, 0.05, 0.0) * glow;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [opacity, twinkle]);

  // Animate stars (rotation and twinkle)
  useFrame((state) => {
    if (!enabled) return;

    // Update time uniform for twinkle
    if (material.uniforms.time) {
      material.uniforms.time.value = state.clock.elapsedTime * twinkleSpeed;
    }

    // Update celestial rotation based on real time
    // This makes the stars slowly rotate as Earth rotates
    if (groupRef.current) {
      const now = new Date();
      const newGmst = calculateGMST(now);
      const deltaGmst = newGmst - gmstRef.current;

      // Apply rotation around Y axis (celestial pole)
      // The celestial sphere appears to rotate as Earth rotates
      groupRef.current.rotation.y = -deltaGmst;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      {/* Star points - frustumCulled={false} ensures visibility at all angles */}
      <points ref={starsRef} geometry={geometry} material={material} frustumCulled={false} />

      {/* Constellation lines */}
      {showLines &&
        lineSegments.map((seg, idx) => (
          <Line
            key={`${seg.constellation}-${idx}`}
            points={[seg.start, seg.end]}
            color={lineColor}
            lineWidth={lineWidth}
            transparent
            opacity={lineOpacity}
            // Soft dashed pattern for ethereal feel
            dashed
            dashSize={2}
            gapSize={1}
          />
        ))}

      {/* Debug gizmos - celestial sphere wireframe and axes */}
      {showGizmo && (
        <>
          {/* Wireframe sphere showing celestial sphere bounds */}
          <mesh>
            <sphereGeometry args={[radius, 24, 24]} />
            <meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.3} />
          </mesh>

          {/* Equatorial plane ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius - 0.1, radius + 0.1, 64]} />
            <meshBasicMaterial color="#00ff88" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>

          {/* Celestial poles axis (Y-axis = north celestial pole) */}
          <axesHelper args={[radius * 1.2]} />

          {/* North celestial pole marker */}
          <mesh position={[0, radius, 0]}>
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial color="#00ffff" />
          </mesh>

          {/* South celestial pole marker */}
          <mesh position={[0, -radius, 0]}>
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial color="#ff00ff" />
          </mesh>
        </>
      )}
    </group>
  );
});
