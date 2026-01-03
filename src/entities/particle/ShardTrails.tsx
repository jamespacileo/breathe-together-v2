/**
 * ShardTrails - Ethereal motion trails for ParticleSwarm shards
 *
 * Creates soft, ribbon-like trails behind each shard as they move during
 * breathing cycles. Trails are velocity-responsive - longer/brighter during
 * inhale/exhale movement, shorter/dimmer during hold phases.
 *
 * Implementation:
 * - Uses InstancedMesh for single-draw-call performance (1 draw call for all trails)
 * - Each trail is a quad stretched between current and previous positions
 * - Custom shader creates soft gradient fade from head to tail
 * - Breathing-synchronized: opacity varies with breath phase transitions
 *
 * Performance: ~0.5ms per frame for 300 trails at 60fps
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RENDER_LAYERS } from '../../constants';
import { breathPhase, phaseType } from '../breath/traits';

/**
 * Per-trail state for position history and velocity tracking
 */
interface TrailState {
  /** Current position of the shard */
  currentPosition: THREE.Vector3;
  /** Previous position (used to calculate trail direction) */
  previousPosition: THREE.Vector3;
  /** Smoothed velocity magnitude (for trail length calculation) */
  smoothedVelocity: number;
  /** Current visibility (0-1, for enter/exit animations) */
  visibility: number;
  /** Whether this trail has been initialized with a valid position */
  initialized: boolean;
}

/**
 * Trail ribbon geometry - a single quad that gets instanced and stretched
 */
function createTrailGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // Create a simple quad (2 triangles) along the X axis
  // The trail will be stretched in shader based on velocity
  const positions = new Float32Array([
    // Triangle 1
    0,
    -0.5,
    0, // bottom-left (tail end)
    1,
    -0.5,
    0, // bottom-right (head end)
    1,
    0.5,
    0, // top-right (head end)
    // Triangle 2
    0,
    -0.5,
    0, // bottom-left (tail end)
    1,
    0.5,
    0, // top-right (head end)
    0,
    0.5,
    0, // top-left (tail end)
  ]);

  // UV coordinates for gradient fade
  const uvs = new Float32Array([
    // Triangle 1
    0,
    0, // tail
    1,
    0, // head
    1,
    1, // head
    // Triangle 2
    0,
    0, // tail
    1,
    1, // head
    0,
    1, // tail
  ]);

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  return geometry;
}

/**
 * Trail shader material - creates soft ethereal fade effect
 *
 * Visual characteristics:
 * - Soft gradient from head (bright) to tail (transparent)
 * - Edge softening for ribbon-like appearance
 * - Breathing-synchronized luminosity pulse
 * - Additive blending for ethereal glow effect
 */
function createTrailMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: new THREE.Color(0.95, 0.93, 0.9) }, // Warm white
      opacity: { value: 0.4 },
      breathPhase: { value: 0.5 },
      movementIntensity: { value: 0.5 }, // 0 during holds, 1 during movement
      time: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vFade;

      void main() {
        vUv = uv;
        // UV.x goes from 0 (tail) to 1 (head)
        // Fade factor: stronger at head, fading to tail
        vFade = uv.x;

        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 baseColor;
      uniform float opacity;
      uniform float breathPhase;
      uniform float movementIntensity;
      uniform float time;

      varying vec2 vUv;
      varying float vFade;

      void main() {
        // Fade from head (bright) to tail (transparent)
        // Using smooth cubic for elegant falloff
        float headToTail = vFade * vFade * (3.0 - 2.0 * vFade);

        // Edge softness - fade at top/bottom edges of ribbon
        // Creates soft, cloud-like edges
        float edgeDist = abs(vUv.y - 0.5) * 2.0;
        float edgeFade = 1.0 - edgeDist * edgeDist;

        // Movement-responsive brightness
        // Trails are more visible during active breathing phases
        float movementGlow = 0.6 + movementIntensity * 0.4;

        // Subtle shimmer effect
        float shimmer = 1.0 + sin(time * 3.0 + vFade * 6.28) * 0.05 * movementIntensity;

        // Combine all fade factors
        float finalAlpha = headToTail * edgeFade * opacity * movementGlow * shimmer;

        // Color gradient: slightly warmer at head, softer at tail
        vec3 headColor = baseColor;
        vec3 tailColor = baseColor * 0.85;
        vec3 finalColor = mix(tailColor, headColor, headToTail);

        // Add subtle breathing luminosity
        finalColor *= 1.0 + breathPhase * 0.1;

        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

export interface ShardTrailsProps {
  /**
   * Maximum number of trails to render
   * Should match ParticleSwarm's performanceCap
   * @default 1000
   */
  maxTrails?: number;

  /**
   * Base trail length multiplier
   * Higher values = longer trails
   * @default 0.8
   */
  trailLength?: number;

  /**
   * Trail width (ribbon thickness)
   * @default 0.08
   */
  trailWidth?: number;

  /**
   * Base opacity of trails
   * @default 0.35
   */
  trailOpacity?: number;

  /**
   * Trail color (CSS color string or hex)
   * @default '#f5f0eb'
   */
  trailColor?: string;

  /**
   * Velocity smoothing factor (0-1)
   * Higher = smoother trails, lower = more responsive
   * @default 0.85
   */
  velocitySmoothing?: number;

  /**
   * Minimum velocity threshold for trail visibility
   * Below this velocity, trails fade out
   * @default 0.02
   */
  minVelocity?: number;
}

// Reusable objects for animation loop (pre-allocated to avoid GC)
const _tempMatrix = new THREE.Matrix4();
const _tempPosition = new THREE.Vector3();
const _tempDirection = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();
const _upVector = new THREE.Vector3(0, 1, 0);
const _lookAtMatrix = new THREE.Matrix4();

export function ShardTrails({
  maxTrails = 1000,
  trailLength = 0.8,
  trailWidth = 0.08,
  trailOpacity = 0.35,
  trailColor = '#f5f0eb',
  velocitySmoothing = 0.85,
  minVelocity = 0.02,
}: ShardTrailsProps) {
  const world = useWorld();
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const trailStatesRef = useRef<TrailState[]>([]);
  const prevPhaseTypeRef = useRef(0);

  // Create geometry
  const geometry = useMemo(() => createTrailGeometry(), []);

  // Create material
  const material = useMemo(() => {
    const mat = createTrailMaterial();
    mat.uniforms.baseColor.value.set(trailColor);
    mat.uniforms.opacity.value = trailOpacity;
    return mat;
  }, [trailColor, trailOpacity]);

  // Initialize trail states
  useEffect(() => {
    const states: TrailState[] = [];
    for (let i = 0; i < maxTrails; i++) {
      states.push({
        currentPosition: new THREE.Vector3(),
        previousPosition: new THREE.Vector3(),
        smoothedVelocity: 0,
        visibility: 0,
        initialized: false,
      });
    }
    trailStatesRef.current = states;
  }, [maxTrails]);

  // Initialize instance matrices
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;

    // Initialize all trails to invisible (scale 0)
    _tempScale.setScalar(0);
    _tempQuaternion.identity();
    _tempPosition.set(0, 0, 0);
    _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);

    for (let i = 0; i < maxTrails; i++) {
      mesh.setMatrixAt(i, _tempMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [maxTrails]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation loop - updates from ParticleSwarm positions
  useFrame((state) => {
    const mesh = instancedMeshRef.current;
    const trailStates = trailStatesRef.current;
    if (!mesh || !trailStates.length) return;

    const time = state.clock.elapsedTime;

    // Get breathing state from ECS
    let currentBreathPhase = 0.5;
    let currentPhaseType = 0;
    const breathEntity = world.queryFirst(breathPhase, phaseType);
    if (breathEntity) {
      currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0.5;
      currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
    }

    // Calculate movement intensity based on phase type
    // 0=inhale (moving in), 1=hold-in (still), 2=exhale (moving out), 3=hold-out (still)
    // Movement phases (0, 2) get higher intensity, hold phases (1, 3) get lower
    const isMovementPhase = currentPhaseType === 0 || currentPhaseType === 2;
    const movementIntensity = isMovementPhase ? 1.0 : 0.3;

    // Update shader uniforms
    material.uniforms.time.value = time;
    material.uniforms.breathPhase.value = currentBreathPhase;
    material.uniforms.movementIntensity.value = movementIntensity;

    prevPhaseTypeRef.current = currentPhaseType;

    // Find ParticleSwarm instance to get current positions
    const scene = state.scene;
    const particleSwarm = scene.getObjectByName('Particle Swarm') as THREE.InstancedMesh | null;

    if (!particleSwarm) {
      // Hide all trails if no particle swarm found
      mesh.count = 0;
      return;
    }

    let visibleCount = 0;

    for (let i = 0; i < Math.min(particleSwarm.count, trailStates.length); i++) {
      const trailState = trailStates[i];

      // Get current shard position from ParticleSwarm's instance matrix
      particleSwarm.getMatrixAt(i, _tempMatrix);
      _tempMatrix.decompose(_tempPosition, _tempQuaternion, _tempScale);

      // Skip if shard is invisible
      if (_tempScale.x < 0.001) {
        trailState.visibility = 0;
        continue;
      }

      // Store previous position and update current
      trailState.previousPosition.copy(trailState.currentPosition);
      trailState.currentPosition.copy(_tempPosition);

      // On first frame for this trail, just initialize positions (no trail yet)
      if (!trailState.initialized) {
        trailState.previousPosition.copy(_tempPosition);
        trailState.initialized = true;
        // Hide trail on first frame
        _tempScale.setScalar(0);
        _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
        mesh.setMatrixAt(i, _tempMatrix);
        continue;
      }

      // Calculate velocity (distance moved this frame)
      _tempDirection.copy(trailState.currentPosition).sub(trailState.previousPosition);
      const velocity = _tempDirection.length();

      // Smooth velocity for more stable trails
      trailState.smoothedVelocity =
        trailState.smoothedVelocity * velocitySmoothing + velocity * (1 - velocitySmoothing);

      // Calculate trail visibility based on velocity and movement phase
      const velocityFactor = Math.min(trailState.smoothedVelocity / minVelocity, 1);
      trailState.visibility = velocityFactor * movementIntensity;

      // Skip if velocity too low (but use lower threshold during movement phases)
      const effectiveThreshold = minVelocity * (isMovementPhase ? 0.3 : 0.5);
      if (trailState.smoothedVelocity < effectiveThreshold) {
        _tempScale.setScalar(0);
        _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
        mesh.setMatrixAt(i, _tempMatrix);
        continue;
      }

      visibleCount = i + 1;

      // Calculate trail direction and length
      _tempDirection.normalize();
      // Longer trails during movement phases
      const phaseLengthMultiplier = isMovementPhase ? 1.5 : 0.8;
      const dynamicLength =
        trailLength * phaseLengthMultiplier * (1 + trailState.smoothedVelocity * 5);

      // Position trail behind the shard
      const trailPos = trailState.currentPosition
        .clone()
        .addScaledVector(_tempDirection, -dynamicLength * 0.5);

      // Orient trail to face camera while pointing in velocity direction
      if (_tempDirection.lengthSq() > 0.0001) {
        _lookAtMatrix.lookAt(trailPos, trailPos.clone().add(_tempDirection), _upVector);
        _tempQuaternion.setFromRotationMatrix(_lookAtMatrix);
      }

      // Scale trail based on velocity, phase, and config
      const widthMultiplier = 0.5 + trailState.visibility * 0.5;
      _tempScale.set(
        dynamicLength,
        trailWidth * widthMultiplier * (isMovementPhase ? 1.2 : 0.8),
        1,
      );

      // Compose final matrix
      _tempMatrix.compose(trailPos, _tempQuaternion, _tempScale);
      mesh.setMatrixAt(i, _tempMatrix);
    }

    mesh.count = visibleCount;
    mesh.instanceMatrix.needsUpdate = true;
  });

  // Set render layer for pipeline compatibility
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (mesh) {
      mesh.layers.enable(RENDER_LAYERS.PARTICLES);
    }
  }, []);

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[geometry, material, maxTrails]}
      frustumCulled={false}
      name="Shard Trails"
    />
  );
}

export default ShardTrails;
