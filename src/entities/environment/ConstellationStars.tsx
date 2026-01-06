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
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { RENDER_LAYERS } from '../../constants';
import { calculateGMST, celestialToCartesian } from '../../lib/astronomy';
import {
  CONSTELLATION_LINES,
  magnitudeToBrightness,
  magnitudeToSize,
  STARS,
} from '../../lib/constellationData';
import { isUiEventTarget } from '../../lib/sceneInput';

interface ConstellationStarsProps {
  /** Enable constellation rendering @default true */
  enabled?: boolean;
  /** Show constellation connecting lines @default true */
  showLines?: boolean;
  /** Distance from center (celestial sphere radius) @default 25 */
  radius?: number;
  /** Star base size multiplier @default 2.0 */
  starSize?: number;
  /** Star color - warm gold for contrast @default '#ffd27a' */
  starColor?: string;
  /** Constellation line color - warm gold @default '#f1c46b' */
  lineColor?: string;
  /** Line opacity @default 0.75 */
  lineOpacity?: number;
  /** Line width @default 1.5 */
  lineWidth?: number;
  /** Enable star twinkling @default true */
  twinkle?: boolean;
  /** Twinkle speed multiplier @default 1 */
  twinkleSpeed?: number;
  /** Overall opacity @default 0.9 */
  opacity?: number;
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
  starColor = '#ffefc2',
  lineColor = '#f9e2a4',
  lineOpacity = 0.95,
  lineWidth = 2.4,
  twinkle = true,
  twinkleSpeed = 1,
  opacity = 1.0,
}: ConstellationStarsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Points>(null);
  const gmstRef = useRef(calculateGMST(new Date()));
  const mouseRef = useRef(new THREE.Vector2(999, 999));
  const { gl, events } = useThree();
  const eventSource = (events.connected || gl.domElement) as HTMLElement;

  // Set layers on mount to exclude from DoF
  useEffect(() => {
    if (starsRef.current) {
      starsRef.current.layers.set(RENDER_LAYERS.EFFECTS);
    }
  }, []);

  useEffect(() => {
    if (!eventSource) return;

    const updateMouse = (event: PointerEvent) => {
      if (isUiEventTarget(event.target)) {
        mouseRef.current.set(999, 999);
        return;
      }

      const rect = eventSource.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current.set(x, y);
    };

    const clearMouse = () => {
      mouseRef.current.set(999, 999);
    };

    eventSource.addEventListener('pointermove', updateMouse);
    eventSource.addEventListener('pointerdown', updateMouse);
    eventSource.addEventListener('pointerleave', clearMouse);

    return () => {
      eventSource.removeEventListener('pointermove', updateMouse);
      eventSource.removeEventListener('pointerdown', updateMouse);
      eventSource.removeEventListener('pointerleave', clearMouse);
    };
  }, [eventSource]);

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
      const warmth = sp.brightness * 0.25;
      colorArr[i3] = Math.min(1, baseColor.r + warmth * 0.2);
      colorArr[i3 + 1] = Math.min(1, baseColor.g + warmth * 0.12);
      colorArr[i3 + 2] = Math.min(1, baseColor.b + warmth * 0.05);
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
        mouse: { value: new THREE.Vector2(999, 999) },
        hoverStrength: { value: 1.8 },
        hoverRadius: { value: 0.7 },
        edgeGlowStrength: { value: 0.9 },
        edgeStart: { value: 0.5 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        varying vec2 vScreenPos;

        void main() {
          vColor = color;
          vSize = size;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vec4 clipPosition = projectionMatrix * mvPosition;
          // Scale point size for closer viewing distance
          gl_PointSize = size * (220.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 3.5); // Minimum size for visibility
          vScreenPos = clipPosition.xy / clipPosition.w;
          gl_Position = clipPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform float twinkleEnabled;
        uniform vec2 mouse;
        uniform float hoverStrength;
        uniform float hoverRadius;
        uniform float edgeGlowStrength;
        uniform float edgeStart;
        varying vec3 vColor;
        varying float vSize;
        varying vec2 vScreenPos;

        void main() {
          // Soft circular falloff for star glow
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          // Sharp core with soft glow
          float core = smoothstep(0.5, 0.06, dist);
          float glow = smoothstep(0.7, 0.0, dist);
          float alpha = (core * 1.6 + glow * 1.2) * opacity;

          // Subtle twinkle based on position hash
          if (twinkleEnabled > 0.5) {
            float twinkle = sin(time * 2.0 + vSize * 100.0) * 0.15 + 0.85;
            alpha *= twinkle;
          }

          float edge = max(abs(vScreenPos.x), abs(vScreenPos.y));
          float edgeGlow = smoothstep(edgeStart, 1.0, edge);

          float hoverDist = distance(vScreenPos, mouse);
          float hoverGlow = smoothstep(hoverRadius, 0.0, hoverDist);

          float glowBoost = edgeGlow * edgeGlowStrength + hoverGlow * hoverStrength;
          alpha *= 1.0 + glowBoost;

          // Warm glow color
          vec3 warmGlow = vec3(1.0, 0.92, 0.6);
          vec3 finalColor = vColor * (1.15 + glowBoost * 0.4) + warmGlow * (glow * 1.1 + glowBoost * 1.6);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
  }, [opacity, twinkle]);

  // Animate stars (rotation and twinkle)
  useFrame((state) => {
    if (!enabled) return;

    // Update time uniform for twinkle
    if (material.uniforms.time) {
      material.uniforms.time.value = state.clock.elapsedTime * twinkleSpeed;
    }
    if (material.uniforms.mouse) {
      material.uniforms.mouse.value.copy(mouseRef.current);
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
    /* Rotating celestial sphere with stars */
    <group ref={groupRef}>
      {/* Star points - frustumCulled={false} ensures visibility at all angles */}
      <points ref={starsRef} geometry={geometry} material={material} frustumCulled={false} />

      {/* Constellation lines */}
      {showLines &&
        lineSegments.map((seg, idx) => (
          <group key={`${seg.constellation}-${idx}`}>
            <Line
              points={[seg.start, seg.end]}
              color={lineColor}
              lineWidth={lineWidth * 1.8}
              transparent
              opacity={lineOpacity * 0.35}
            />
            <Line
              points={[seg.start, seg.end]}
              color={lineColor}
              lineWidth={lineWidth}
              transparent
              opacity={lineOpacity}
            />
          </group>
        ))}
    </group>
  );
});
