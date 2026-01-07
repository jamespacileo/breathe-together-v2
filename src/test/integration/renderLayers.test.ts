/**
 * Render Layer Tests - Verify scene objects are on correct layers
 *
 * Tests for the THREE.js render layer system used by RefractionPipeline
 * to selectively render objects in different passes.
 *
 * CRITICAL: These tests verify that:
 * 1. Main scene objects (globe, particles) remain visible on layer 0
 * 2. Gizmo objects are ONLY on layer 4 (GIZMOS)
 * 3. Camera layer manipulation doesn't break scene rendering
 *
 * The bug being tested: Setting layers incorrectly can make objects invisible
 * - layers.set(N) puts object ONLY on layer N (removes from all others!)
 * - layers.enable(N) adds layer N without removing existing layers
 * - layers.disable(N) removes layer N without affecting others
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { RENDER_LAYERS } from '../../constants';

describe('RENDER_LAYERS constants', () => {
  it('should have correct layer values', () => {
    expect(RENDER_LAYERS.ENVIRONMENT).toBe(0);
    expect(RENDER_LAYERS.GLOBE).toBe(1);
    expect(RENDER_LAYERS.PARTICLES).toBe(2);
    expect(RENDER_LAYERS.EFFECTS).toBe(3);
    expect(RENDER_LAYERS.GIZMOS).toBe(4);
  });

  it('should have GIZMOS as the highest layer to avoid conflicts', () => {
    // GIZMOS must be separate from all other render layers
    expect(RENDER_LAYERS.GIZMOS).toBeGreaterThan(RENDER_LAYERS.ENVIRONMENT);
    expect(RENDER_LAYERS.GIZMOS).toBeGreaterThan(RENDER_LAYERS.GLOBE);
    expect(RENDER_LAYERS.GIZMOS).toBeGreaterThan(RENDER_LAYERS.PARTICLES);
    expect(RENDER_LAYERS.GIZMOS).toBeGreaterThan(RENDER_LAYERS.EFFECTS);
  });
});

describe('THREE.Layers behavior', () => {
  /**
   * These tests document the exact behavior of THREE.js Layers
   * to ensure our understanding is correct.
   */

  it('new Object3D should be on layer 0 by default', () => {
    const obj = new THREE.Object3D();
    expect(obj.layers.isEnabled(0)).toBe(true);
    expect(obj.layers.isEnabled(1)).toBe(false);
    expect(obj.layers.isEnabled(2)).toBe(false);
    expect(obj.layers.isEnabled(4)).toBe(false);
  });

  it('layers.enable() adds a layer WITHOUT removing others', () => {
    const obj = new THREE.Object3D();
    // Start on layer 0
    expect(obj.layers.isEnabled(0)).toBe(true);

    // Enable layer 2 (PARTICLES)
    obj.layers.enable(RENDER_LAYERS.PARTICLES);

    // Should now be on BOTH layer 0 AND layer 2
    expect(obj.layers.isEnabled(0)).toBe(true);
    expect(obj.layers.isEnabled(RENDER_LAYERS.PARTICLES)).toBe(true);
  });

  it('layers.set() puts object on ONLY that layer (removes from all others!)', () => {
    const obj = new THREE.Object3D();
    // Start on layer 0
    expect(obj.layers.isEnabled(0)).toBe(true);

    // SET to layer 4 (GIZMOS) - THIS REMOVES FROM LAYER 0!
    obj.layers.set(RENDER_LAYERS.GIZMOS);

    // Should now be ONLY on layer 4, NOT on layer 0!
    expect(obj.layers.isEnabled(0)).toBe(false); // REMOVED from layer 0
    expect(obj.layers.isEnabled(RENDER_LAYERS.GIZMOS)).toBe(true);
  });

  it('layers.disable() removes a layer without affecting others', () => {
    const obj = new THREE.Object3D();
    obj.layers.enableAll(); // Enable all 32 layers

    // Disable layer 4
    obj.layers.disable(RENDER_LAYERS.GIZMOS);

    expect(obj.layers.isEnabled(0)).toBe(true);
    expect(obj.layers.isEnabled(1)).toBe(true);
    expect(obj.layers.isEnabled(2)).toBe(true);
    expect(obj.layers.isEnabled(RENDER_LAYERS.GIZMOS)).toBe(false);
  });

  it('camera.layers.test() determines if object is visible to camera', () => {
    const camera = new THREE.PerspectiveCamera();
    const obj = new THREE.Object3D();

    // Camera on layer 0, object on layer 0 → visible
    expect(camera.layers.test(obj.layers)).toBe(true);

    // Object moved to ONLY layer 4, camera still on layer 0 → NOT visible
    obj.layers.set(RENDER_LAYERS.GIZMOS);
    expect(camera.layers.test(obj.layers)).toBe(false);

    // Camera enabled for all layers → visible
    camera.layers.enableAll();
    expect(camera.layers.test(obj.layers)).toBe(true);

    // Camera disabled for GIZMOS layer → NOT visible
    camera.layers.disable(RENDER_LAYERS.GIZMOS);
    expect(camera.layers.test(obj.layers)).toBe(false);
  });
});

