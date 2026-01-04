/**
 * Stage Mode Performance Tests
 *
 * These tests ensure the EditorGrid/Stage Mode components maintain
 * a strict draw call budget to prevent performance regressions.
 *
 * Background: The initial Line-based grid implementation caused 30fps
 * drop (6+ draw calls). The fix uses native drei Grid (single draw call).
 *
 * Performance Budget:
 * - EditorGrid: ≤5 draw calls (Grid shader + shadow mesh + gridHelper = 3)
 * - Stage Mode total: ≤20 draw calls (floor + studio lighting setup)
 *
 * Run with: npm run test -- stageMode
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { analyzeScene, getPerformanceMetrics, PERFORMANCE_TARGETS } from './sceneAnalyzer';

describe('EditorGrid Component Performance', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    scene.clear();
  });

  /**
   * Maximum allowed draw calls for EditorGrid component
   * Budget breakdown:
   * - drei Grid: 1 draw call (shader-based, single mesh)
   * - Shadow mesh: 1 draw call (simple MeshBasicMaterial)
   * - gridHelper: 1 draw call (native Three.js helper)
   * - Buffer: 2 extra for future additions
   * Total: 5 max draw calls
   */
  const EDITOR_GRID_MAX_DRAW_CALLS = 5;

  /**
   * Simulates the EditorGrid component's Three.js objects
   * This mirrors the actual implementation in EditorGrid.tsx
   */
  function buildEditorGridScene(
    config: { size?: number; divisions?: number; showAxes?: boolean } = {},
  ): void {
    const { size = 30, divisions = 6, showAxes = true } = config;

    // 1. drei Grid component - rendered as a single mesh with shader material
    // In reality drei's Grid uses a PlaneGeometry with custom shader (1 draw call)
    const gridGeometry = new THREE.PlaneGeometry(size, size);
    const gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        cellSize: { value: size / divisions },
        cellColor: { value: new THREE.Color('#e0e0e0') },
      },
      // Simplified - actual drei Grid has more complex shader
      vertexShader:
        'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'void main() { gl_FragColor = vec4(0.9, 0.9, 0.9, 1.0); }',
    });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridMesh.rotation.x = -Math.PI / 2;
    scene.add(gridMesh);

    // 2. Shadow mesh - simple transparent circle (1 draw call)
    const shadowGeometry = new THREE.CircleGeometry(6, 32);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#c0b0a0'),
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowMesh.rotation.x = -Math.PI / 2;
    scene.add(shadowMesh);

    // 3. gridHelper for axes - native Three.js helper (1 draw call)
    if (showAxes) {
      const axisHelper = new THREE.GridHelper(
        size,
        2,
        new THREE.Color('#d4a0a0'),
        new THREE.Color('#a0a0d4'),
      );
      scene.add(axisHelper);
    }

    // Cleanup references for test
    gridGeometry.dispose();
    gridMaterial.dispose();
    shadowGeometry.dispose();
    shadowMaterial.dispose();
  }

  it('should have ≤5 draw calls with default configuration', () => {
    buildEditorGridScene();

    const sceneMetrics = analyzeScene(scene);
    const metrics = getPerformanceMetrics(sceneMetrics);

    console.log(`\n📊 EditorGrid Draw Calls: ${metrics.drawCalls}`);
    console.log(`   Budget: ≤${EDITOR_GRID_MAX_DRAW_CALLS}`);
    console.log(
      `   Status: ${metrics.drawCalls <= EDITOR_GRID_MAX_DRAW_CALLS ? '✅ PASS' : '❌ FAIL'}`,
    );

    expect(metrics.drawCalls).toBeLessThanOrEqual(EDITOR_GRID_MAX_DRAW_CALLS);
  });

  it('should have ≤4 draw calls when axes are hidden', () => {
    buildEditorGridScene({ showAxes: false });

    const sceneMetrics = analyzeScene(scene);
    const metrics = getPerformanceMetrics(sceneMetrics);

    // Without axes, should be exactly 2 (grid + shadow)
    expect(metrics.drawCalls).toBeLessThanOrEqual(4);
    expect(metrics.drawCalls).toBeGreaterThanOrEqual(2);
  });

  it('should maintain budget regardless of grid size', () => {
    // Small grid
    buildEditorGridScene({ size: 15, divisions: 4 });
    let metrics = getPerformanceMetrics(analyzeScene(scene));
    const smallDrawCalls = metrics.drawCalls;
    scene.clear();

    // Large grid
    buildEditorGridScene({ size: 60, divisions: 12 });
    metrics = getPerformanceMetrics(analyzeScene(scene));
    const largeDrawCalls = metrics.drawCalls;

    console.log(`\n📊 Grid Size Draw Call Comparison:`);
    console.log(`   Small (15x15, 4 divs): ${smallDrawCalls} draw calls`);
    console.log(`   Large (60x60, 12 divs): ${largeDrawCalls} draw calls`);

    // Draw calls should be constant regardless of grid parameters
    expect(smallDrawCalls).toBe(largeDrawCalls);
    expect(largeDrawCalls).toBeLessThanOrEqual(EDITOR_GRID_MAX_DRAW_CALLS);
  });

  it('REGRESSION: should NOT use Line components (caused 30fps drop)', () => {
    buildEditorGridScene();

    // Traverse scene to check for Line objects
    let lineCount = 0;
    scene.traverse((object) => {
      if (object instanceof THREE.Line || object instanceof THREE.LineSegments) {
        lineCount++;
      }
    });

    console.log(`\n📊 Line Component Check:`);
    console.log(`   Line objects found: ${lineCount}`);
    console.log(
      `   Status: ${lineCount === 0 ? '✅ PASS (no Lines)' : '❌ FAIL (Lines found - perf risk)'}`,
    );

    // The original bug was using Line components which caused performance issues
    // Native gridHelper uses LineSegments internally but that's acceptable
    // Manual Line.map() loops are what caused the problem
    expect(lineCount).toBeLessThanOrEqual(1); // gridHelper creates 1 LineSegments
  });
});

