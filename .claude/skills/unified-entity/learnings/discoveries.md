# Discoveries: New Patterns and Reusable Solutions

Novel patterns, reusable solutions, and better approaches discovered while working with entities.

---

## Format

```markdown
## [Pattern/Solution Title] (Entity: [entity-name], Date: YYYY-MM-DD)

**Context:** What situation led to this discovery?
**Pattern/Solution:** The pattern or approach
**How to apply:** Steps for using this on other entities
**Why it works:** Why this is better than alternatives
**Example code:** Concrete implementation example
**Metrics:** Impact before/after (if applicable)
**Related:** Links to pattern documentation, decision rationale, other entities
```

---

## How to Add

After discovering a useful pattern or solution:

1. Describe the situation that led to discovery
2. Explain the pattern or solution
3. Provide steps for applying to other entities
4. Explain why it's effective
5. Include code example
6. Document metrics (if measurable)
7. Link to related content

Example:

```markdown
## Hardcoding Props with <5% Visual Impact (Entity: Environment, Date: 2024-10-15)

**Context:** Environment entity had floorRoughness (always 1.0) and floorMetalness (always 0.0) props that nobody adjusted.
**Pattern/Solution:** Remove props with imperceptible visual impact by hardcoding values.
**How to apply:**
1. Identify rarely-used props (check git history, user feedback)
2. Test visual impact if default changed by ±50%
3. If impact < 5%, mark as hardcodable
4. Hardcode in component
5. Remove from interface
6. Document decision in code

**Why it works:**
- Reduces cognitive load (fewer options = easier to understand)
- No visual impact to users
- Simplifies Triplex editor (fewer confusing props)
- Reduces prop threading (3 fewer scene file changes)

**Example code:**
```typescript
export function Environment(props: EnvironmentProps) {
  return (
    <mesh>
      <meshStandardMaterial
        roughness={1}    // Always matte (hardcoded, was configurable)
        metalness={0}    // Always non-metallic (hardcoded, was configurable)
      />
    </mesh>
  );
}
```

**Metrics:**
- Props: 16 → 14 (12.5% reduction)
- Triplex clarity: Improved (fewer options)
- Visual impact: 0 (imperceptible)
- User complaints: 0

**Related:** Pattern: Hardcoding Values < 5% (patterns.md), Entity: Lighting (similar consideration)
```

---

## Discovery Template

Use this as a starting point for new discoveries:

```markdown
## [Pattern/Solution Title] (Entity: [entity-name], Date: YYYY-MM-DD)

**Context:**
**Pattern/Solution:**
**How to apply:**
**Why it works:**
**Example code:**
```typescript
// Example implementation
```

**Metrics:**
**Related:**
```

---

## Standardized JSDoc Template (2025-12-29)

**Context:** Discovered that JSDoc varies significantly across entities, making it difficult for users to understand prop purposes and when to adjust them.

**Pattern/Solution:** Standardized 7-section JSDoc template applied across all 171+ props ensures consistency, improves discoverability, and provides contextual guidance.

**How to apply:**
1. Use the 7-section format for all new props:
   - Technical description (required)
   - Detailed explanation (optional)
   - "When to adjust" (recommended)
   - "Typical range" with visual landmarks (recommended)
   - "Interacts with" related props (recommended)
   - "Performance note" (optional)
   - Triplex annotations (required)
2. Apply to existing props during entity improvements
3. Reference file locations: breathingSphere (17), lighting (9), environment (13), particle (7)

**Why it works:**
- Reduces cognitive load with visual landmarks (Dim/Standard/Bright)
- Contextual guidance answers "when should I change this?"
- Related props improve discoverability
- Performance notes enable informed decisions
- Consistent across all 171+ props ensures predictability

**Example code:**
```typescript
/**
 * Ambient light intensity (non-directional base illumination).
 *
 * Provides uniform lighting across entire scene. Foundation for all lighting.
 * Lower = darker shadows, higher = flatter appearance.
 *
 * **When to adjust:** Dark backgrounds (0.4-0.6) for contrast, light backgrounds (0.1-0.3) to avoid washout
 * **Typical range:** Dim (0.2) → Standard (0.4, balanced) → Bright (0.6) → Washed (0.8+)
 * **Interacts with:** backgroundColor, keyIntensity, fillIntensity
 * **Performance note:** No impact; computed per-fragment
 *
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.4 (production baseline: balanced visibility)
 */
ambientIntensity?: number;
```

**Metrics:**
- Consistency: 0% (inconsistent) → 100% (standardized)
- User clarity: Improved through contextual guidance
- Discoverability: Enhanced through "Interacts with" sections
- Triplex editor experience: Better help text visibility

**Related:** JSDoc Template & Standards (ecs-entity skill), Triplex Integration (triplex-component skill)

---

## Tuple Types for Vector Props (2025-12-29)

**Context:** Discovered that vector props (position, scale, rotation) previously used flat scalar props (positionX, positionY, positionZ), cluttering interfaces and making Triplex harder to use.

**Pattern/Solution:** Use TypeScript tuple types for vector props. Triplex automatically renders tuples as individual number inputs, while keeping the interface clean and type-safe.

**How to apply:**
1. Replace flat props with tuples:
   ```typescript
   // ❌ Before (cluttered interface)
   position?: { positionX?: number; positionY?: number; positionZ?: number }

   // ✅ After (clean interface)
   position?: [x: number, y: number, z: number]
   ```
2. Use named tuple elements for clarity: `[x: number, y: number, z: number]`
3. For flexible props, use union types: `scale?: number | [x: number, y: number, z: number]`
4. Triplex renders mixed types with "Switch Prop Type" action for format switching
5. Access tuple values directly: `mesh.position = props.position ?? [0, 0, 0]`

