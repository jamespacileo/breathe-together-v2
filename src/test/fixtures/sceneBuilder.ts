/**
 * Scene Builder Fixtures
 *
 * Reusable scene construction for performance and integration tests.
 * Consolidates duplicate scene building logic from multiple test files.
 */

import * as THREE from 'three';

export interface SceneConfig {
  /** Whether to use instanced mesh for particles (default: true) */
  useInstancedParticles?: boolean;
  /** Number of particles to create (default: 300) */
  particleCount?: number;
  /** Whether to include atmosphere particles (default: true) */
  includeAtmosphericParticles?: boolean;
  /** Whether to include environment elements (default: true) */
  includeEnvironment?: boolean;
}

/**
 * Build a complete breathing scene with all components
 *
 * @param scene - Three.js scene to populate
 * @param config - Configuration options
 */
export function buildBreathingScene(scene: THREE.Scene, config: SceneConfig = {}): void {
  const {
    useInstancedParticles = true,
    particleCount = 300,
    includeAtmosphericParticles = true,
    includeEnvironment = true,
  } = config;

  // === EarthGlobe ===
  buildGlobe(scene);

  // === ParticleSwarm ===
  if (useInstancedParticles) {
    buildInstancedParticles(scene, particleCount);
  } else {
    buildIndividualParticles(scene, particleCount);
  }

  // === AtmosphericParticles ===
  if (includeAtmosphericParticles) {
    buildAtmosphericParticles(scene);
  }

  // === Environment ===
  if (includeEnvironment) {
    buildEnvironment(scene);
  }
}

/**
 * Build the central globe with all layers
 */
export function buildGlobe(scene: THREE.Scene): void {
  const globeRadius = 1.5;

  // Main sphere (64x64)
  const mainGeometry = new THREE.SphereGeometry(globeRadius, 64, 64);
  const mainMaterial = new THREE.MeshBasicMaterial({ color: 0x8b6f47 });
  scene.add(new THREE.Mesh(mainGeometry, mainMaterial));

  // Glow + Mist (32x32 each)
  const glowGeometry = new THREE.SphereGeometry(globeRadius * 1.02, 32, 32);
  const mistGeometry = new THREE.SphereGeometry(globeRadius * 1.15, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25 });
  const mistMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.15 });
  scene.add(new THREE.Mesh(glowGeometry, glowMaterial));
  scene.add(new THREE.Mesh(mistGeometry, mistMaterial));

  // 3 atmosphere layers (share geometry)
  const atmosphereGeometry = new THREE.SphereGeometry(globeRadius, 32, 32);
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.05 });
    scene.add(new THREE.Mesh(atmosphereGeometry, mat));
  }

  // Ring
  const ringGeometry = new THREE.RingGeometry(globeRadius * 1.6, globeRadius * 1.65, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({ transparent: true });
  scene.add(new THREE.Mesh(ringGeometry, ringMaterial));

  // Globe sparkles (Points)
  const globeSparklesGeometry = new THREE.BufferGeometry();
  const sparklePositions = new Float32Array(60 * 3);
  for (let i = 0; i < 60 * 3; i++) sparklePositions[i] = Math.random() * 10 - 5;
  globeSparklesGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
  scene.add(new THREE.Points(globeSparklesGeometry, new THREE.PointsMaterial({ size: 4 })));
}

/**
 * Build particle swarm using InstancedMesh (optimized)
 */
export function buildInstancedParticles(scene: THREE.Scene, count: number): void {
  const shardSize = 0.05;
  const geometry = new THREE.IcosahedronGeometry(shardSize, 0);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  scene.add(instancedMesh);
}

/**
 * Build particle swarm using individual meshes (non-optimized)
 */
export function buildIndividualParticles(scene: THREE.Scene, count: number): void {
  const shardSize = 0.05;

  for (let i = 0; i < count; i++) {
    const geometry = new THREE.IcosahedronGeometry(shardSize, 0);
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
    scene.add(mesh);
  }
}

/**
 * Build atmospheric particles (floating dots)
 */
export function buildAtmosphericParticles(scene: THREE.Scene): void {
  const atmosphericGeometry = new THREE.BufferGeometry();
  const atmosphericPositions = new Float32Array(100 * 3);
  for (let i = 0; i < 100 * 3; i++) atmosphericPositions[i] = Math.random() * 20 - 10;
  atmosphericGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(atmosphericPositions, 3),
  );
  scene.add(new THREE.Points(atmosphericGeometry, new THREE.PointsMaterial({ size: 2 })));
}

/**
 * Build environment (background, clouds, stars)
 */
export function buildEnvironment(scene: THREE.Scene): void {
  // Background plane
  const bgGeometry = new THREE.PlaneGeometry(2, 2);
  const bgMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f0e8 });
  scene.add(new THREE.Mesh(bgGeometry, bgMaterial));

  // 5 clouds
  for (let i = 0; i < 5; i++) {
    const cloudGeometry = new THREE.SphereGeometry(2, 20, 20);
    const cloudMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3 });
    const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloud.position.set((i - 2) * 10, 10 + Math.random() * 5, -30);
    scene.add(cloud);
  }

  // Stars (Points)
  const starsGeometry = new THREE.BufferGeometry();
  const starsPositions = new Float32Array(500 * 3);
  for (let i = 0; i < 500 * 3; i++) starsPositions[i] = Math.random() * 200 - 100;
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
  scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ size: 1 })));
}
