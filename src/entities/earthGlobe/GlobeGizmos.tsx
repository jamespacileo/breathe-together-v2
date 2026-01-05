/**
 * GlobeGizmos - Debug visualization for Earth globe positioning and orientation.
 *
 * Features:
 * - North/South pole markers with labels
 * - Equator ring visualization
 * - Simplified orbit plane showing Earth-Sun relationship
 * - Day/night shadow overlay (shader-based)
 * - Axial tilt indicator
 *
 * All visualizations use accurate astronomical positioning based on UTC time.
 * Controlled via Leva Debug > Globe Gizmos folder.
 */

import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { calculateGMST, calculateSunPosition, celestialToCartesian } from '../../lib/astronomy';

interface GlobeGizmosProps {
  /** Globe radius to match @default 1.5 */
  globeRadius?: number;
  /** Show north/south pole markers @default true */
  showPoles?: boolean;
  /** Show equator ring @default true */
  showEquator?: boolean;
  /** Show simplified orbit plane (Earth-Sun relationship) @default true */
  showOrbitPlane?: boolean;
  /** Show day/night shadow overlay @default false */
  showTerminator?: boolean;
  /** Show axial tilt indicator @default false */
  showAxialTilt?: boolean;
  /** Pole marker color @default '#00ffff' for north, '#ff00ff' for south */
  northPoleColor?: string;
  southPoleColor?: string;
  /** Equator color @default '#ffaa00' */
  equatorColor?: string;
  /** Orbit plane color @default '#4488ff' */
  orbitColor?: string;
  /** Shadow color @default '#000033' */
  shadowColor?: string;
}

/**
 * Pole Marker - Shows north or south pole position with label
 */
const PoleMarker = memo(function PoleMarker({
  position,
  color,
  label,
  labelPosition,
}: {
  position: [number, number, number];
  color: string;
  label: string;
  labelPosition: 'above' | 'below';
}) {
  const labelY = labelPosition === 'above' ? 0.4 : -0.4;

  return (
    <group position={position}>
      {/* Pole sphere marker */}
      <mesh renderOrder={999}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} />
      </mesh>

      {/* Pole spike - extends outward */}
      <mesh rotation={labelPosition === 'above' ? [0, 0, 0] : [Math.PI, 0, 0]} renderOrder={999}>
        <coneGeometry args={[0.03, 0.2, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} depthTest={false} />
      </mesh>

      {/* Label */}
      <Html position={[0, labelY, 0]} center>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: color,
            padding: '3px 6px',
            borderRadius: '3px',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            border: `1px solid ${color}`,
            pointerEvents: 'none',
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
});

/**
 * Equator Ring - Shows the equatorial plane
 */
const EquatorRing = memo(function EquatorRing({
  radius,
  color,
}: {
  radius: number;
  color: string;
}) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={998}>
      <ringGeometry args={[radius * 0.99, radius * 1.02, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        depthTest={false}
      />
    </mesh>
  );
});

/**
 * Simplified Orbit Plane - Shows Earth orbiting the Sun
 * This is a pedagogical visualization showing Earth's position on its orbit around the Sun
 * The Sun is shown at the center of the orbit, with Earth's current position marked
 */
const OrbitPlaneGizmo = memo(function OrbitPlaneGizmo({
  globeRadius,
  color,
  sunDirection,
}: {
  globeRadius: number;
  color: string;
  sunDirection: THREE.Vector3;
}) {
  // Orbit radius - distance from Sun to orbit visualization
  const orbitRadius = globeRadius * 4;

  // Sun position (center of orbit system, offset from Earth)
  // The Sun is in the direction of sunDirection from Earth
  const sunPos = useMemo(() => {
    const dir = sunDirection.clone();
    // Project onto XZ plane for cleaner visualization
    dir.y = 0;
    if (dir.length() < 0.01) {
      return new THREE.Vector3(orbitRadius * 0.6, 0, 0);
    }
    dir.normalize();
    return dir.multiplyScalar(orbitRadius * 0.6);
  }, [sunDirection, orbitRadius]);

  // Create orbit ellipse points centered on the Sun
  const orbitPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 64;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          sunPos.x + Math.cos(angle) * orbitRadius,
          0,
          sunPos.z + Math.sin(angle) * orbitRadius,
        ),
      );
    }

    return points;
  }, [orbitRadius, sunPos]);

  // Earth's position on the orbit (opposite to sun direction from Earth's perspective)
  // Since Earth is at scene origin, its position on the orbit is at origin
  const earthOrbitPos = new THREE.Vector3(0, 0, 0);

  return (
    <group>
      {/* Sun at center of orbit - large yellow sphere */}
      <mesh position={sunPos} renderOrder={999}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color="#ffdd44" transparent opacity={0.9} depthTest={false} />
      </mesh>

      {/* Sun label */}
      <Html position={[sunPos.x, 0.6, sunPos.z]} center>
        <div
          style={{
            background: 'rgba(50, 40, 0, 0.85)',
            color: '#ffdd44',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: '1px solid #ffdd44',
          }}
        >
          ☀ Sun
        </div>
      </Html>

      {/* Orbit path - dashed ellipse centered on Sun */}
      <Line
        points={orbitPoints}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.6}
        dashed
        dashSize={0.5}
        gapSize={0.25}
        renderOrder={997}
      />

      {/* Earth position marker on orbit (at scene origin where the globe is) */}
      <mesh position={earthOrbitPos} rotation={[Math.PI / 2, 0, 0]} renderOrder={998}>
        <ringGeometry args={[globeRadius * 1.1, globeRadius * 1.15, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>

      {/* Line from Sun to Earth */}
      <Line
        points={[sunPos, earthOrbitPos]}
        color="#ffdd44"
        lineWidth={2}
        transparent
        opacity={0.4}
        dashed
        dashSize={0.3}
        gapSize={0.15}
        renderOrder={996}
      />

      {/* Earth position label */}
      <Html position={[0, -globeRadius - 0.5, 0]} center>
        <div
          style={{
            background: 'rgba(30, 60, 100, 0.85)',
            color: color,
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: `1px solid ${color}`,
          }}
        >
          🌍 Earth (you are here)
        </div>
      </Html>
    </group>
  );
});

