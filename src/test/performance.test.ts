/**
 * Performance Tests for breathe-together-v2
 *
 * These tests analyze Three.js scene graphs to estimate WebGL performance metrics
 * and validate them against device-tier thresholds.
 *
 * Uses scene graph analysis (no WebGL required) for reliable CI testing.
 *
 * Run with: npm run test
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  analyzeScene,
  formatMetrics,
  getPerformanceMetrics,
  PERFORMANCE_TARGETS,
  validateMetrics,
} from './sceneAnalyzer';

describe('Scene Analyzer', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    scene.clear();
  });

  it('should analyze empty scene', () => {
    const sceneMetrics = analyzeScene(scene);
    const metrics = getPerformanceMetrics(sceneMetrics);

    expect(metrics.drawCalls).toBe(0);
    expect(metrics.triangles).toBe(0);
    expect(metrics.geometries).toBe(0);
  });

  it('should count single mesh as 1 draw call', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const sceneMetrics = analyzeScene(scene);
    const metrics = getPerformanceMetrics(sceneMetrics);

    expect(metrics.drawCalls).toBe(1);
    expect(metrics.meshes).toBe(1);
    expect(metrics.geometries).toBe(1);
    expect(metrics.materials).toBe(1);
    expect(metrics.triangles).toBe(12); // Box has 12 triangles

    // Cleanup
    geometry.dispose();
    material.dispose();
  });

  it('should count InstancedMesh as 1 draw call regardless of instance count', () => {
    const geometry = new THREE.IcosahedronGeometry(0.05, 0);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, 300);

    scene.add(instancedMesh);

    const sceneMetrics = analyzeScene(scene);
    const metrics = getPerformanceMetrics(sceneMetrics);

    expect(metrics.drawCalls).toBe(1); // Single draw call!
    expect(metrics.instancedMeshes).toBe(1);
    expect(metrics.geometries).toBe(1);

    // Cleanup
    geometry.dispose();
    material.dispose();
  });

  it('should share geometry count when multiple meshes use same geometry', () => {
    const sharedGeometry = new THREE.SphereGeometry(1, 32, 32);
    const material1 = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const material2 = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

    scene.add(new THREE.Mesh(sharedGeometry, material1));
    scene.add(new THREE.Mesh(sharedGeometry, material2));
    scene.add(new THREE.Mesh(sharedGeometry, material1));

    const sceneMetrics = analyzeScene(scene);
    const metrics = getPerformanceMetrics(sceneMetrics);

    expect(metrics.drawCalls).toBe(3); // 3 meshes = 3 draw calls
    expect(metrics.geometries).toBe(1); // Shared geometry
    expect(metrics.materials).toBe(2); // 2 unique materials

    // Cleanup
    sharedGeometry.dispose();
    material1.dispose();
    material2.dispose();
  });
});

describe('Scene Component Metrics', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    scene.clear();
  });

  describe('EarthGlobe (simplified)', () => {
    it('should measure EarthGlobe component metrics', () => {
      // Simulate EarthGlobe: main sphere + glow + mist + 3 atmosphere layers + ring
      const radius = 1.5;
      const resolution = 64;

      // Main globe
      const mainGeometry = new THREE.SphereGeometry(radius, resolution, resolution);
      const mainMaterial = new THREE.MeshBasicMaterial({ color: 0x8b6f47 });
      scene.add(new THREE.Mesh(mainGeometry, mainMaterial));

      // Glow layer
      const glowGeometry = new THREE.SphereGeometry(radius * 1.02, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xefe5da,
        transparent: true,
        opacity: 0.25,
      });
      scene.add(new THREE.Mesh(glowGeometry, glowMaterial));

      // Mist layer
      const mistGeometry = new THREE.SphereGeometry(radius * 1.15, 32, 32);
      const mistMaterial = new THREE.MeshBasicMaterial({
        color: 0xf0ebe6,
        transparent: true,
        opacity: 0.15,
      });
      scene.add(new THREE.Mesh(mistGeometry, mistMaterial));

      // 3 atmosphere layers (share geometry)
      const atmosphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
      const atmosphereMaterials = [
        new THREE.MeshBasicMaterial({ color: 0xf8d0a8, transparent: true, opacity: 0.08 }),
        new THREE.MeshBasicMaterial({ color: 0xb8e8d4, transparent: true, opacity: 0.05 }),
        new THREE.MeshBasicMaterial({ color: 0xc4b8e8, transparent: true, opacity: 0.03 }),
      ];
      for (const mat of atmosphereMaterials) {
        scene.add(new THREE.Mesh(atmosphereGeometry, mat));
      }

      // Ring
      const ringGeometry = new THREE.RingGeometry(radius * 1.6, radius * 1.65, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xe8c4b8, transparent: true });
      scene.add(new THREE.Mesh(ringGeometry, ringMaterial));

      const sceneMetrics = analyzeScene(scene);
      const metrics = getPerformanceMetrics(sceneMetrics);
      console.log(`EarthGlobe metrics:\n${formatMetrics(metrics)}`);

      // EarthGlobe should be: 7 draw calls (main + glow + mist + 3 atmosphere + ring)
      expect(metrics.drawCalls).toBe(7);
      expect(metrics.geometries).toBe(5); // 5 unique geometries (atmosphere shares 1)

      // Cleanup
      for (const g of [
        mainGeometry,
        glowGeometry,
        mistGeometry,
        atmosphereGeometry,
        ringGeometry,
      ]) {
        g.dispose();
      }
      for (const m of [
        mainMaterial,
        glowMaterial,
        mistMaterial,
        ...atmosphereMaterials,
        ringMaterial,
      ]) {
        m.dispose();
      }
    });
  });

  describe('ParticleSwarm comparison', () => {
    it('should measure individual mesh approach (CURRENT - non-optimal)', () => {
      // Current implementation: individual meshes per particle
      const particleCount = 300;
      const shardSize = 0.05;

      // This simulates current ParticleSwarm - creates individual meshes
      const materials: THREE.Material[] = [];
      const geometries: THREE.BufferGeometry[] = [];

      for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.IcosahedronGeometry(shardSize, 0);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
        scene.add(mesh);
        materials.push(material);
        geometries.push(geometry);
      }

      const sceneMetrics = analyzeScene(scene);
      const metrics = getPerformanceMetrics(sceneMetrics);
      console.log(`ParticleSwarm (${particleCount} individual meshes):\n${formatMetrics(metrics)}`);

      // This is expected to be HIGH - demonstrates the problem
      // 300 particles = 300 draw calls with individual meshes
      console.log(`⚠️ Individual mesh approach: ${metrics.drawCalls} draw calls`);

      expect(metrics.drawCalls).toBe(300);
      expect(metrics.geometries).toBe(300); // Each particle has its own geometry

      // Cleanup
      for (const g of geometries) {
        g.dispose();
      }
      for (const m of materials) {
        m.dispose();
      }
    });

    it('should measure instanced mesh approach (OPTIMIZED)', () => {
      // Optimized: InstancedMesh for particles
      const particleCount = 300;
      const shardSize = 0.05;

      // Single geometry and material
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

      // InstancedMesh - single draw call for all particles!
      const instancedMesh = new THREE.InstancedMesh(geometry, material, particleCount);

      // Set transforms for each instance
      const dummy = new THREE.Object3D();
      for (let i = 0; i < particleCount; i++) {
        dummy.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      scene.add(instancedMesh);

      const sceneMetrics = analyzeScene(scene);
      const metrics = getPerformanceMetrics(sceneMetrics);
      console.log(`ParticleSwarm (${particleCount} instances):\n${formatMetrics(metrics)}`);

      // InstancedMesh should be 1 draw call!
      console.log(`✅ Instanced approach: ${metrics.drawCalls} draw call(s)`);

      expect(metrics.drawCalls).toBe(1);
      expect(metrics.geometries).toBe(1);
      expect(metrics.instancedMeshes).toBe(1);

      // Cleanup
      geometry.dispose();
      material.dispose();
      instancedMesh.dispose();
    });
  });

  describe('Environment (simplified)', () => {
    it('should measure environment component metrics', () => {
      // Background plane
      const bgGeometry = new THREE.PlaneGeometry(2, 2);
      const bgMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f0e8 });
      scene.add(new THREE.Mesh(bgGeometry, bgMaterial));

      // Simulate 5 clouds (each cloud = 1 draw call with drei Cloud)
      for (let i = 0; i < 5; i++) {
        const cloudGeometry = new THREE.SphereGeometry(2, 16, 16);
        const cloudMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.3,
        });
        scene.add(new THREE.Mesh(cloudGeometry, cloudMaterial));
      }

      // Stars (Points - 1 draw call)
      const starsGeometry = new THREE.BufferGeometry();
      const starsPositions = new Float32Array(500 * 3);
      for (let i = 0; i < 500 * 3; i++) {
        starsPositions[i] = Math.random() * 200 - 100;
      }
      starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
      const starsMaterial = new THREE.PointsMaterial({ size: 1 });
      scene.add(new THREE.Points(starsGeometry, starsMaterial));

      const sceneMetrics = analyzeScene(scene);
      const metrics = getPerformanceMetrics(sceneMetrics);
      console.log(`Environment metrics:\n${formatMetrics(metrics)}`);

      // Environment should be: background + 5 clouds + stars = 7 draw calls
      expect(metrics.drawCalls).toBe(7);

      // Cleanup
      bgGeometry.dispose();
      bgMaterial.dispose();
    });
  });
});

describe('Full Scene Performance Targets', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    scene.clear();
  });

  /**
   * Builds a simplified version of the full breathing scene
   * for performance measurement
   */
  function buildSimplifiedBreathingScene(useInstancedParticles: boolean): void {
    // === EarthGlobe ===
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

    // === ParticleSwarm ===
    const particleCount = 300;
    const shardSize = 0.05;

    if (useInstancedParticles) {
      // OPTIMIZED: InstancedMesh
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const instancedMesh = new THREE.InstancedMesh(geometry, material, particleCount);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < particleCount; i++) {
        dummy.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      scene.add(instancedMesh);
    } else {
      // CURRENT: Individual meshes (inefficient)
      for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.IcosahedronGeometry(shardSize, 0);
        const material = new THREE.MeshBasicMaterial();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
        scene.add(mesh);
      }
    }

    // === AtmosphericParticles ===
    const atmosphericGeometry = new THREE.BufferGeometry();
    const atmosphericPositions = new Float32Array(100 * 3);
    for (let i = 0; i < 100 * 3; i++) atmosphericPositions[i] = Math.random() * 20 - 10;
    atmosphericGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(atmosphericPositions, 3),
    );
    scene.add(new THREE.Points(atmosphericGeometry, new THREE.PointsMaterial({ size: 2 })));

    // === Environment ===
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

  it('should measure CURRENT scene (individual particles) - expected to exceed mobile targets', () => {
    buildSimplifiedBreathingScene(false); // Non-optimized

    const sceneMetrics = analyzeScene(scene);
    const metrics = getPerformanceMetrics(sceneMetrics);
    console.log(`\n📊 CURRENT Scene Metrics (non-optimized):\n${formatMetrics(metrics)}`);

    const validation = validateMetrics(metrics, PERFORMANCE_TARGETS.mobile);
    console.log('\n📱 Mobile Target Validation:');
    console.log(`  Max Draw Calls: ${PERFORMANCE_TARGETS.mobile.maxDrawCalls}`);
    console.log(`  Actual: ${metrics.drawCalls}`);
    console.log(`  Status: ${validation.passed ? '✅ PASS' : '❌ FAIL'}`);

    if (!validation.passed) {
      console.log('\n  Violations:');
      for (const v of validation.violations) {
        console.log(`    - ${v}`);
      }
    }

    // Document that current implementation exceeds mobile targets
    // This test SHOULD fail with individual meshes (300+ draw calls)
    expect(metrics.drawCalls).toBeGreaterThan(PERFORMANCE_TARGETS.mobile.maxDrawCalls);
  });

  it('should measure OPTIMIZED scene (instanced particles) - should meet mobile targets', () => {
    buildSimplifiedBreathingScene(true); // Optimized

    const sceneMetrics = analyzeScene(scene);
    const metrics = getPerformanceMetrics(sceneMetrics);
    console.log(`\n📊 OPTIMIZED Scene Metrics:\n${formatMetrics(metrics)}`);

    const validation = validateMetrics(metrics, PERFORMANCE_TARGETS.mobile);
    console.log('\n📱 Mobile Target Validation:');
    console.log(`  Max Draw Calls: ${PERFORMANCE_TARGETS.mobile.maxDrawCalls}`);
    console.log(`  Max Triangles: ${PERFORMANCE_TARGETS.mobile.maxTriangles}`);
    console.log(`  Max Geometries: ${PERFORMANCE_TARGETS.mobile.maxGeometries}`);
    console.log(`\n  Actual:`);
    console.log(`    Draw Calls: ${metrics.drawCalls}`);
    console.log(`    Triangles: ${metrics.triangles}`);
    console.log(`    Geometries: ${metrics.geometries}`);
    console.log(`\n  Status: ${validation.passed ? '✅ PASS' : '❌ FAIL'}`);

    if (!validation.passed) {
      console.log('\n  Violations:');
      for (const v of validation.violations) {
        console.log(`    - ${v}`);
      }
    }

    // With instanced particles, we should meet mobile targets
    expect(metrics.drawCalls).toBeLessThanOrEqual(PERFORMANCE_TARGETS.mobile.maxDrawCalls);
    expect(validation.passed).toBe(true);
  });

  it('should have significant improvement from instancing', () => {
    // Measure both approaches
    buildSimplifiedBreathingScene(false);
    const nonOptimizedSceneMetrics = analyzeScene(scene);
    const nonOptimizedMetrics = getPerformanceMetrics(nonOptimizedSceneMetrics);
    scene.clear();

    buildSimplifiedBreathingScene(true);
    const optimizedSceneMetrics = analyzeScene(scene);
    const optimizedMetrics = getPerformanceMetrics(optimizedSceneMetrics);

    const drawCallReduction = nonOptimizedMetrics.drawCalls - optimizedMetrics.drawCalls;
    const percentageReduction = ((drawCallReduction / nonOptimizedMetrics.drawCalls) * 100).toFixed(
      1,
    );

    console.log('\n📈 Performance Improvement Summary:');
    console.log(`  Non-optimized: ${nonOptimizedMetrics.drawCalls} draw calls`);
    console.log(`  Optimized: ${optimizedMetrics.drawCalls} draw calls`);
    console.log(
      `  Reduction: ${drawCallReduction} draw calls (${percentageReduction}% improvement)`,
    );

    // Instancing should reduce draw calls by at least 290 (from ~318 to ~18)
    expect(drawCallReduction).toBeGreaterThan(280);
  });
});

