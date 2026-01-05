# Testing Skill for breathe-together-v2

**Purpose:** Guide AI code generation to create maintainable, outcome-focused tests that ground AI coding output while allowing implementation flexibility.

**When to use:** Creating new tests, improving existing tests, debugging test failures, or reviewing test coverage.

---

## Philosophy: Outcome-Based Testing for AI Grounding

### Core Principles

**1. Test OUTCOMES, not IMPLEMENTATION**
- ✅ Test what users see and experience
- ✅ Test behavior and results
- ❌ Don't test internal variables
- ❌ Don't test implementation details

**Why:** AI agents can refactor implementations while preserving outcomes. Tests survive code changes.

**Example:**
```typescript
// ❌ BAD - Tests implementation
it('should set breathPhase variable to 0.5', () => {
  const state = calculateBreath(time);
  expect(state.breathPhase).toBe(0.5); // Fragile!
});

// ✅ GOOD - Tests outcome
it('should position particles at mid-breath orbit', () => {
  // OUTCOME: Users see particles at medium distance from globe
  const positions = calculateParticles(time);
  const avgDistance = getAverageDistance(positions);
  expect(avgDistance).toBeCloseTo(4.25, 0.5); // Flexible tolerance
});
```

**2. DAMP over DRY** ([Google Testing Blog](https://testing.googleblog.com/2019/12/testing-on-toilet-tests-too-dry-make.html))
- Tests should be Descriptive And Meaningful Phrases
- Prefer clarity over code reuse
- Extract helpers only when they improve readability
- Each test should be understandable in isolation

**Example:**
```typescript
// ❌ BAD - Over-abstracted
it('should work', () => {
  runTest('particles', 0.5, [100, 200], checkCollisions);
});

// ✅ GOOD - DAMP (clear and explicit)
it('should have no particle collisions at mid-breath with 100 particles', () => {
  // OUTCOME: Users see clean, non-overlapping particles
  expectNoParticleCollisions(0.5, { particleCount: 100 });
});
```

**3. Property-Based Testing for Edge Cases** ([Fast-Check Guide](https://medium.com/@joaovitorcoelho10/fast-check-a-comprehensive-guide-to-property-based-testing-2c166a979818))
- Use fast-check to test invariants across random inputs
- Complements example-based tests
- Catches edge cases AI might miss

**Example:**
```typescript
import * as fc from 'fast-check';

it('should maintain no-collision property across any breath phase', () => {
  // PROPERTY: No collisions at ANY phase, not just 0, 0.5, 1.0
  fc.assert(
    fc.property(
      fc.double({ min: 0, max: 1 }),
      fc.integer({ min: 50, max: 300 }),
      (breathPhase, particleCount) => {
        const result = checkParticleCollisions(breathPhase, { particleCount });
        expect(result.hasCollision).toBe(false);
      },
    ),
    { numRuns: 100 }, // Test 100 random combinations
  );
});
```

---

## Testing Patterns for breathe-together-v2

### Pattern 1: Three.js Scene Graph Testing (No WebGL Required)

**Context:** Testing Three.js without WebGL context ([Three.js Testing Discussion](https://discourse.threejs.org/t/how-to-unit-test-three-js/57736))

**Approach:** Analyze scene graph structure, not pixel output

```typescript
it('should use InstancedMesh for efficient particle rendering', () => {
  // OUTCOME: Particles render in single draw call (good performance)
  const scene = new THREE.Scene();
  const instancedMesh = new THREE.InstancedMesh(geometry, material, 500);
  scene.add(instancedMesh);

  let drawCalls = 0;
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) drawCalls++;
  });

  expect(drawCalls).toBe(1); // Single draw call for 500 particles
});
```

**Why:** No WebGL context needed, tests run fast in CI, focuses on structure not pixels.

### Pattern 2: Pure Function Extraction

**Context:** Extract position calculations into pure functions for testability

```typescript
// In lib/collisionGeometry.ts
export function calculateAllParticlePositions(
  breathPhase: number,
  config: CollisionTestConfig,
): THREE.Vector3[] {
  // Pure function - no side effects
  // Easy to test without Three.js scene
}

// In test
it('should calculate particle positions deterministically', () => {
  // OUTCOME: Same inputs always produce same particle layout
  const positions1 = calculateAllParticlePositions(0.5, config);
  const positions2 = calculateAllParticlePositions(0.5, config);

  expect(positions1).toEqual(positions2); // Deterministic
});
```

### Pattern 3: Shared Test Helpers

**Location:** `src/test/helpers/`

**Guideline:** Extract helpers when they improve clarity, not just to reduce duplication ([DAMP Principles](https://www.arhohuttunen.com/dry-damp-tests/))

```typescript
// ✅ GOOD - Focused helper with clear outcome
export function expectNoParticleCollisions(
  breathPhase: number,
  config?: Partial<CollisionTestConfig>,
): void {
  const result = checkParticleCollisions(breathPhase, config);
  expect(result.hasCollision).toBe(false);

  if (result.hasCollision) {
    // Detailed error message for debugging
    throw new Error(`Collision detected: ${result.minDistancePair}`);
  }
}

// ❌ BAD - Over-abstracted helper
export function runGenericTest(type: string, ...args: any[]): void {
  // Too generic, hides test intent
}
```

**Helper Categories:**
- `colorMatchers.ts` - Color testing and WCAG validation
- `geometryHelpers.ts` - Sphere distribution and angular distance
- `collisionHelpers.ts` - Collision detection assertions
- `mockDataGenerators.ts` - Test fixture creation
- `sceneAssertions.ts` - Three.js scene validation

### Pattern 4: Outcome Documentation

**Format:** Use OUTCOME/INVARIANT/PROPERTY comments

```typescript
it('should have even distribution at initialization', () => {
  // OUTCOME: Users see particles evenly spread across globe at startup
  // No visual clumping or gaps that would break the meditation aesthetic

  const points = generateFibonacciSphere(count);
  const metrics = measureDistribution(points);

  // INVARIANT: Low coefficient of variation means uniform spacing
  expect(metrics.cv).toBeLessThan(0.15);
});
```

**Why:** AI agents understand user impact, not just technical assertions.

---

## Test Organization

### File Structure
```
src/
  test/
    helpers/           # Shared utilities
      colorMatchers.ts
      geometryHelpers.ts
      collisionHelpers.ts
      mockDataGenerators.ts
      sceneAssertions.ts
      index.ts          # Centralized exports
    apiSurface.test.ts          # Breaking change detection
    behaviorTests.test.ts       # User-facing outcomes
    colorPalette.test.ts        # Visual identity
    fibonacciDistribution.test.ts
    functionSignatures.test.ts  # API contracts
    performanceRegression.test.ts # O(n) complexity guards
    propertyBased.test.ts       # Mathematical invariants
    shaderColorValidation.test.ts # Visual regression
    shapeCollisions.test.ts
```

### Test Categories

**1. Behavior Tests** - User-facing outcomes
- What users see and experience
- Cross-cutting concerns
- Integration-level validation

**2. Property Tests** - Mathematical invariants
- Use fast-check for random inputs
- Test properties that always hold
- Catch edge cases

**3. Contract Tests** - API stability
- Function signatures
- Export structure
- Breaking change detection

**4. Performance Tests** - Algorithmic complexity
- O(1), O(n) bounds
- Frame rate budgets
- Memory allocation

**5. Visual Tests** - Appearance contracts
- Color palette stability
- Shader output validation
- Scene structure

---

## Anti-Patterns to Avoid

### ❌ Testing Implementation Details
```typescript
// BAD - Breaks when you refactor
it('should call updateOrbitRadius method', () => {
  const spy = vi.spyOn(obj, 'updateOrbitRadius');
  obj.animate();
  expect(spy).toHaveBeenCalled();
});
```

### ❌ Brittle Exact Matches
```typescript
// BAD - Fails on tiny floating point differences
expect(breathPhase).toBe(0.5000000000001);

// GOOD - Use appropriate tolerance
expect(breathPhase).toBeCloseTo(0.5, 3);
```

### ❌ Testing Multiple Concepts
```typescript
// BAD - What failed? Collisions? Distribution? Performance?
it('should work correctly', () => {
  expectNoCollisions();
  expectEvenDistribution();
  expectGoodPerformance();
});

// GOOD - One concept per test
it('should have no particle collisions at inhale', () => {
  expectNoParticleCollisions(1.0);
});
```

### ❌ Hidden Test Logic
```typescript
// BAD - Magic helper that does too much
await runFullTestSuite('particles');

// GOOD - Explicit and clear
expectNoParticleCollisions(breathPhase, { particleCount: 100 });
```

---

## Workflow: Creating New Tests

### Step 1: Identify the Outcome
Ask: "What should the user see/experience?"

**Example:**
- User outcome: "Particles remain evenly spread during breathing"
- Not: "OrbitRadius multiplies breathPhase by 3.5"

### Step 2: Write Descriptive Test Name
Format: `should [outcome] when [condition]`

**Examples:**
- ✅ `should maintain even distribution during breathing cycle`
- ✅ `should render particles without overlapping at any breath phase`
- ❌ `should work`
- ❌ `test particle system`

### Step 3: Add Outcome Documentation
```typescript
it('should maintain even distribution during breathing cycle', () => {
  // OUTCOME: Users see balanced particle coverage, no clumping
  // This preserves the meditation aesthetic across the full cycle

  // ... test code ...
});
```

### Step 4: Use Appropriate Assertions
- Behavioral: `expect(visualOutcome).toBe(expected)`
- Numerical: `expect(value).toBeCloseTo(target, tolerance)`
- Structural: `expect(object).toHaveProperty('key')`
- Property: `fc.assert(fc.property(...))`

### Step 5: Add Property Test (If Applicable)
For numerical algorithms, add property-based test:

```typescript
it('should maintain property across all inputs', () => {
  fc.assert(
    fc.property(
      fc.double({ min: 0, max: 1 }),
      (input) => {
        const result = calculateSomething(input);
        return result >= 0 && result <= 1; // Invariant
      },
    ),
    { numRuns: 100 },
  );
});
```

---

## Common Testing Scenarios

### Scenario 1: Testing Particle Distribution
```typescript
it('should distribute particles evenly on sphere surface', () => {
  // OUTCOME: Users see balanced coverage, no visual hotspots
  const points = generateFibonacciSphere(100);

  // Test invariants
  expect(allPointsOnUnitSphere(points)).toBe(true);

  const cv = coefficientOfVariation(findNearestNeighborDistances(points));
  expect(cv).toBeLessThan(0.15); // Low variation = even spacing
});
```

### Scenario 2: Testing Collision Detection
```typescript
it('should detect no collisions at worst-case breath phase', () => {
  // OUTCOME: Particles never overlap, maintaining visual clarity
  // Worst case: breathPhase=1.0 (inhale, minimum orbit)
  expectNoParticleCollisions(1.0, { particleCount: 300 });
});
```

### Scenario 3: Testing Color Schemes
```typescript
it('should maintain Monument Valley warm aesthetic', () => {
  // OUTCOME: Colors match brand identity, evoke warmth
  const colors = {
    gratitude: getMoodColor('gratitude'),
    connection: getMoodColor('connection'),
  };

  expectColorMatch(colors.gratitude, '#ffbe0b', 15);
  expectColorMatch(colors.connection, '#ef476f', 15);
});
```

### Scenario 4: Testing Performance
```typescript
it('should calculate breath state in O(1) constant time', () => {
  // OUTCOME: App maintains 60fps regardless of inputs
  const iterations = 10000;

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    calculateBreathState(Date.now() + i);
  }
  const end = performance.now();

  const avgTime = (end - start) / iterations;
  expect(avgTime).toBeLessThan(0.05); // <50 microseconds
});
```

---

## Tools and Libraries

### Test Runner
- **Vitest** - Fast, Vite-powered testing ([Vitest Docs](https://vitest.dev/))
- Compatible with Jest API
- Hot module replacement for tests

### Assertion Libraries
- **Vitest expect** - Built-in assertions
- **Custom matchers** - Project-specific (colorMatchers, geometryHelpers)

### Property-Based Testing
- **fast-check** - QuickCheck for JavaScript ([NPM](https://www.npmjs.com/package/fast-check))
- Generates random inputs
- Shrinks failing cases to minimal example

### Three.js Testing
- **Scene graph analysis** - No WebGL required
- **Pure function extraction** - Test calculations without rendering
- **Mock-free approach** - Use real Three.js objects

---

## Checklist for New Tests

- [ ] Test name describes user outcome, not implementation
- [ ] Added OUTCOME comment explaining user impact
- [ ] Uses appropriate tolerance for floating-point comparisons
- [ ] Tests one concept (not multiple unrelated things)
- [ ] Uses shared helpers from `test/helpers/` when appropriate
- [ ] Added property-based test if testing numerical algorithm
- [ ] Test survives implementation refactoring (tests behavior, not code)
- [ ] No test doubles/mocks unless absolutely necessary
- [ ] Fast execution (no WebGL, no network calls)
- [ ] Descriptive failure messages when assertions fail

---

## References

### Testing Philosophy
- [TDD Best Practices 2026](https://monday.com/blog/rnd/test-driven-development-tdd/)
- [BDD Testing Tools](https://www.accelq.com/blog/bdd-testing-tools/)
- [Test-Driven Development Guide](https://www.testrail.com/blog/test-driven-development/)

### Test Maintainability
- [DAMP vs DRY in Tests](https://www.arhohuttunen.com/dry-damp-tests/)
- [Google Testing Blog: Tests Too DRY? Make Them DAMP!](https://testing.googleblog.com/2019/12/testing-on-toilet-tests-too-dry-make.html)
- [Writing Maintainable Unit Tests](https://learn.microsoft.com/en-us/archive/msdn-magazine/2006/january/unit-testing-writing-maintainable-unit-tests-save-time-and-tears)

### Property-Based Testing
- [Fast-Check Comprehensive Guide](https://medium.com/@joaovitorcoelho10/fast-check-a-comprehensive-guide-to-property-based-testing-2c166a979818)
- [Property-Based Testing with fast-check](https://packmind.com/code-improvements-property-based-testing-fast-check/)

### Three.js Testing
- [How To Unit Test THREE.JS](https://discourse.threejs.org/t/how-to-unit-test-three-js/57736)
- [WebGL Testing Best Practices](https://blog.pixelfreestudio.com/best-practices-for-testing-and-debugging-webgl-applications/)

### Vitest
- [Vitest Getting Started](https://vitest.dev/guide/)
- [Vitest Best Practices](https://www.projectrules.ai/rules/vitest)

---

## Quick Reference

### Import Helpers
```typescript
import {
  // Color testing
  expectColorMatch,
  getColorTemperature,

  // Geometry testing
  angularDistance,
  coefficientOfVariation,
  allPointsOnUnitSphere,

  // Collision testing
  expectNoParticleCollisions,
  expectNoGlobeCollisions,

  // Mock data
  createMockPresence,
  createMockUsers,

  // Scene testing
  expectParticleCount,
} from './helpers';
```

### Property-Based Testing Template
```typescript
import * as fc from 'fast-check';

it('should maintain invariant', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 10, max: 500 }),
      (input) => {
        const result = myFunction(input);
        // Return boolean: true if invariant holds
        return result.isValid;
      },
    ),
    { numRuns: 100 },
  );
});
```

### Test Documentation Template
```typescript
it('should [user-facing outcome] when [condition]', () => {
  // OUTCOME: [What user sees/experiences]
  // [Why this matters for UX]

  // INVARIANT: [Mathematical property that must hold]
  // or
  // PROPERTY: [Property tested across random inputs]

  // ... test code ...
});
```