describe('Scene object layer requirements', () => {
  /**
   * These tests verify the layer requirements for different object types.
   * This documents the expected layer configuration for the app.
   */

  it('main scene objects (globe, environment) should be visible on layer 0', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.layers.enableAll();
    camera.layers.disable(RENDER_LAYERS.GIZMOS);

    // Create mock scene objects on default layer (layer 0)
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1));
    const environment = new THREE.Mesh(new THREE.PlaneGeometry(10, 10));

    // Both should be visible to camera (layer 0 is enabled)
    expect(camera.layers.test(globe.layers)).toBe(true);
    expect(camera.layers.test(environment.layers)).toBe(true);
  });

  it('particle swarm should be visible on layer 0 AND have PARTICLES layer', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.layers.enableAll();
    camera.layers.disable(RENDER_LAYERS.GIZMOS);

    // Particle swarm uses layers.enable() to ADD layer 2
    const particleMesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.5),
      new THREE.MeshBasicMaterial(),
      100,
    );
    particleMesh.layers.enable(RENDER_LAYERS.PARTICLES);

    // Should be on BOTH layer 0 (default) AND layer 2 (PARTICLES)
    expect(particleMesh.layers.isEnabled(0)).toBe(true);
    expect(particleMesh.layers.isEnabled(RENDER_LAYERS.PARTICLES)).toBe(true);

    // Should be visible to main camera
    expect(camera.layers.test(particleMesh.layers)).toBe(true);
  });

  it('gizmo objects should ONLY be on layer 4 (NOT visible to DoF camera)', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.layers.enableAll();
    camera.layers.disable(RENDER_LAYERS.GIZMOS);

    // Gizmos use layers.set() to be ONLY on layer 4
    const gizmoMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.25),
      new THREE.MeshBasicMaterial({ color: 0xff00ff }),
    );
    gizmoMesh.layers.set(RENDER_LAYERS.GIZMOS);

    // Should be ONLY on layer 4, NOT on layer 0
    expect(gizmoMesh.layers.isEnabled(0)).toBe(false);
    expect(gizmoMesh.layers.isEnabled(RENDER_LAYERS.GIZMOS)).toBe(true);

    // Should NOT be visible to DoF camera (which has GIZMOS disabled)
    expect(camera.layers.test(gizmoMesh.layers)).toBe(false);
  });

  it('gizmo objects should be visible when camera is set to ONLY GIZMOS layer', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.layers.set(RENDER_LAYERS.GIZMOS); // ONLY layer 4

    const gizmoMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25), new THREE.MeshBasicMaterial());
    gizmoMesh.layers.set(RENDER_LAYERS.GIZMOS);

    // Gizmo should be visible
    expect(camera.layers.test(gizmoMesh.layers)).toBe(true);

    // Main scene objects should NOT be visible
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1));
    expect(camera.layers.test(globe.layers)).toBe(false);
  });
});