/**
 * Day/Night Shadow - Shader-based shadow overlay on the globe
 * Uses dot product between surface normal and sun direction
 * Based on: https://webgl2fundamentals.org/webgl/lessons/webgl-qna-show-a-night-view-vs-a-day-view-on-a-3d-earth-sphere.html
 */
const dayNightVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const dayNightFragmentShader = `
uniform vec3 sunDirection;
uniform vec3 shadowColor;
uniform float shadowOpacity;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  // Calculate dot product between surface normal and sun direction
  // Positive = facing sun (day), Negative = facing away (night)
  float dotProduct = dot(normalize(vNormal), normalize(sunDirection));

  // Smooth transition at terminator (twilight zone)
  // -0.1 to 0.1 range for soft edge
  float shadow = smoothstep(-0.1, 0.1, -dotProduct);

  // Only show shadow on night side
  gl_FragColor = vec4(shadowColor, shadow * shadowOpacity);
}
`;

const DayNightShadow = memo(function DayNightShadow({
  globeRadius,
  sunDirection,
  shadowColor = '#000033',
  opacity = 0.6,
}: {
  globeRadius: number;
  sunDirection: THREE.Vector3;
  shadowColor?: string;
  opacity?: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create shader material
  const material = useMemo(() => {
    const color = new THREE.Color(shadowColor);
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        shadowColor: { value: color },
        shadowOpacity: { value: opacity },
      },
      vertexShader: dayNightVertexShader,
      fragmentShader: dayNightFragmentShader,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
    });
  }, [shadowColor, opacity]);

  // Update sun direction uniform
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.sunDirection.value.copy(sunDirection);
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh renderOrder={100}>
      {/* Slightly larger than globe to avoid z-fighting */}
      <sphereGeometry args={[globeRadius * 1.002, 64, 32]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

/**
 * Axial Tilt Indicator - Shows Earth's 23.4° axial tilt
 */
const AxialTiltIndicator = memo(function AxialTiltIndicator({
  globeRadius,
}: {
  globeRadius: number;
}) {
  const AXIAL_TILT = 23.4 * (Math.PI / 180); // 23.4 degrees in radians

  return (
    <group>
      {/* Vertical reference line (if Earth had no tilt) */}
      <Line
        points={[
          new THREE.Vector3(0, -globeRadius * 1.4, 0),
          new THREE.Vector3(0, globeRadius * 1.4, 0),
        ]}
        color="#666666"
        lineWidth={1}
        transparent
        opacity={0.4}
        dashed
        dashSize={0.15}
        gapSize={0.1}
      />

      {/* Tilted axis line */}
      <group rotation={[0, 0, AXIAL_TILT]}>
        <Line
          points={[
            new THREE.Vector3(0, -globeRadius * 1.4, 0),
            new THREE.Vector3(0, globeRadius * 1.4, 0),
          ]}
          color="#00ff88"
          lineWidth={2}
          transparent
          opacity={0.7}
        />
      </group>

      {/* Tilt angle label */}
      <Html position={[globeRadius * 0.4, globeRadius * 1.2, 0]} center>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#00ff88',
            padding: '3px 6px',
            borderRadius: '3px',
            fontSize: '9px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          23.4° tilt
        </div>
      </Html>
    </group>
  );
});

/**
 * Calculate sun direction vector for current time
 */
function getSunDirection(): THREE.Vector3 {
  const now = new Date();
  const gmst = calculateGMST(now);
  const sunData = calculateSunPosition(now);
  const [x, y, z] = celestialToCartesian(sunData.ra, sunData.dec, 1, gmst);
  return new THREE.Vector3(x, y, z);
}

/**
 * Main GlobeGizmos component
 */
export const GlobeGizmos = memo(function GlobeGizmos({
  globeRadius = 1.5,
  showPoles = true,
  showEquator = true,
  showOrbitPlane = true,
  showTerminator = false,
  showAxialTilt = false,
  northPoleColor = '#00ffff',
  southPoleColor = '#ff00ff',
  equatorColor = '#ffaa00',
  orbitColor = '#4488ff',
  shadowColor = '#000033',
}: GlobeGizmosProps) {
  // Initialize with actual sun position (not default) to prevent sudden appearance
  const sunDirectionRef = useRef(getSunDirection());

  // Update sun direction each frame for accurate positioning
  useFrame(() => {
    const dir = getSunDirection();
    sunDirectionRef.current.copy(dir);
  });

  // Nothing to show
  if (!showPoles && !showEquator && !showOrbitPlane && !showTerminator && !showAxialTilt) {
    return null;
  }

  return (
    <group name="Globe Gizmos">
      {/* North Pole */}
      {showPoles && (
        <PoleMarker
          position={[0, globeRadius, 0]}
          color={northPoleColor}
          label="N"
          labelPosition="above"
        />
      )}

      {/* South Pole */}
      {showPoles && (
        <PoleMarker
          position={[0, -globeRadius, 0]}
          color={southPoleColor}
          label="S"
          labelPosition="below"
        />
      )}

      {/* Equator */}
      {showEquator && <EquatorRing radius={globeRadius} color={equatorColor} />}

      {/* Orbit Plane */}
      {showOrbitPlane && (
        <OrbitPlaneGizmo
          globeRadius={globeRadius}
          color={orbitColor}
          sunDirection={sunDirectionRef.current}
        />
      )}

      {/* Day/Night Shadow */}
      {showTerminator && (
        <DayNightShadow
          globeRadius={globeRadius}
          sunDirection={sunDirectionRef.current}
          shadowColor={shadowColor}
        />
      )}

      {/* Axial Tilt */}
      {showAxialTilt && <AxialTiltIndicator globeRadius={globeRadius} />}
    </group>
  );
});

export default GlobeGizmos;