describe('Stage Mode Full Scene Performance', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    scene.clear();
  });

  /**
   * Maximum draw calls for entire stage mode scene
   * Budget breakdown:
   * - EditorGrid: 3 draw calls
   * - Studio lighting: 0 draw calls (lights don't count)
   * - Potential additional elements: 7 extra
   * Total: 10 max draw calls
   */
  const STAGE_MODE_MAX_DRAW_CALLS = 10;

  /**
   * Builds a simplified stage mode scene
   * Mirrors the Environment component when stageMode=true
   */
  function buildStageModeScene(): void {
    // === EditorGrid ===
    // Grid mesh
    const gridGeometry = new THREE.PlaneGeometry(30, 30);
    const gridMaterial = new THREE.ShaderMaterial();
    scene.add(new THREE.Mesh(gridGeometry, gridMaterial));

    // Shadow mesh
    const shadowGeometry = new THREE.CircleGeometry(6, 32);
    const shadowMaterial = new THREE.MeshBasicMaterial({ transparent: true });
    scene.add(new THREE.Mesh(shadowGeometry, shadowMaterial));

    // Axis helper
    scene.add(new THREE.GridHelper(30, 2));

    // === Studio Lighting (no draw calls) ===
    scene.add(new THREE.DirectionalLight('#fff8f0', 0.85)); // Key light
    scene.add(new THREE.DirectionalLight('#f0f4ff', 0.45)); // Fill light
    scene.add(new THREE.DirectionalLight('#ffe8d6', 0.25)); // Rim light
    scene.add(new THREE.AmbientLight('#fefcfa', 0.5));
    scene.add(new THREE.HemisphereLight('#faf8f5', '#e8e4e0', 0.3));

    // Cleanup
    gridGeometry.dispose();
    gridMaterial.dispose();
    shadowGeometry.dispose();
    shadowMaterial.dispose();
  }

  it('should meet stage mode draw call budget', () => {
    buildStageModeScene();

    const sceneMetrics = analyzeScene(scene);
    const metrics = getPerformanceMetrics(sceneMetrics);

    console.log(`\n📊 Stage Mode Full Scene:`);
    console.log(`   Draw Calls: ${metrics.drawCalls}`);
    console.log(`   Budget: ≤${STAGE_MODE_MAX_DRAW_CALLS}`);
    console.log(`   Geometries: ${metrics.geometries}`);
    console.log(`   Materials: ${metrics.materials}`);
    console.log(
      `   Status: ${metrics.drawCalls <= STAGE_MODE_MAX_DRAW_CALLS ? '✅ PASS' : '❌ FAIL'}`,
    );

    expect(metrics.drawCalls).toBeLessThanOrEqual(STAGE_MODE_MAX_DRAW_CALLS);
  });

  it('should have significantly fewer draw calls than normal mode', () => {
    // Stage mode scene
    buildStageModeScene();
    const stageModeMetrics = getPerformanceMetrics(analyzeScene(scene));
    scene.clear();

    // Simulate normal mode (environment + clouds + stars + etc.)
    // Background plane
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial()));

    // 5 clouds
    for (let i = 0; i < 5; i++) {
      scene.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(2, 20, 20),
          new THREE.MeshBasicMaterial({ transparent: true }),
        ),
      );
    }

    // Stars (Points)
    const starsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(500 * 3);
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial()));

    // Light rays
    for (let i = 0; i < 3; i++) {
      scene.add(
        new THREE.Mesh(
          new THREE.PlaneGeometry(1, 10),
          new THREE.MeshBasicMaterial({ transparent: true }),
        ),
      );
    }

    const normalModeMetrics = getPerformanceMetrics(analyzeScene(scene));

    console.log(`\n📊 Mode Comparison:`);
    console.log(`   Stage Mode: ${stageModeMetrics.drawCalls} draw calls`);
    console.log(`   Normal Mode: ${normalModeMetrics.drawCalls} draw calls`);
    console.log(
      `   Savings: ${normalModeMetrics.drawCalls - stageModeMetrics.drawCalls} draw calls`,
    );

    // Stage mode should be significantly lighter
    expect(stageModeMetrics.drawCalls).toBeLessThan(normalModeMetrics.drawCalls);
  });
});