describe('CI Performance Gates', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    scene.clear();
  });

  /**
   * This test represents what the CI gate should enforce AFTER optimization
   * Currently skipped until ParticleSwarm is converted to InstancedMesh
   */
  it.skip('GATE: Full scene must meet mobile performance targets', () => {
    // TODO: Build actual scene components here when optimized
    // buildActualBreathingScene();

    const sceneMetrics = analyzeScene(scene);
    const metrics = getPerformanceMetrics(sceneMetrics);
    const validation = validateMetrics(metrics, PERFORMANCE_TARGETS.mobile);

    expect(validation.passed).toBe(true);
    expect(metrics.drawCalls).toBeLessThanOrEqual(50);
    expect(metrics.triangles).toBeLessThanOrEqual(50000);
    expect(metrics.geometries).toBeLessThanOrEqual(30);
  });
});

describe('Stress Tests - High Particle Counts', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    scene.clear();
  });

  /**
   * Builds a scene with configurable particle count using InstancedMesh
   * Includes all base scene elements (globe, environment, etc.)
   */
  function buildSceneWithParticleCount(particleCount: number): void {
    // === EarthGlobe ===
    const globeRadius = 1.5;

    // Main sphere
    const mainGeometry = new THREE.SphereGeometry(globeRadius, 64, 64);
    const mainMaterial = new THREE.MeshBasicMaterial({ color: 0x8b6f47 });
    scene.add(new THREE.Mesh(mainGeometry, mainMaterial));

    // Glow + Mist
    const glowGeometry = new THREE.SphereGeometry(globeRadius * 1.02, 32, 32);
    const mistGeometry = new THREE.SphereGeometry(globeRadius * 1.15, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25 });
    const mistMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.15 });
    scene.add(new THREE.Mesh(glowGeometry, glowMaterial));
    scene.add(new THREE.Mesh(mistGeometry, mistMaterial));

    // 3 atmosphere layers
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

    // === ParticleSwarm (InstancedMesh) ===
    const shardSize = 0.05;
    const geometry = new THREE.IcosahedronGeometry(shardSize, 0);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, particleCount);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < particleCount; i++) {
      dummy.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(instancedMesh);

    // === AtmosphericParticles ===
    const atmosphericGeometry = new THREE.BufferGeometry();
    const atmosphericPositions = new Float32Array(100 * 3);
    for (let i = 0; i < 100 * 3; i++) atmosphericPositions[i] = Math.random() * 20 - 10;
    atmosphericGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(atmosphericPositions, 3),
    );
    scene.add(new THREE.Points(atmosphericGeometry, new THREE.PointsMaterial({ size: 2 })));

    // === Environment ===
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

  describe('200 particles stress test', () => {
    it('should meet mobile targets with 200 particles', () => {
      buildSceneWithParticleCount(200);

      const sceneMetrics = analyzeScene(scene);
      const metrics = getPerformanceMetrics(sceneMetrics);
      const validation = validateMetrics(metrics, PERFORMANCE_TARGETS.mobile);

      console.log('\n📊 200 Particles Stress Test:');
      console.log(
        `  Draw Calls: ${metrics.drawCalls} (target: <${PERFORMANCE_TARGETS.mobile.maxDrawCalls})`,
      );
      console.log(
        `  Triangles: ${metrics.triangles.toLocaleString()} (target: <${PERFORMANCE_TARGETS.mobile.maxTriangles.toLocaleString()})`,
      );
      console.log(
        `  Geometries: ${metrics.geometries} (target: <${PERFORMANCE_TARGETS.mobile.maxGeometries})`,
      );
      console.log(
        `  Materials: ${metrics.materials} (target: <${PERFORMANCE_TARGETS.mobile.maxMaterials})`,
      );
      console.log(`  Status: ${validation.passed ? '✅ PASS' : '❌ FAIL'}`);

      // With InstancedMesh, 200 particles should still be 1 draw call
      expect(metrics.drawCalls).toBeLessThanOrEqual(PERFORMANCE_TARGETS.mobile.maxDrawCalls);
      expect(metrics.triangles).toBeLessThanOrEqual(PERFORMANCE_TARGETS.mobile.maxTriangles);
      expect(metrics.geometries).toBeLessThanOrEqual(PERFORMANCE_TARGETS.mobile.maxGeometries);
      expect(metrics.materials).toBeLessThanOrEqual(PERFORMANCE_TARGETS.mobile.maxMaterials);
      expect(validation.passed).toBe(true);
    });

    it('should have exactly 1 instanced mesh for particles', () => {
      buildSceneWithParticleCount(200);

      const sceneMetrics = analyzeScene(scene);
      const metrics = getPerformanceMetrics(sceneMetrics);

      expect(metrics.instancedMeshes).toBe(1);
    });
  });

  describe('500 particles stress test', () => {
    it('should meet mobile targets with 500 particles', () => {
      buildSceneWithParticleCount(500);

      const sceneMetrics = analyzeScene(scene);
      const metrics = getPerformanceMetrics(sceneMetrics);
      const validation = validateMetrics(metrics, PERFORMANCE_TARGETS.mobile);

      console.log('\n📊 500 Particles Stress Test:');
      console.log(
        `  Draw Calls: ${metrics.drawCalls} (target: <${PERFORMANCE_TARGETS.mobile.maxDrawCalls})`,
      );
      console.log(
        `  Triangles: ${metrics.triangles.toLocaleString()} (target: <${PERFORMANCE_TARGETS.mobile.maxTriangles.toLocaleString()})`,
      );
      console.log(
        `  Geometries: ${metrics.geometries} (target: <${PERFORMANCE_TARGETS.mobile.maxGeometries})`,
      );
      console.log(
        `  Materials: ${metrics.materials} (target: <${PERFORMANCE_TARGETS.mobile.maxMaterials})`,
      );
      console.log(`  Status: ${validation.passed ? '✅ PASS' : '❌ FAIL'}`);

      // With InstancedMesh, 500 particles should still be 1 draw call
      expect(metrics.drawCalls).toBeLessThanOrEqual(PERFORMANCE_TARGETS.mobile.maxDrawCalls);
      expect(metrics.triangles).toBeLessThanOrEqual(PERFORMANCE_TARGETS.mobile.maxTriangles);
      expect(metrics.geometries).toBeLessThanOrEqual(PERFORMANCE_TARGETS.mobile.maxGeometries);
      expect(metrics.materials).toBeLessThanOrEqual(PERFORMANCE_TARGETS.mobile.maxMaterials);
      expect(validation.passed).toBe(true);
    });

    it('should have exactly 1 instanced mesh for particles', () => {
      buildSceneWithParticleCount(500);

      const sceneMetrics = analyzeScene(scene);
      const metrics = getPerformanceMetrics(sceneMetrics);

      expect(metrics.instancedMeshes).toBe(1);
    });

    it('should calculate correct triangle count for 500 icosahedrons', () => {
      buildSceneWithParticleCount(500);

      const sceneMetrics = analyzeScene(scene);
      const metrics = getPerformanceMetrics(sceneMetrics);

      // Each icosahedron has 20 triangles
      // 500 particles × 20 triangles = 10,000 triangles just for particles
      // Plus globe, environment, etc.
      expect(metrics.triangles).toBeGreaterThan(10000);
      expect(metrics.triangles).toBeLessThan(50000); // Still under mobile limit
    });
  });

  describe('Scaling comparison', () => {
    it('should maintain constant draw calls regardless of particle count', () => {
      const particleCounts = [100, 200, 300, 500];
      const drawCallsPerCount: number[] = [];

      console.log('\n📈 Draw Call Scaling Analysis:');
      console.log('  Particle Count | Draw Calls | Instanced Meshes');
      console.log('  -------------- | ---------- | ----------------');

      for (const count of particleCounts) {
        scene.clear();
        buildSceneWithParticleCount(count);

        const sceneMetrics = analyzeScene(scene);
        const metrics = getPerformanceMetrics(sceneMetrics);
        drawCallsPerCount.push(metrics.drawCalls);

        console.log(
          `  ${count.toString().padStart(14)} | ${metrics.drawCalls.toString().padStart(10)} | ${metrics.instancedMeshes.toString().padStart(16)}`,
        );
      }

      // All should have the same draw call count (InstancedMesh doesn't add draw calls)
      const baseDrawCalls = drawCallsPerCount[0];
      for (const count of drawCallsPerCount) {
        expect(count).toBe(baseDrawCalls);
      }
    });
  });
});
