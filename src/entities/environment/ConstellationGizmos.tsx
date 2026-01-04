/**
 * ConstellationGizmos - Debug visualization for constellation stars.
 *
 * Shows individual star positions, constellation wireframe lines,
 * and constellation name labels. Uses Koota for fast state updates.
 *
 * Features:
 * - Individual star markers with name labels
 * - Constellation wireframe lines connecting stars
 * - Constellation name labels at centroids
 * - Celestial sphere reference (equatorial plane, poles)
 * - Real-time position updates via useFrame
 */

import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { calculateGMST, celestialToCartesian } from '../../lib/astronomy';
import {
  CONSTELLATION_LINES,
  CONSTELLATIONS,
  magnitudeToBrightness,
  STARS,
  type Star,
} from '../../lib/constellationData';
import {
  CelestialFrameData,
  ConstellationGizmoData,
  StarGizmoData,
} from './constellationGizmoTraits';

interface ConstellationGizmosProps {
  /** Celestial sphere radius @default 25 */
  radius?: number;
  /** Show individual star markers @default true */
  showStars?: boolean;
  /** Show star name labels @default true */
  showStarLabels?: boolean;
  /** Show constellation lines @default true */
  showLines?: boolean;
  /** Show constellation name labels @default true */
  showConstellationLabels?: boolean;
  /** Show celestial reference frame @default true */
  showCelestialFrame?: boolean;
  /** Line color @default '#00ff88' */
  lineColor?: string;
  /** Star marker color @default '#ffff00' */
  starColor?: string;
}

/**
 * Calculate constellation centroid from star positions
 */
function calculateCentroid(
  starIds: string[],
  starMap: Map<string, Star>,
  radius: number,
  gmst: number,
): { centroid: THREE.Vector3; boundingRadius: number } {
  const positions: THREE.Vector3[] = [];

  for (const starId of starIds) {
    const star = starMap.get(starId);
    if (star) {
      const [x, y, z] = celestialToCartesian(star.ra, star.dec, radius, gmst);
      positions.push(new THREE.Vector3(x, y, z));
    }
  }

  if (positions.length === 0) {
    return { centroid: new THREE.Vector3(), boundingRadius: 0 };
  }

  // Calculate centroid
  const centroid = new THREE.Vector3();
  for (const pos of positions) {
    centroid.add(pos);
  }
  centroid.divideScalar(positions.length);

  // Calculate bounding radius
  let maxDist = 0;
  for (const pos of positions) {
    const dist = pos.distanceTo(centroid);
    if (dist > maxDist) maxDist = dist;
  }

  return { centroid, boundingRadius: maxDist };
}

/**
 * Star marker component with optional label
 */