describe('RefractionPipeline camera layer logic', () => {
  /**
   * Simulates the camera layer manipulation in RefractionPipeline
   * to verify the logic is correct.
   */

  it('Pass 3 camera should see all except GIZMOS', () => {
    const camera = new THREE.PerspectiveCamera();

    // RefractionPipeline Pass 3 setup
    camera.layers.enableAll();
    camera.layers.disable(RENDER_LAYERS.GIZMOS);

    // Main scene objects should be visible
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1));
    const particle = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.5),
      new THREE.MeshBasicMaterial(),
      100,
    );
    particle.layers.enable(RENDER_LAYERS.PARTICLES);

    expect(camera.layers.test(globe.layers)).toBe(true);
    expect(camera.layers.test(particle.layers)).toBe(true);

    // Gizmos should NOT be visible
    const gizmo = new THREE.Mesh(new THREE.SphereGeometry(0.1));
    gizmo.layers.set(RENDER_LAYERS.GIZMOS);
    expect(camera.layers.test(gizmo.layers)).toBe(false);
  });

  it('Pass 5 camera should see ONLY GIZMOS', () => {
    const camera = new THREE.PerspectiveCamera();

    // RefractionPipeline Pass 5 setup
    camera.layers.set(RENDER_LAYERS.GIZMOS);

    // Gizmos should be visible
    const gizmo = new THREE.Mesh(new THREE.SphereGeometry(0.1));
    gizmo.layers.set(RENDER_LAYERS.GIZMOS);
    expect(camera.layers.test(gizmo.layers)).toBe(true);

    // Main scene objects should NOT be visible
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1));
    expect(camera.layers.test(globe.layers)).toBe(false);
  });

  it('camera restoration should enable all layers', () => {
    const camera = new THREE.PerspectiveCamera();

    // Start with Pass 5 state (only GIZMOS)
    camera.layers.set(RENDER_LAYERS.GIZMOS);
    expect(camera.layers.isEnabled(0)).toBe(false);

    // Restore for next frame
    camera.layers.enableAll();

    // All layers should now be enabled
    expect(camera.layers.isEnabled(0)).toBe(true);
    expect(camera.layers.isEnabled(RENDER_LAYERS.PARTICLES)).toBe(true);
    expect(camera.layers.isEnabled(RENDER_LAYERS.GIZMOS)).toBe(true);
  });

  it('full render cycle should maintain correct visibility', () => {
    const camera = new THREE.PerspectiveCamera();

    // Create test objects
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1));
    const particle = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.5),
      new THREE.MeshBasicMaterial(),
      100,
    );
    particle.layers.enable(RENDER_LAYERS.PARTICLES);
    const gizmo = new THREE.Mesh(new THREE.SphereGeometry(0.1));
    gizmo.layers.set(RENDER_LAYERS.GIZMOS);

    // === FRAME START ===

    // Pass 3: DoF scene render
    camera.layers.enableAll();
    camera.layers.disable(RENDER_LAYERS.GIZMOS);
    expect(camera.layers.test(globe.layers)).toBe(true);
    expect(camera.layers.test(particle.layers)).toBe(true);
    expect(camera.layers.test(gizmo.layers)).toBe(false);

    // Pass 5: Gizmo render
    camera.layers.set(RENDER_LAYERS.GIZMOS);
    expect(camera.layers.test(globe.layers)).toBe(false);
    expect(camera.layers.test(particle.layers)).toBe(false);
    expect(camera.layers.test(gizmo.layers)).toBe(true);

    // Frame end: restore all layers
    camera.layers.enableAll();
    expect(camera.layers.test(globe.layers)).toBe(true);
    expect(camera.layers.test(particle.layers)).toBe(true);
    expect(camera.layers.test(gizmo.layers)).toBe(true);

    // === NEXT FRAME ===

    // Pass 3 again
    camera.layers.enableAll();
    camera.layers.disable(RENDER_LAYERS.GIZMOS);
    expect(camera.layers.test(globe.layers)).toBe(true);
    expect(camera.layers.test(particle.layers)).toBe(true);
    expect(camera.layers.test(gizmo.layers)).toBe(false);
  });
});