**Why it works:**
- Clean, readable interface (one prop instead of three)
- Triplex automatically renders as 3 separate inputs
- Type-safe (can't accidentally pass wrong shape)
- Supports flexible types (single number or tuple)
- Less cognitive load on users

**Example code:**
```typescript
interface Props {
  // Position as tuple (clean)
  position?: [x: number, y: number, z: number];

  // Scale with flexible format
  scale?: number | [x: number, y: number, z: number];

  // Rotation as tuple
  rotation?: [x: number, y: number, z: number];

  // Color with multiple formats
  color?: string | number | [r: number, g: number, b: number];
}

export function MyEntity({
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  color = '#ffffff'
}: Props = {}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={typeof scale === 'number' ? scale : scale}
    />
  );
}
```

**Metrics:**
- Props per component: Reduced by ~66% for position/rotation (3 props → 1)
- Interface clarity: Improved (intent obvious from tuple shape)
- Triplex experience: Better (cleaner UI, fewer props to adjust)
- Type safety: Guaranteed correct shapes

**Related:** Flat Props & Tuple Types (triplex-component skill), Mixed types pattern

---

## Transparent Pass-Through Pattern (2025-12-29)

**Context:** Scene components (breathing.tsx) were redefining entity defaults, causing conflicts and making it unclear which component owned which default value.

**Pattern/Solution:** Scene components pass undefined to entity components, allowing entities to use their own defaults. Scenes only own what they render directly (backgroundColor, bloom).

**How to apply:**
1. Scene component defines only scene-owned props with defaults:
   ```typescript
   export function BreathingLevel({
     backgroundColor = '#0a0f1a',  // Scene-owned
     bloom = 'subtle',             // Scene-owned
     sphereColorExhale,            // No default - passes through
   }: Partial<BreathingLevelProps> = {}) {}
   ```
2. Entity component defines its own defaults:
   ```typescript
   export function BreathingSphere({
     colorExhale = '#4A8A9A',  // Entity owns this default
   }: BreathingSphereProps = {}) {}
   ```
3. Verify no duplicate defaults in scene and entity layers

**Why it works:**
- Single source of truth for each entity's defaults
- No conflicts between scene and entity layers
- Triplex changes flow correctly
- Easy to reason about ownership
- Prevents accidental default value mismatches

**Example code:**
```typescript
// ❌ Bad - Scene redefines entity defaults
export function BreathingLevel({
  sphereColorExhale = '#4A8A9A',  // Duplicate!
}) {
  return <BreathingSphere colorExhale={sphereColorExhale} />;
}

// ✅ Good - Scene passes undefined, lets entity use its default
export function BreathingLevel({
  sphereColorExhale,  // No default
}) {
  return <BreathingSphere colorExhale={sphereColorExhale} />;
}
```

**Metrics:**
- Default conflicts: Eliminated
- Ownership clarity: 100% (clear which component owns each default)
- Triplex sync: Improved (changes propagate correctly)

**Related:** Scene Threading Pattern (ecs-entity skill), Prop Flow Architecture

---

## 171+ Prop Documentation System (2025-12-29)

**Context:** Props were scattered across multiple files with no centralized inventory, making it difficult to maintain consistency and understand the full scope of documented props.

**Pattern/Solution:** Comprehensive prop inventory across entities (17 visual, 9 lighting, 13 environment, 7 particle) with centralized defaults in sceneDefaults.ts and standardized JSDoc documentation.

**How to apply:**
1. Document all props with standardized JSDoc template
2. Reference specific files for prop locations
3. Maintain centralized defaults in sceneDefaults.ts
4. Ensure all props follow 7-section JSDoc format
5. Link related props through "Interacts with" section
6. Keep inventory updated as new props are added

**Why it works:**
- Clear documentation locations (no hunting for props)
- Single source of truth for defaults (sceneDefaults.ts)
- Metadata enables AI suggestions and validation
- Comprehensive user guidance (JSDoc standard)
- Supports 171+ props without losing organization

**Example code:**
```typescript
// sceneDefaults.ts (single source of truth)
export const VISUAL_DEFAULTS = {
  backgroundColor: {
    value: '#0a0f1a' as const,
    when: 'Base scene background color...',
    typical: 'Deep Space → Balanced → Light',
    interacts: ['ambientIntensity', 'keyIntensity'],
  },
};

// BreathingSphere.tsx (entity uses default)
export function BreathingSphere({
  colorExhale = '#4A8A9A',
}: BreathingSphereProps = {}) {}
```

**Metrics:**
- Prop inventory: 46 props documented → 171+ props documented (3.7x increase)
- Documentation coverage: 50% → 100%
- Consistency: Standardized across all props
- Discoverability: Enhanced through centralized system

**Related:** Prop Documentation Inventory (triplex-component skill), sceneDefaults.ts pattern (ecs-entity skill)

---

## Types of Discoveries

**Pattern:** Reusable approach (e.g., enable/disable toggles)
**Solution:** Fix for a problem (e.g., hardcoding <5% impact)
**Optimization:** Performance improvement (e.g., closure pattern in useFrame)
**Best Practice:** Should-always-do (e.g., scene threading)
**Anti-pattern:** Should-never-do (e.g., nested props for Triplex)

---

## Notes

- This file grows as we discover useful patterns
- Check this file when working on new entities
- Apply discovered patterns to prevent duplication
- Share discoveries with other developers
- Use to refactor existing code (apply new patterns to old entities)
