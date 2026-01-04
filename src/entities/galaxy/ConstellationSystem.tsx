/**
 * ConstellationSystem - Stylized constellations with connecting lines
 *
 * Features:
 * - Real constellation positions (Orion, Big Dipper, Cassiopeia, etc.)
 * - InstancedMesh for efficient star rendering
 * - LineSegments for connecting lines (single draw call)
 * - Breathing-synchronized brightness
 * - Subtle twinkle animation
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type InstancedMesh,
  LineBasicMaterial,
  type LineSegments,
  Object3D,
  SphereGeometry,
} from 'three';
import { breathPhase } from '../breath/traits';

// Convert right ascension (hours) and declination (degrees) to 3D position on sphere
function raDecToPosition(ra: number, dec: number, radius: number): [number, number, number] {
  const raRad = (ra / 24) * Math.PI * 2;
  const decRad = (dec / 180) * Math.PI;

  const x = radius * Math.cos(decRad) * Math.cos(raRad);
  const y = radius * Math.sin(decRad);
  const z = radius * Math.cos(decRad) * Math.sin(raRad);

  return [x, y, z];
}

// Helper to update star instances - extracted to reduce cognitive complexity
function updateStarInstances(
  mesh: InstancedMesh,
  dummy: Object3D,
  color: Color,
  starPositions: [number, number, number][],
  starSizes: number[],
  totalStars: number,
  time: number,
  enableTwinkle: boolean,
  twinklePhases: Float32Array,
  breathBrightness: number,
) {
  for (let i = 0; i < totalStars; i++) {
    const [x, y, z] = starPositions[i];
    const baseSize = starSizes[i];

    // Twinkle effect
    let twinkleFactor = 1.0;
    if (enableTwinkle) {
      const phase = twinklePhases[i];
      twinkleFactor =
        0.7 +
        0.3 * Math.sin(time * (1.5 + (phase % 1) * 2) + phase) * Math.sin(time * 0.7 + phase * 2);
    }

    // Calculate final size with breathing and twinkle
    const finalSize = baseSize * twinkleFactor * (0.9 + breathBrightness * 0.2);

    dummy.position.set(x, y, z);
    dummy.scale.setScalar(finalSize);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Brightness variation
    const brightness = twinkleFactor * breathBrightness;
    color.setRGB(Math.min(1, brightness), Math.min(1, brightness * 0.95), Math.min(1, brightness));
    mesh.setColorAt(i, color);
  }
}

// Constellation data: stars with RA (hours) and Dec (degrees), and line connections
interface Star {
  name: string;
  ra: number;
  dec: number;
  magnitude: number; // Lower = brighter
}

interface Constellation {
  name: string;
  stars: Star[];
  lines: [number, number][]; // Pairs of star indices to connect
}

// Real constellation data (simplified for visual clarity)
const CONSTELLATIONS: Constellation[] = [
  {
    name: 'Orion',
    stars: [
      { name: 'Betelgeuse', ra: 5.92, dec: 7.41, magnitude: 0.5 },
      { name: 'Rigel', ra: 5.24, dec: -8.2, magnitude: 0.13 },
      { name: 'Bellatrix', ra: 5.42, dec: 6.35, magnitude: 1.64 },
      { name: 'Mintaka', ra: 5.53, dec: -0.3, magnitude: 2.23 },
      { name: 'Alnilam', ra: 5.6, dec: -1.2, magnitude: 1.7 },
      { name: 'Alnitak', ra: 5.68, dec: -1.94, magnitude: 1.77 },
      { name: 'Saiph', ra: 5.8, dec: -9.67, magnitude: 2.09 },
    ],
    lines: [
      [0, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 1],
      [1, 5],
      [0, 4],
    ],
  },
  {
    name: 'Big Dipper',
    stars: [
      { name: 'Dubhe', ra: 11.06, dec: 61.75, magnitude: 1.79 },
      { name: 'Merak', ra: 11.03, dec: 56.38, magnitude: 2.37 },
      { name: 'Phecda', ra: 11.9, dec: 53.69, magnitude: 2.44 },
      { name: 'Megrez', ra: 12.26, dec: 57.03, magnitude: 3.31 },
      { name: 'Alioth', ra: 12.9, dec: 55.96, magnitude: 1.77 },
      { name: 'Mizar', ra: 13.4, dec: 54.93, magnitude: 2.27 },
      { name: 'Alkaid', ra: 13.79, dec: 49.31, magnitude: 1.86 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [3, 0],
    ],
  },
  {
    name: 'Cassiopeia',
    stars: [
      { name: 'Schedar', ra: 0.68, dec: 56.54, magnitude: 2.24 },
      { name: 'Caph', ra: 0.15, dec: 59.15, magnitude: 2.28 },
      { name: 'Gamma Cas', ra: 0.95, dec: 60.72, magnitude: 2.47 },
      { name: 'Ruchbah', ra: 1.43, dec: 60.24, magnitude: 2.68 },
      { name: 'Segin', ra: 1.91, dec: 63.67, magnitude: 3.38 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: 'Scorpius',
    stars: [
      { name: 'Antares', ra: 16.49, dec: -26.43, magnitude: 1.09 },
      { name: 'Graffias', ra: 16.09, dec: -19.81, magnitude: 2.62 },
      { name: 'Dschubba', ra: 16.01, dec: -22.62, magnitude: 2.32 },
      { name: 'Pi Scorpii', ra: 15.98, dec: -26.11, magnitude: 2.89 },
      { name: 'Rho Scorpii', ra: 15.95, dec: -29.21, magnitude: 3.88 },
      { name: 'Shaula', ra: 17.56, dec: -37.1, magnitude: 1.63 },
      { name: 'Lesath', ra: 17.53, dec: -37.29, magnitude: 2.69 },
    ],
    lines: [
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    name: 'Cygnus',
    stars: [
      { name: 'Deneb', ra: 20.69, dec: 45.28, magnitude: 1.25 },
      { name: 'Albireo', ra: 19.51, dec: 27.96, magnitude: 3.18 },
      { name: 'Sadr', ra: 20.37, dec: 40.26, magnitude: 2.23 },
      { name: 'Gienah', ra: 20.77, dec: 33.97, magnitude: 2.48 },
      { name: 'Delta Cygni', ra: 19.75, dec: 45.13, magnitude: 2.87 },
    ],
    lines: [
      [0, 2],
      [2, 1],
      [2, 3],
      [2, 4],
    ],
  },
  {
    name: 'Leo',
    stars: [
      { name: 'Regulus', ra: 10.14, dec: 11.97, magnitude: 1.35 },
      { name: 'Algieba', ra: 10.33, dec: 19.84, magnitude: 2.08 },
      { name: 'Denebola', ra: 11.82, dec: 14.57, magnitude: 2.14 },
      { name: 'Zosma', ra: 11.24, dec: 20.52, magnitude: 2.56 },
      { name: 'Ras Elased', ra: 10.0, dec: 23.77, magnitude: 2.98 },
      { name: 'Adhafera', ra: 10.28, dec: 23.42, magnitude: 3.44 },
    ],
    lines: [
      [0, 1],
      [1, 3],
      [3, 2],
      [1, 4],
      [4, 5],
      [5, 1],
    ],
  },
  {
    name: 'Southern Cross',
    stars: [
      { name: 'Acrux', ra: 12.44, dec: -63.1, magnitude: 0.76 },
      { name: 'Mimosa', ra: 12.79, dec: -59.69, magnitude: 1.25 },
      { name: 'Gacrux', ra: 12.52, dec: -57.11, magnitude: 1.64 },
      { name: 'Delta Crucis', ra: 12.25, dec: -58.75, magnitude: 2.8 },
    ],
    lines: [
      [0, 2],
      [1, 3],
    ],
  },
  {
    name: 'Gemini',
    stars: [
      { name: 'Castor', ra: 7.58, dec: 31.89, magnitude: 1.58 },
      { name: 'Pollux', ra: 7.76, dec: 28.03, magnitude: 1.14 },
      { name: 'Alhena', ra: 6.63, dec: 16.4, magnitude: 1.93 },
      { name: 'Wasat', ra: 7.07, dec: 21.98, magnitude: 3.53 },
      { name: 'Mebsuta', ra: 6.73, dec: 25.13, magnitude: 3.06 },
    ],
    lines: [
      [0, 1],
      [0, 4],
      [4, 3],
      [3, 2],
      [1, 3],
    ],
  },
];

interface ConstellationSystemProps {
  /** Radius of the constellation sphere @default 80 */
  radius?: number;
  /** Star size multiplier @default 1.5 */
  starSize?: number;
  /** Line opacity @default 0.5 */
  lineOpacity?: number;
  /** Line color - Kurzgesagt purple-blue @default '#9b8bff' */
  lineColor?: string;
  /** Star color - Kurzgesagt bright white @default '#ffffff' */
  starColor?: string;
  /** Enable breathing sync @default true */
  breathingSync?: boolean;
  /** Enable twinkle animation @default true */
  enableTwinkle?: boolean;
}