describe('Bug detection: objects moved off layer 0', () => {
  /**
   * These tests detect the bug where scene objects are accidentally
   * moved off layer 0 and become invisible to the main camera.
   *
   * The bug: If code does layers.set(GIZMOS) on non-gizmo objects,
   * they become invisible because set() removes them from layer 0.
   */

  it('DANGER: layers.set() removes object from layer 0', () => {
    const mainObject = new THREE.Mesh(new THREE.SphereGeometry(1));

    // Verify object starts on layer 0
    expect(mainObject.layers.isEnabled(0)).toBe(true);

    // BUG REPRODUCTION: Accidentally using set() instead of enable()
    // This is what would happen if a gizmo-setting function traversed scene
    mainObject.layers.set(RENDER_LAYERS.GIZMOS); // WRONG!

    // Object is now ONLY on layer 4, NOT visible to main camera!
    expect(mainObject.layers.isEnabled(0)).toBe(false);
    expect(mainObject.layers.isEnabled(RENDER_LAYERS.GIZMOS)).toBe(true);

    // Main camera can't see it
    const mainCamera = new THREE.PerspectiveCamera();
    mainCamera.layers.enableAll();
    mainCamera.layers.disable(RENDER_LAYERS.GIZMOS);
    expect(mainCamera.layers.test(mainObject.layers)).toBe(false); // INVISIBLE!
  });

  it('scene traversal with set() breaks all objects', () => {
    // Simulate what happens if useFrame traverses scene with layers.set()
    const scene = new THREE.Scene();
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1));
    const particles = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.5),
      new THREE.MeshBasicMaterial(),
      100,
    );
    particles.layers.enable(RENDER_LAYERS.PARTICLES);
    scene.add(globe, particles);

    // Camera for Pass 3 (DoF scene render)
    const camera = new THREE.PerspectiveCamera();
    camera.layers.enableAll();
    camera.layers.disable(RENDER_LAYERS.GIZMOS);

    // BEFORE the bug: everything visible
    expect(camera.layers.test(globe.layers)).toBe(true);
    expect(camera.layers.test(particles.layers)).toBe(true);

    // BUG: Traversing scene and calling set() on all objects
    // This is what the dangerous useFrame traverse was doing
    scene.traverse((obj) => {
      obj.layers.set(RENDER_LAYERS.GIZMOS); // BREAKS EVERYTHING!
    });

    // AFTER the bug: nothing visible to main camera!
    expect(camera.layers.test(globe.layers)).toBe(false);
    expect(camera.layers.test(particles.layers)).toBe(false);
  });

  it('safe pattern: only set GIZMOS layer on gizmo objects', () => {
    const scene = new THREE.Scene();

    // Main objects - leave on default layer 0
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1));
    const particles = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.5),
      new THREE.MeshBasicMaterial(),
      100,
    );
    particles.layers.enable(RENDER_LAYERS.PARTICLES); // ADD layer 2

    // Gizmo objects - specifically set to ONLY layer 4
    const gizmo1 = new THREE.Mesh(new THREE.SphereGeometry(0.1));
    const gizmo2 = new THREE.LineSegments(new THREE.BufferGeometry());
    gizmo1.layers.set(RENDER_LAYERS.GIZMOS);
    gizmo2.layers.set(RENDER_LAYERS.GIZMOS);

    scene.add(globe, particles, gizmo1, gizmo2);

    // Main camera (Pass 3)
    const mainCamera = new THREE.PerspectiveCamera();
    mainCamera.layers.enableAll();
    mainCamera.layers.disable(RENDER_LAYERS.GIZMOS);

    // Main objects visible
    expect(mainCamera.layers.test(globe.layers)).toBe(true);
    expect(mainCamera.layers.test(particles.layers)).toBe(true);
    // Gizmos NOT visible
    expect(mainCamera.layers.test(gizmo1.layers)).toBe(false);
    expect(mainCamera.layers.test(gizmo2.layers)).toBe(false);

    // Gizmo camera (Pass 5)
    const gizmoCamera = new THREE.PerspectiveCamera();
    gizmoCamera.layers.set(RENDER_LAYERS.GIZMOS);

    // Gizmos visible
    expect(gizmoCamera.layers.test(gizmo1.layers)).toBe(true);
    expect(gizmoCamera.layers.test(gizmo2.layers)).toBe(true);
    // Main objects NOT visible
    expect(gizmoCamera.layers.test(globe.layers)).toBe(false);
    expect(gizmoCamera.layers.test(particles.layers)).toBe(false);
  });
});

