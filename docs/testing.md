# Testing Guide

This document provides comprehensive guidance for testing **breathe-together-v2**, covering unit tests, integration tests, E2E tests, and visual regression testing.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Architecture](#test-architecture)
- [Test Naming Convention](#test-naming-convention)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Visual Regression Tests](#visual-regression-tests)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test breathCalc.behavior

# Run with coverage report
npm run test:coverage

# Run performance tests only
npm run test:perf

# Run E2E tests
npm run e2e

# Run E2E tests with UI
npm run e2e:ui

# Run visual regression tests
npm run e2e -- visual-regression

# Update visual snapshots (when intentional changes made)
npx playwright test visual-regression --update-snapshots
```

---

## Test Architecture

The test suite is organized by test type and follows modern 2026 best practices:

```
breathe-together-v2/
├── src/
│   ├── test/
│   │   ├── fixtures/               # Reusable test data and scene builders
│   │   │   ├── sceneBuilder.ts     # Scene construction utilities
│   │   │   ├── mockPresence.ts     # Mock presence data generator
│   │   │   └── index.ts
│   │   ├── helpers/                # Test utilities and matchers
│   │   │   ├── colorMatchers.ts    # Color comparison utilities
│   │   │   ├── geometryHelpers.ts  # Three.js geometry helpers
│   │   │   └── ...
│   │   ├── integration/            # Integration tests
│   │   │   ├── components.integration.test.tsx
│   │   │   └── materials.integration.test.ts
│   │   ├── visual/                 # Visual/color validation tests
│   │   │   ├── colorValidation.test.ts
│   │   │   ├── tslMigration.test.ts
│   │   │   └── tslPresets.test.ts
│   │   ├── breathCalc.behavior.test.ts      # BDD tests
│   │   ├── breathCalc.property.test.ts      # Property-based tests
│   │   ├── scenePerformance.analysis.test.ts
│   │   └── ...
│   └── ...
├── e2e/
│   ├── interactions.spec.ts        # Behavioral E2E tests
│   ├── visual-regression.spec.ts   # Visual regression tests
│   └── screenshots.spec.ts         # Screenshot capture
└── worker/
    └── src/
        └── presence.test.ts         # Cloudflare Worker tests
```

---

## Test Naming Convention

All tests follow the `<feature>.<type>.test.ts` pattern for clarity:

### Pattern: `<feature>.<type>.test.ts`

**Type Suffixes:**
- `.behavior.test.ts` - Behavior-Driven Development (BDD) tests
- `.property.test.ts` - Property-based tests (fast-check)
- `.unit.test.ts` - Unit tests
- `.integration.test.ts` - Integration tests
- `.analysis.test.ts` - Performance analysis
- `.regression.test.ts` - Regression tests
- `.spec.ts` - E2E tests (Playwright convention)

**Examples:**
```
breathCalc.behavior.test.ts     # BDD tests for breathing calculation
breathCalc.property.test.ts     # Property-based tests for breathCalc
particleSwarm.unit.test.ts      # Unit tests for ParticleSwarm
components.integration.test.tsx # React component integration tests
scenePerformance.analysis.test.ts # Performance benchmarks
```

**Benefits:**
- ✅ Instantly identify test type
- ✅ Easy filtering: `npm test -- property` (runs all property-based tests)
- ✅ Alphabetical grouping by feature
- ✅ Clear distinction between test strategies

---

## Unit Tests

Unit tests verify individual functions and modules in isolation.

### Running Unit Tests

```bash
npm test                    # Run all tests
npm test breathCalc         # Run specific feature
npm test -- --watch         # Watch mode
```

### Example: Testing Pure Functions

```typescript
// breathCalc.behavior.test.ts
import { describe, expect, it } from 'vitest';
import { calculateBreathState } from '../lib/breathCalc';

describe('Breath Calculation', () => {
  it('cycles through all phases in correct order', () => {
    // OUTCOME: User experiences inhale → hold-in → exhale → (repeat)
    const phases = [
      { time: 2000, expectedType: 0, name: 'mid-inhale' },
      { time: 7500, expectedType: 1, name: 'mid-hold-in' },
      { time: 15000, expectedType: 2, name: 'mid-exhale' },
    ];

    for (const { time, expectedType } of phases) {
      const state = calculateBreathState(time);
      expect(state.phaseType).toBe(expectedType);
    }
  });
});
```

### Using Test Fixtures

```typescript
import { buildBreathingScene } from './fixtures';

it('should create valid scene', () => {
  const scene = new THREE.Scene();
  buildBreathingScene(scene, {
    particleCount: 100,
    useInstancedParticles: true,
  });

  expect(scene.children.length).toBeGreaterThan(0);
});
```

---

## Integration Tests

Integration tests verify components work together correctly.

### Example: Component Rendering

```typescript
// components.integration.test.tsx
import { describe, expect, it } from 'vitest';

describe('Component Integration', () => {
  it('EarthGlobe component can be imported', async () => {
    const module = await import('../../entities/earthGlobe');
    expect(module.EarthGlobe).toBeDefined();
    expect(typeof module.EarthGlobe).toBe('function');
  });

  it('globe material has correct color', () => {
    const globeColor = '#8b6f47';
    const material = new THREE.MeshPhongMaterial({ color: globeColor });

    const actualColor = `#${material.color.getHexString()}`;
    expect(actualColor).toBe(globeColor);

    // Cleanup
    material.dispose();
  });
});
```

**Key Practices:**
- ✅ Always dispose Three.js resources (materials, geometries)
- ✅ Test actual imports, not mocks
- ✅ Verify component exports and type signatures

---

## E2E Tests

End-to-end tests verify the application works in a real browser environment using Playwright.

### Running E2E Tests

```bash
npm run e2e              # Run all E2E tests
npm run e2e:ui           # Run with Playwright UI
npm run e2e:headed       # Run in headed mode (visible browser)
npm run e2e -- interactions  # Run specific test file
```

### Example: Breathing Animation Test

```typescript
// e2e/interactions.spec.ts
import { expect, test } from '@playwright/test';

test('breathing cycle progresses over time', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 30_000 });

  // Wait for initial render
  await page.waitForTimeout(1000);

  const initialPhaseText = await page
    .locator('[data-testid="phase-indicator"]')
    .textContent();

  // Wait for breathing to progress
  await page.waitForTimeout(10_000);

  const currentPhaseText = await page
    .locator('[data-testid="phase-indicator"]')
    .textContent();

  // Phase should have changed
  expect(initialPhaseText).not.toBe(currentPhaseText);
});
```

### Viewport Testing

```typescript
test('responsive layout', async ({ page }) => {
  const viewports = [
    { width: 375, height: 667 },  // Mobile
    { width: 768, height: 1024 }, // Tablet
    { width: 1920, height: 1080 }, // Desktop
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const canvas = await page.locator('canvas').boundingBox();
    expect(canvas!.width).toBeLessThanOrEqual(viewport.width);
  }
});
```

---

## Visual Regression Tests

Visual regression tests catch unintended UI changes by comparing screenshots.

### Running Visual Tests

```bash
# Run visual regression tests
npm run e2e -- visual-regression