const StarMarker = memo(function StarMarker({
  position,
  name,
  magnitude,
  showLabel,
  color,
}: {
  position: THREE.Vector3;
  name: string;
  magnitude: number;
  showLabel: boolean;
  color: string;
}) {
  const brightness = magnitudeToBrightness(magnitude);
  const size = 0.3 + brightness * 0.4;

  return (
    <group position={position}>
      {/* Star marker sphere */}
      <mesh>
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} />
      </mesh>

      {/* Star name label */}
      {showLabel && (
        <Html
          position={[0, size + 0.5, 0]}
          center
          style={{
            color: '#ffff00',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            textShadow: '0 0 3px #000, 0 0 6px #000',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {name}
          <span style={{ fontSize: '8px', color: '#aaa', marginLeft: '4px' }}>
            ({magnitude.toFixed(1)})
          </span>
        </Html>
      )}
    </group>
  );
});

/**
 * Constellation label at centroid
 */
const ConstellationLabel = memo(function ConstellationLabel({
  position,
  name,
  latinName,
}: {
  position: THREE.Vector3;
  name: string;
  latinName: string;
}) {
  return (
    <Html
      position={position}
      center
      style={{
        color: '#00ff88',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        textShadow: '0 0 4px #000, 0 0 8px #000',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
        padding: '4px 8px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '4px',
        border: '1px solid rgba(0, 255, 136, 0.5)',
      }}
    >
      <div>{name}</div>
      <div style={{ fontSize: '10px', color: '#88ffaa', fontStyle: 'italic' }}>{latinName}</div>
    </Html>
  );
});

/**
 * Main constellation gizmos component
 */
export const ConstellationGizmos = memo(function ConstellationGizmos({
  radius = 25,
  showStars = true,
  showStarLabels = true,
  showLines = true,
  showConstellationLabels = true,
  showCelestialFrame = true,
  lineColor = '#00ff88',
  starColor = '#ffff00',
}: ConstellationGizmosProps) {
  const world = useWorld();
  const gmstRef = useRef(calculateGMST(new Date()));

  // Create star lookup map
  const starMap = useMemo(() => {
    const map = new Map<string, Star>();
    for (const star of STARS) {
      map.set(star.id, star);
    }
    return map;
  }, []);

  // Calculate initial star positions
  const starPositions = useRef<Map<string, THREE.Vector3>>(new Map());

  // Calculate constellation centroids
  const constellationCentroids = useRef<
    Map<string, { centroid: THREE.Vector3; boundingRadius: number }>
  >(new Map());

  // Update positions each frame
  useFrame(() => {
    const now = new Date();
    const newGmst = calculateGMST(now);
    gmstRef.current = newGmst;

    // Update star positions
    for (const star of STARS) {
      const [x, y, z] = celestialToCartesian(star.ra, star.dec, radius, newGmst);
      let pos = starPositions.current.get(star.id);
      if (!pos) {
        pos = new THREE.Vector3();
        starPositions.current.set(star.id, pos);
      }
      pos.set(x, y, z);
    }

    // Update constellation centroids
    for (const constellation of CONSTELLATIONS) {
      const result = calculateCentroid(constellation.stars, starMap, radius, newGmst);
      constellationCentroids.current.set(constellation.id, result);
    }

    // Spawn/update Koota entities for fast state queries
    try {
      // Update celestial frame entity
      const frameEntity = world.queryFirst(CelestialFrameData);
      if (frameEntity) {
        frameEntity.set(CelestialFrameData, {
          gmst: newGmst,
          radius,
          lastUpdate: Date.now(),
        });
      }
    } catch {
      // Ignore ECS errors during hot-reload
    }
  });

  // Calculate current positions for rendering
  const currentGmst = gmstRef.current;

  // Get star positions for current frame
  const renderedStars = useMemo(() => {
    return STARS.map((star) => {
      const [x, y, z] = celestialToCartesian(star.ra, star.dec, radius, currentGmst);
      return {
        ...star,
        position: new THREE.Vector3(x, y, z),
      };
    });
  }, [radius, currentGmst]);

  // Get line segments for current frame
  const renderedLines = useMemo(() => {
    return CONSTELLATION_LINES.map((line) => {
      const fromStar = starMap.get(line.from);
      const toStar = starMap.get(line.to);
      if (!fromStar || !toStar) return null;

      const [fx, fy, fz] = celestialToCartesian(fromStar.ra, fromStar.dec, radius, currentGmst);
      const [tx, ty, tz] = celestialToCartesian(toStar.ra, toStar.dec, radius, currentGmst);

      return {
        constellation: line.constellation,
        from: new THREE.Vector3(fx, fy, fz),
        to: new THREE.Vector3(tx, ty, tz),
      };
    }).filter(Boolean) as { constellation: string; from: THREE.Vector3; to: THREE.Vector3 }[];
  }, [radius, currentGmst, starMap]);

  // Get constellation centroids for current frame
  const renderedConstellations = useMemo(() => {
    return CONSTELLATIONS.map((constellation) => {
      const result = calculateCentroid(constellation.stars, starMap, radius, currentGmst);
      return {
        ...constellation,
        ...result,
      };
    });
  }, [radius, currentGmst, starMap]);

  return (
    <group name="Constellation Gizmos">
      {/* Celestial reference frame */}
      {showCelestialFrame && (
        <>
          {/* Celestial sphere wireframe */}
          <mesh>
            <sphereGeometry args={[radius, 32, 32]} />
            <meshBasicMaterial
              color="#00ff88"
              wireframe
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>

          {/* Equatorial plane */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius * 0.98, radius * 1.02, 64]} />
            <meshBasicMaterial
              color="#ffff00"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Celestial axes */}
          <axesHelper args={[radius * 1.3]} />

          {/* North celestial pole */}
          <group position={[0, radius, 0]}>
            <mesh>
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial color="#00ffff" depthWrite={false} />
            </mesh>
            <Html
              position={[0, 2, 0]}
              center
              style={{
                color: '#00ffff',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                textShadow: '0 0 3px #000',
                pointerEvents: 'none',
              }}
            >
              NCP
            </Html>
          </group>

          {/* South celestial pole */}
          <group position={[0, -radius, 0]}>
            <mesh>
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial color="#ff00ff" depthWrite={false} />
            </mesh>
            <Html
              position={[0, -2, 0]}
              center
              style={{
                color: '#ff00ff',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                textShadow: '0 0 3px #000',
                pointerEvents: 'none',
              }}
            >
              SCP
            </Html>
          </group>
        </>
      )}

      {/* Star markers */}
      {showStars &&
        renderedStars.map((star) => (
          <StarMarker
            key={star.id}
            position={star.position}
            name={star.name}
            magnitude={star.magnitude}
            showLabel={showStarLabels}
            color={starColor}
          />
        ))}

      {/* Constellation wireframe lines */}
      {showLines &&
        renderedLines.map((line, idx) => (
          <Line
            key={`line-${line.constellation}-${idx}`}
            points={[line.from, line.to]}
            color={lineColor}
            lineWidth={2}
            transparent
            opacity={0.6}
            dashed
            dashSize={1}
            gapSize={0.5}
          />
        ))}

      {/* Constellation name labels */}
      {showConstellationLabels &&
        renderedConstellations.map((constellation) => (
          <ConstellationLabel
            key={constellation.id}
            position={constellation.centroid}
            name={constellation.name}
            latinName={constellation.latinName}
          />
        ))}
    </group>
  );
});