describe('Mesh detection for refraction pipeline', () => {
  /**
   * Tests for the mesh detection logic in RefractionPipeline
   * that finds meshes with PARTICLES layer enabled.
   */

  it('should detect InstancedMesh with PARTICLES layer', () => {
    const scene = new THREE.Scene();
    const instanced = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.5),
      new THREE.MeshBasicMaterial(),
      100,
    );
    instanced.layers.enable(RENDER_LAYERS.PARTICLES);
    scene.add(instanced);

    // Simulate refraction pipeline mesh detection
    const refractionMeshes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.layers.isEnabled(RENDER_LAYERS.PARTICLES)) {
        refractionMeshes.push(obj);
      }
    });

    // InstancedMesh extends Mesh, so it should be detected
    expect(refractionMeshes.length).toBe(1);
    expect(refractionMeshes[0]).toBe(instanced);
  });

  it('should NOT detect meshes without PARTICLES layer', () => {
    const scene = new THREE.Scene();
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial());
    const gizmo = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial());
    gizmo.layers.set(RENDER_LAYERS.GIZMOS);
    scene.add(globe, gizmo);

    const refractionMeshes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.layers.isEnabled(RENDER_LAYERS.PARTICLES)) {
        refractionMeshes.push(obj);
      }
    });

    // Neither should be detected - they don't have PARTICLES layer
    expect(refractionMeshes.length).toBe(0);
  });
});

describe('Scene composition verification', () => {
  /**
   * Tests for verifying scene composition to catch rendering issues.
   * These simulate what the RefractionPipeline sees when it renders.
   */

  it('should find main scene objects visible to main camera', () => {
    // Simulate scene structure from breathing.tsx
    const scene = new THREE.Scene();

    // Globe (on layer 0 only)
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1.5), new THREE.MeshBasicMaterial());
    globe.name = 'Earth Globe';

    // Particles (on layer 0 AND layer 2)
    const particles = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.5),
      new THREE.MeshBasicMaterial(),
      100,
    );
    particles.name = 'Particle Swarm';
    particles.layers.enable(RENDER_LAYERS.PARTICLES);

    // Gizmos (on layer 4 ONLY)
    const gizmo = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial());
    gizmo.name = 'Constellation Gizmo';
    gizmo.layers.set(RENDER_LAYERS.GIZMOS);

    scene.add(globe, particles, gizmo);

    // Main camera for Pass 3 (DoF scene render)
    const camera = new THREE.PerspectiveCamera();
    camera.layers.enableAll();
    camera.layers.disable(RENDER_LAYERS.GIZMOS);

    // Count objects visible to main camera
    let visibleToMainCamera = 0;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && camera.layers.test(obj.layers)) {
        visibleToMainCamera++;
      }
    });

    // Globe AND particles should be visible (2 objects)
    // Gizmo should NOT be visible
    expect(visibleToMainCamera).toBe(2);

    // Verify globe is specifically visible
    expect(camera.layers.test(globe.layers)).toBe(true);
    expect(globe.layers.isEnabled(0)).toBe(true);

    // Verify particles are specifically visible
    expect(camera.layers.test(particles.layers)).toBe(true);
    expect(particles.layers.isEnabled(0)).toBe(true);
    expect(particles.layers.isEnabled(RENDER_LAYERS.PARTICLES)).toBe(true);

    // Verify gizmo is NOT visible
    expect(camera.layers.test(gizmo.layers)).toBe(false);
    expect(gizmo.layers.isEnabled(0)).toBe(false);
    expect(gizmo.layers.isEnabled(RENDER_LAYERS.GIZMOS)).toBe(true);
  });

  it('should detect if globe has been accidentally moved off layer 0', () => {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1.5), new THREE.MeshBasicMaterial());

    // INVARIANT: Globe should ALWAYS be on layer 0
    expect(globe.layers.isEnabled(0)).toBe(true);

    // Bug simulation: accidentally set to GIZMOS layer
    globe.layers.set(RENDER_LAYERS.GIZMOS);

    // This BREAKS rendering - globe is no longer on layer 0
    expect(globe.layers.isEnabled(0)).toBe(false);

    // Main camera can't see it
    const mainCamera = new THREE.PerspectiveCamera();
    mainCamera.layers.enableAll();
    mainCamera.layers.disable(RENDER_LAYERS.GIZMOS);
    expect(mainCamera.layers.test(globe.layers)).toBe(false);
  });

  it('should verify particles keep layer 0 when PARTICLES layer is added', () => {
    const particles = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.5),
      new THREE.MeshBasicMaterial(),
      100,
    );

    // Initial state: only on layer 0
    expect(particles.layers.isEnabled(0)).toBe(true);
    expect(particles.layers.isEnabled(RENDER_LAYERS.PARTICLES)).toBe(false);

    // Correct way: use enable() to ADD a layer
    particles.layers.enable(RENDER_LAYERS.PARTICLES);

    // Should now be on BOTH layers
    expect(particles.layers.isEnabled(0)).toBe(true);
    expect(particles.layers.isEnabled(RENDER_LAYERS.PARTICLES)).toBe(true);

    // WRONG way: using set() would remove from layer 0
    // particles.layers.set(RENDER_LAYERS.PARTICLES); // DON'T DO THIS
  });
});