function ConstellationSystemComponent({
  radius = 80,
  starSize = 1.5, // Increased from 1.0 for more prominence
  lineOpacity = 0.5, // Increased from 0.3 for better visibility
  lineColor = '#9b8bff', // Brighter purple (linesBright from palette)
  starColor = '#ffffff', // Pure white for maximum visibility
  breathingSync = true,
  enableTwinkle = true,
}: ConstellationSystemProps) {
  const world = useWorld();
  const starsRef = useRef<InstancedMesh>(null);
  const linesRef = useRef<LineSegments>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const twinklePhases = useRef<Float32Array | null>(null);

  // Process all constellation data into flat arrays
  const { starPositions, starSizes, linePositions, totalStars } = useMemo(() => {
    const allStars: { pos: [number, number, number]; size: number }[] = [];
    const allLines: number[] = [];
    let starIndex = 0;

    for (const constellation of CONSTELLATIONS) {
      const constellationStarIndices: number[] = [];

      // Add stars
      for (const star of constellation.stars) {
        const pos = raDecToPosition(star.ra, star.dec, radius);
        // Size based on magnitude (brighter = larger)
        const size = Math.max(0.3, 2.0 - star.magnitude * 0.4) * starSize;
        allStars.push({ pos, size });
        constellationStarIndices.push(starIndex);
        starIndex++;
      }

      // Add lines
      for (const [i, j] of constellation.lines) {
        const star1 = allStars[constellationStarIndices[i]];
        const star2 = allStars[constellationStarIndices[j]];
        allLines.push(...star1.pos, ...star2.pos);
      }
    }

    return {
      starPositions: allStars.map((s) => s.pos),
      starSizes: allStars.map((s) => s.size),
      linePositions: new Float32Array(allLines),
      totalStars: allStars.length,
    };
  }, [radius, starSize]);

  // Create star geometry (small sphere)
  const starGeometry = useMemo(() => new SphereGeometry(0.15, 8, 6), []);

  // Create line geometry
  const lineGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(linePositions, 3));
    return geometry;
  }, [linePositions]);

  // Create line material
  const lineMaterial = useMemo(() => {
    return new LineBasicMaterial({
      color: new Color(lineColor),
      transparent: true,
      opacity: lineOpacity,
      blending: AdditiveBlending,
      depthWrite: false,
    });
  }, [lineColor, lineOpacity]);

  // Initialize star instances and twinkle phases
  useEffect(() => {
    if (!starsRef.current) return;

    const mesh = starsRef.current;
    const color = new Color(starColor);

    // Initialize random twinkle phases
    twinklePhases.current = new Float32Array(totalStars);
    for (let i = 0; i < totalStars; i++) {
      twinklePhases.current[i] = Math.random() * Math.PI * 2;
    }

    // Set initial positions and scales
    for (let i = 0; i < totalStars; i++) {
      const [x, y, z] = starPositions[i];
      const baseSize = starSizes[i];

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(baseSize);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [starPositions, starSizes, totalStars, starColor, dummy]);

  // Animation loop
  useFrame((state) => {
    if (!starsRef.current || !twinklePhases.current) return;

    const time = state.clock.elapsedTime;

    // Get breath phase for sync
    let currentBreathPhase = 0.5;
    if (breathingSync) {
      try {
        const breathEntity = world.queryFirst(breathPhase);
        if (breathEntity) {
          currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0.5;
        }
      } catch (_e) {
        // ECS errors during unmount
      }
    }

    // Breathing affects overall brightness (subtle glow on inhale)
    const breathBrightness = 0.8 + currentBreathPhase * 0.4;

    const mesh = starsRef.current;
    const color = new Color(starColor);

    // Update star instances
    updateStarInstances(
      mesh,
      dummy,
      color,
      starPositions,
      starSizes,
      totalStars,
      time,
      enableTwinkle,
      twinklePhases.current,
      breathBrightness,
    );

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Update line opacity based on breathing
    if (linesRef.current) {
      const mat = linesRef.current.material as LineBasicMaterial;
      mat.opacity = lineOpacity * (0.6 + currentBreathPhase * 0.4);
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      starGeometry.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, [starGeometry, lineGeometry, lineMaterial]);

  return (
    <group>
      {/* Constellation stars - instanced for performance */}
      <instancedMesh
        ref={starsRef}
        args={[starGeometry, undefined, totalStars]}
        frustumCulled={false}
      >
        <meshBasicMaterial
          color={starColor}
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Constellation lines */}
      <lineSegments ref={linesRef} geometry={lineGeometry} material={lineMaterial} />
    </group>
  );
}

export const ConstellationSystem = memo(ConstellationSystemComponent);
export default ConstellationSystem;