# Update snapshots after intentional changes
npx playwright test visual-regression --update-snapshots

# Update specific snapshot
npx playwright test visual-regression --update-snapshots -g "breathing scene"
```

### Example: Visual Comparison

```typescript
// e2e/visual-regression.spec.ts
test('breathing scene renders consistently', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 30_000 });

  // Take screenshot and compare
  await expect(page).toHaveScreenshot(`breathing-scene-${testInfo.project.name}.png`, {
    maxDiffPixels: 100, // Allow small differences for anti-aliasing
  });
});
```

### Best Practices for Visual Tests

✅ **DO:**
- Run in consistent environment (same OS, browser version)
- Allow tolerance for anti-aliasing (`maxDiffPixels: 100`)
- Wait for animations to stabilize
- Use descriptive snapshot names

❌ **DON'T:**
- Screenshot during animations (causes flakiness)
- Use tight pixel thresholds (0 diff) - too brittle
- Update snapshots without reviewing diffs

---

## Coverage Requirements

Coverage thresholds are enforced in CI to maintain code quality:

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    lines: 70,       // 70% of lines must be covered
    functions: 70,   // 70% of functions must be tested
    branches: 65,    // 65% of branches must be covered
    statements: 70,  // 70% of statements must be executed
    perFile: true,   // Enforce per-file thresholds
  }
}
```

### Viewing Coverage Reports