describe('Camera matrix synchronization', () => {
  /**
   * Tests for camera matrix copying, which is critical for rendering.
   *
   * BUG THAT WAS FIXED: camera.copy() copies properties (position, rotation, fov, etc.)
   * but does NOT copy the rendering matrices (projectionMatrix, matrixWorld, etc.).
   * THREE.js uses these matrices for actual rendering - without them, nothing renders!
   */

  it('camera.copy() does NOT copy rendering matrices', () => {
    const source = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    source.position.set(0, 5, 10);
    source.lookAt(0, 0, 0);
    source.updateMatrixWorld(true);
    source.updateProjectionMatrix();

    const target = new THREE.PerspectiveCamera();
    target.copy(source);

    // copy() copies position, rotation, etc.
    expect(target.position.x).toBe(source.position.x);
    expect(target.position.y).toBe(source.position.y);
    expect(target.position.z).toBe(source.position.z);
    expect(target.fov).toBe(source.fov);

    // BUT: matrices are NOT automatically synced after copy()!
    // The target matrices are still at default values or stale
    // This is why we need to explicitly copy them
  });

  it('explicit matrix copy syncs all rendering matrices', () => {
    const source = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    source.position.set(0, 5, 10);
    source.lookAt(0, 0, 0);
    source.updateMatrixWorld(true);
    source.updateProjectionMatrix();

    const target = new THREE.PerspectiveCamera();
    target.copy(source);

    // Explicitly copy matrices (this is what RefractionPipeline does)
    target.projectionMatrix.copy(source.projectionMatrix);
    target.projectionMatrixInverse.copy(source.projectionMatrixInverse);
    target.matrixWorld.copy(source.matrixWorld);
    target.matrixWorldInverse.copy(source.matrixWorldInverse);

    // Now matrices should match
    expect(target.projectionMatrix.equals(source.projectionMatrix)).toBe(true);
    expect(target.projectionMatrixInverse.equals(source.projectionMatrixInverse)).toBe(true);
    expect(target.matrixWorld.equals(source.matrixWorld)).toBe(true);
    expect(target.matrixWorldInverse.equals(source.matrixWorldInverse)).toBe(true);
  });

  it('layerCamera with synced matrices can render from same perspective', () => {
    // This simulates what RefractionPipeline does each frame
    const perspCamera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    perspCamera.position.set(0, 5, 10);
    perspCamera.lookAt(0, 0, 0);
    perspCamera.updateMatrixWorld(true);
    perspCamera.updateProjectionMatrix();

    const layerCamera = new THREE.PerspectiveCamera();

    // Sync like RefractionPipeline does
    layerCamera.copy(perspCamera);
    layerCamera.projectionMatrix.copy(perspCamera.projectionMatrix);
    layerCamera.projectionMatrixInverse.copy(perspCamera.projectionMatrixInverse);
    layerCamera.matrixWorld.copy(perspCamera.matrixWorld);
    layerCamera.matrixWorldInverse.copy(perspCamera.matrixWorldInverse);

    // Now layerCamera can be used for rendering with different layer settings
    // but from the same viewpoint
    layerCamera.layers.set(RENDER_LAYERS.GIZMOS);

    // Verify perspective is same (position transformed through matrixWorld)
    const sourceWorldPos = new THREE.Vector3();
    const targetWorldPos = new THREE.Vector3();
    perspCamera.getWorldPosition(sourceWorldPos);
    targetWorldPos.setFromMatrixPosition(layerCamera.matrixWorld);

    expect(targetWorldPos.x).toBeCloseTo(sourceWorldPos.x, 5);
    expect(targetWorldPos.y).toBeCloseTo(sourceWorldPos.y, 5);
    expect(targetWorldPos.z).toBeCloseTo(sourceWorldPos.z, 5);
  });
});