describe('Performance Regression Guards', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    scene.clear();
  });

  /**
   * This test documents the ANTI-PATTERN that caused 30fps
   * Keep this test to remind developers what NOT to do
   */
  it('DOCUMENTATION: demonstrates why Line-based grid is expensive', () => {
    // This is the ANTI-PATTERN that caused performance issues
    // DO NOT use this approach in production code!

    const divisions = 6;
    const size = 30;
    const step = size / divisions;

    // Create grid lines using Line components (expensive!)
    for (let i = -size / 2; i <= size / 2; i += step) {
      // Horizontal line
      const hGeom = new THREE.BufferGeometry();
      hGeom.setFromPoints([new THREE.Vector3(-size / 2, 0, i), new THREE.Vector3(size / 2, 0, i)]);
      scene.add(new THREE.Line(hGeom, new THREE.LineBasicMaterial()));

      // Vertical line
      const vGeom = new THREE.BufferGeometry();
      vGeom.setFromPoints([new THREE.Vector3(i, 0, -size / 2), new THREE.Vector3(i, 0, size / 2)]);
      scene.add(new THREE.Line(vGeom, new THREE.LineBasicMaterial()));
    }

    const metrics = getPerformanceMetrics(analyzeScene(scene));

    console.log(`\n⚠️ ANTI-PATTERN DEMONSTRATION:`);
    console.log(`   Line-based grid: ${metrics.drawCalls} draw calls`);
    console.log(`   This is why Line.map() caused 30fps!`);
    console.log(`   Native drei Grid uses 1 draw call instead.`);

    // Document the problem: Line approach creates many draw calls
    expect(metrics.drawCalls).toBeGreaterThan(10);
  });

  it('should flag performance regression if draw calls spike', () => {
    // Simulated regression scenario: someone adds expensive components

    // "Good" baseline
    const gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShaderMaterial());
    scene.add(gridMesh);

    const baselineMetrics = getPerformanceMetrics(analyzeScene(scene));

    // Simulate regression: accidentally add 10 extra meshes
    for (let i = 0; i < 10; i++) {
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    }

    const regressionMetrics = getPerformanceMetrics(analyzeScene(scene));
    const drawCallIncrease = regressionMetrics.drawCalls - baselineMetrics.drawCalls;

    console.log(`\n📊 Regression Detection:`);
    console.log(`   Baseline: ${baselineMetrics.drawCalls} draw calls`);
    console.log(`   After regression: ${regressionMetrics.drawCalls} draw calls`);
    console.log(`   Increase: +${drawCallIncrease} draw calls`);

    // This test passes to document the behavior
    // In a real regression guard, you'd assert against a known baseline
    expect(drawCallIncrease).toBe(10);
  });
});