```bash
npm run test:coverage

# Open HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

### Coverage Exclusions

The following are excluded from coverage:
- Test files (`**/*.test.{ts,tsx}`)
- Type definitions (`**/*.d.ts`, `**/types.ts`)
- Test utilities (`**/test/**`, `**/fixtures/**`)

---

## Best Practices

### 1. Behavior-Driven Testing

Focus on **outcomes**, not implementation:

```typescript
// ✅ GOOD - Tests user-facing behavior
it('all users breathe together regardless of join time', () => {
  // OUTCOME: Two users see same phase at same UTC time
  const user1CheckTime = Date.now();
  const user2CheckTime = Date.now(); // Same absolute time

  expect(calculateBreathState(user1CheckTime).breathPhase)
    .toBe(calculateBreathState(user2CheckTime).breathPhase);
});

// ❌ BAD - Tests implementation details
it('breathPhase uses modulo operator', () => {
  // This will break if we refactor internal math
});
```

### 2. Property-Based Testing

Use `fast-check` to test invariants with random inputs:

```typescript
import * as fc from 'fast-check';

it('breathPhase is always between 0 and 1', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
      (timestamp) => {
        const { breathPhase } = calculateBreathState(timestamp);
        return breathPhase >= 0 && breathPhase <= 1;
      }
    ),
    { numRuns: 1000 } // Test with 1000 random timestamps
  );
});
```

### 3. Three.js Resource Management

Always dispose Three.js resources to prevent GPU memory leaks:

```typescript
it('material color test', () => {
  const material = new THREE.MeshPhongMaterial({ color: '#ff0000' });

  // ... test logic ...

  // ✅ CRITICAL: Dispose resources
  material.dispose();
});

// Or use afterEach for multiple tests
afterEach(() => {
  scene.clear();
  materials.forEach(m => m.dispose());
  geometries.forEach(g => g.dispose());
});
```

### 4. Avoid Flaky Tests

```typescript
// ❌ FLAKY - Depends on exact timing
it('animation completes in exactly 1000ms', async () => {
  await page.waitForTimeout(1000);
  expect(getCurrentPhase()).toBe('complete');
});

// ✅ STABLE - Waits for condition
it('animation completes', async ({ page }) => {
  await page.waitForSelector('[data-state="complete"]', {
    timeout: 5000
  });
});
```

### 5. Use Test Fixtures

Extract common setup into reusable fixtures:

```typescript
// src/test/fixtures/sceneBuilder.ts
export function buildBreathingScene(scene, config = {}) {
  buildGlobe(scene);
  buildInstancedParticles(scene, config.particleCount || 300);
  buildEnvironment(scene);
}

// In tests
import { buildBreathingScene } from './fixtures';

it('measures scene performance', () => {
  buildBreathingScene(scene, { particleCount: 500 });
  // ... assertions
});
```

---

## Troubleshooting

### Tests Failing in CI but Passing Locally

**Issue:** WebGL context differences between environments

**Solution:** Use scene graph analysis instead of rendering:

```typescript
// ✅ Works in CI (no WebGL needed)
import { analyzeScene } from './sceneAnalyzer';

const metrics = analyzeScene(scene);
expect(metrics.drawCalls).toBeLessThan(50);

// ❌ Fails in CI (requires GPU)
renderer.render(scene, camera);
```

### Visual Regression Tests Always Failing

**Issue:** Different OS/browser versions produce different screenshots

**Solution:** Run Playwright in Docker for consistency:

```bash
docker run -it --rm --ipc=host -v $(pwd):/work -w /work \
  mcr.microsoft.com/playwright:latest \
  npx playwright test visual-regression
```

### Coverage Thresholds Blocking CI

**Issue:** New code drops coverage below 70%

**Solutions:**
1. Add tests for uncovered code
2. Temporarily lower thresholds (not recommended)
3. Use `/* istanbul ignore next */` for untestable code (use sparingly)

```typescript
// Only ignore code that's truly untestable
/* istanbul ignore next */
if (typeof window === 'undefined') {
  return null; // Server-side fallback
}
```

### Property-Based Tests Failing Intermittently

**Issue:** Random inputs occasionally find edge cases

**Solution:** Use deterministic seeds for reproducibility:

```typescript
fc.assert(
  fc.property(...),
  {
    numRuns: 1000,
    seed: 42, // ✅ Reproducible failures
  }
);
```

---

## Writing New Tests

### Checklist for New Tests

When adding a new test file, ensure:

- [ ] Follows `<feature>.<type>.test.ts` naming convention
- [ ] Includes descriptive test names starting with "should" or describes outcome
- [ ] Disposes Three.js resources (materials, geometries, textures)
- [ ] Uses test fixtures for common setup
- [ ] Includes both positive and negative test cases
- [ ] Adds coverage for edge cases
- [ ] Tests behavior, not implementation details
- [ ] Passes locally and in CI

### Example Template

```typescript
/**
 * <Feature> Tests
 *
 * Brief description of what this test suite covers.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

describe('<Feature Name>', () => {
  let scene: THREE.Scene;
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    scene.clear();
    materials.forEach(m => m.dispose());
    geometries.forEach(g => g.dispose());
    materials.length = 0;
    geometries.length = 0;
  });

  it('should [expected behavior]', () => {
    // Arrange
    const material = new THREE.MeshBasicMaterial();
    materials.push(material);

    // Act
    const result = doSomething(material);

    // Assert
    expect(result).toBe(expected);
  });
});
```

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [fast-check Documentation](https://fast-check.dev/)
- [React Three Fiber Testing](https://docs.pmnd.rs/react-three-fiber/advanced/testing)
- [CLAUDE.md](../CLAUDE.md) - Project-specific testing patterns

---

**Last Updated:** January 2026