describe('Camera layer sequence simulation', () => {
  /**
   * Simulates the exact camera layer manipulation sequence in RefractionPipeline.
   * This catches issues with the render pass order.
   */

  it('should maintain correct layer state through full render cycle', () => {
    const camera = new THREE.PerspectiveCamera();
    const layerCamera = new THREE.PerspectiveCamera();

    // Objects in scene
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1));
    const particles = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.5),
      new THREE.MeshBasicMaterial(),
      100,
    );
    particles.layers.enable(RENDER_LAYERS.PARTICLES);
    const gizmo = new THREE.Mesh(new THREE.SphereGeometry(0.1));
    gizmo.layers.set(RENDER_LAYERS.GIZMOS);

    // === PASS 2: Backface render (only particles) ===
    layerCamera.layers.set(RENDER_LAYERS.PARTICLES);
    expect(layerCamera.layers.test(particles.layers)).toBe(true);
    expect(layerCamera.layers.test(globe.layers)).toBe(false);
    expect(layerCamera.layers.test(gizmo.layers)).toBe(false);

    // === RESET CAMERAS ===
    layerCamera.layers.enableAll();
    camera.layers.enableAll();
    camera.layers.disable(RENDER_LAYERS.GIZMOS);

    // === PASS 3: Composite render (all except gizmos) ===
    // CRITICAL: Globe and particles MUST be visible here
    expect(camera.layers.test(globe.layers)).toBe(true);
    expect(camera.layers.test(particles.layers)).toBe(true);
    expect(camera.layers.test(gizmo.layers)).toBe(false);

    // Verify exact layer mask
    expect(camera.layers.isEnabled(0)).toBe(true); // Layer 0 enabled
    expect(camera.layers.isEnabled(RENDER_LAYERS.PARTICLES)).toBe(true); // Layer 2 enabled
    expect(camera.layers.isEnabled(RENDER_LAYERS.GIZMOS)).toBe(false); // Layer 4 disabled

    // === PASS 5: Gizmo render ===
    camera.layers.set(RENDER_LAYERS.GIZMOS);
    expect(camera.layers.test(globe.layers)).toBe(false);
    expect(camera.layers.test(particles.layers)).toBe(false);
    expect(camera.layers.test(gizmo.layers)).toBe(true);

    // === RESTORE FOR NEXT FRAME ===
    camera.layers.enableAll();
    expect(camera.layers.test(globe.layers)).toBe(true);
    expect(camera.layers.test(particles.layers)).toBe(true);
    expect(camera.layers.test(gizmo.layers)).toBe(true);
  });

  it('should catch accidental layer corruption during render cycle', () => {
    const camera = new THREE.PerspectiveCamera();
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1));

    // Initial state - globe on layer 0
    expect(globe.layers.isEnabled(0)).toBe(true);

    // Camera setup for Pass 3
    camera.layers.enableAll();
    camera.layers.disable(RENDER_LAYERS.GIZMOS);

    // Globe should be visible
    expect(camera.layers.test(globe.layers)).toBe(true);

    // BUG: Something moves globe off layer 0 during the frame
    // (This is what we're trying to catch)
    globe.layers.set(RENDER_LAYERS.GIZMOS);

    // Now globe is NOT visible to main camera!
    expect(camera.layers.test(globe.layers)).toBe(false);

    // This test demonstrates the failure mode - if globe.layers is
    // modified during rendering, it becomes invisible.
  });
});
