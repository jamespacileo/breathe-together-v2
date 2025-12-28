# Create New Entity Workflow

Create a new entity from scratch using guided decision trees and templates.

**Time estimate:** 2-3 hours (1 hour archetype selection + decision-making, 1-2 hours implementation)

---

## Quick Start

1. **Guided Interview** - Answer 5 questions to determine your archetype
2. **Choose Template** - I'll show you the right template for your archetype
3. **Implement** - Copy template, customize trait/system signatures
4. **Scene Thread** - Add props to sceneDefaults.ts and scene files
5. **Validate** - TypeScript check, Triplex test, visual verification
6. **Capture Learnings** - Any discoveries get added to skill knowledge base

---

## Phase 1: Guided Interview (10 minutes)

Answer these questions to determine your entity archetype:

### Question 1: State Changes?
**Does your entity need to track changing state (physics, animations, behavior)?**
- No → Continue to Q2
- Yes → Ask Q1b: Is state a single value or complex?
  - Single value (position, scale, phase) → Hint: Simple ECS or Complex ECS
  - Multiple values or configuration → Hint: Complex ECS

### Question 2: Visual Configuration?
**Do users need to configure how it looks (props, colors, intensity, scale)?**
- No (just render, no config) → Archetype: **Visual-Only**
- Yes, simple (5-10 props) → Archetype: **Visual-Only**
- Yes, complex (15+ props) → Archetype: **Complex ECS** with props interface

### Question 3: Behavior Changes Each Frame?
**Does the entity need to update every frame based on:  breathing phase, other entity positions, time, input?**
- No → Archetype: **Visual-Only**
- Yes → Ask Q3b: What triggers the behavior?
  - Breathing phase → Archetype: **Complex ECS**
  - Entity positions / interactions → Archetype: **Simple or Complex ECS**
  - Input / user interaction → Archetype: **Simple ECS**

### Question 4: Interdependency with Other Entities?
**Does your entity need to query/interact with other entities (read other positions, react to events)?**
- No → Archetype: **Visual-Only** or **Simple ECS**
- Yes → Archetype: **Simple ECS** or **Complex ECS**

### Question 5: Performance Critical?
**Will this entity have many instances (300+ particles) or complex shaders?**
- No → Archetype: **Visual-Only** or **Simple ECS**
- Yes → Archetype: **Complex ECS** (with quality presets, instancing)

### Archetype Decision Tree

```
Is it visual-only (no state, no behavior, no queries)?
  ├─ YES → VISUAL-ONLY (template: visual-only-entity.tsx)
  └─ NO  → Does it have complex state (5+ traits)?
           ├─ YES → COMPLEX ECS (template: complex-ecs-entity.tsx)
           └─ NO  → SIMPLE ECS (template: simple-ecs-entity.tsx)
```

---

## Phase 2: File Structure (5 minutes)

Depending on your archetype, create these files:

### Visual-Only Entity
```
src/entities/myEntity/
└── index.tsx              # All code here
```

### Simple ECS Entity
```
src/entities/myEntity/
├── index.tsx             # React component + spawning
├── traits.tsx            # Trait definitions (1-3 traits)
└── systems.tsx           # System functions (1-2 systems)
```

### Complex ECS Entity
```
src/entities/myEntity/
├── index.tsx             # React component + spawning
├── traits.tsx            # Trait definitions (5+ traits)
├── systems.tsx           # System functions (3+ systems)
└── config.ts             # Configuration interface + defaults
```

---

## Phase 3: Implement Core Entity (60 minutes)

Use the appropriate template from `templates/`:

### Template Selection

| Archetype | Template | Props | Traits | Systems | Effort |
|-----------|----------|-------|--------|---------|--------|
| Visual-Only | `visual-only-entity.tsx` | 10-20 flat props | None | None | 30-60 min |
| Simple ECS | `simple-ecs-entity.tsx` | 0-5 props | 1-3 | 1-2 | 45-90 min |
| Complex ECS | `complex-ecs-entity.tsx` | 15-25 flat props | 5-10 | 3-5 | 90-120 min |

**Steps:**
1. Copy template file to `src/entities/myEntity/index.tsx`
2. Replace template placeholders (entity name, trait names, system logic)
3. For ECS: Copy trait/system signatures from template files
4. Update trait/system names to match your domain
5. Implement logic specific to your entity

**Key checklist:**
- [ ] All props are flat (no nested objects)
- [ ] Traits are immutable data containers
- [ ] Systems are pure functions that query and update
- [ ] Components spawn themselves in useEffect
- [ ] Component returns Three.js group/mesh

---

## Phase 4: Add to Triplex Configuration (20 minutes)

Make your entity configurable in the Triplex editor.

### Step 1: Define Props Type

Create or update `src/types/sceneProps.ts`:

```typescript
export interface MyEntityProps {
  /**
   * Brief description of prop
   *
   * **When to adjust:** When/why would user change this?
   * **Typical range:** Min → Normal → Max values
   * **Interacts with:** Other props that affect this one
   *
   * @type slider (or text, color, etc.)
   * @min 0
   * @max 1
   * @step 0.1
   * @default 0.5
   */
  myProp?: number;
}
```

### Step 2: Add to Defaults

Update `src/config/sceneDefaults.ts`:

```typescript
export const sceneDefaults = {
  // ... other entities
  myEntity: {
    myProp: 0.5,
  },
} as const;
```

### Step 3: Thread Props Through Scene Files

Update three files with your props:

**`src/levels/breathing.tsx`** (Production scene):
```typescript
<MyEntity
  myProp={sceneDefaults.myEntity.myProp}
/>
```

**`src/levels/breathing.scene.tsx`** (Experimental/Triplex scene):
```typescript
<MyEntity
  myProp={triplexPropsOverride?.myEntity?.myProp ?? sceneDefaults.myEntity.myProp}
/>
```

**`src/levels/breathing.debug.scene.tsx`** (Debug scene):
```typescript
<MyEntity
  myProp={debugPropsOverride?.myEntity?.myProp ?? sceneDefaults.myEntity.myProp}
/>
```

### Step 4: Register in Triplex Config

Update `.triplex/config.json` to expose your entity:

```json
{
  "components": {
    "MyEntity": {
      "file": "src/entities/myEntity/index.tsx"
    }
  }
}
```

---

## Phase 5: Register Systems (if ECS)

If your entity uses ECS systems, register them in the execution pipeline.

### Update `src/providers.tsx`

Find `KootaSystems` component and add your systems in order:

```typescript
export function KootaSystems() {
  return (
    <useKoota.Provider value={world}>
      {/* Execution order matters! */}

      {/* Phase 1: State calculations */}
      <BreathSystem world={world} />

      {/* Phase 2: Movement calculations */}
      <CursorPositionFromLandSystem world={world} />
      <VelocityTowardsTargetSystem world={world} />

      {/* Phase 3: Apply movements */}
      <PositionFromVelocitySystem world={world} />

      {/* Phase 4: Sync visuals */}
      <MeshFromPositionSystem world={world} />

      {/* Phase 5: Camera behavior */}
      <MyNewSystem world={world} />  {/* Add your system here */}
      <CameraFollowFocusedSystem world={world} />
    </useKoota.Provider>
  );
}
```

**System ordering rules:**
- State calculations (breath, physics) first
- Movement calculations second
- Position updates third
- Visual sync fourth
- Camera/behavior last

---

## Phase 6: Validation (10 minutes)

### Type Check

```bash
npm run typecheck
```

Should have zero new errors. If errors:
- Check prop types are flat (not nested objects)
- Check trait values are immutable
- Check system function signatures match world.query patterns

### Visual Check

```bash
npm run dev
```

Open browser and verify:
- [ ] Entity appears in 3D scene
- [ ] No console errors
- [ ] Expected visuals render correctly
- [ ] Triplex inspector shows your entity

### Triplex Props Test

In Triplex editor sidebar:
- [ ] Your props appear under your entity
- [ ] Can adjust values and see live updates
- [ ] Slider bounds (@min/@max) work correctly
- [ ] Default values match expectations

### Backward Compatibility

- [ ] Existing entities still render correctly
- [ ] No performance degradation
- [ ] System execution order is correct

---

## Common Patterns to Include

### Pattern: Enable/Disable Toggles

For optional sub-features, use boolean toggles:

```typescript
interface MyEntityProps {
  /**
   * Enable the glow effect
   * @type boolean
   * @default true
   */
  enableGlow?: boolean;

  glowIntensity?: number;
}

export function MyEntity({ enableGlow = true, glowIntensity = 1 }) {
  return (
    <group>
      {/* Main geometry */}
      <mesh geometry={geometry} />

      {/* Optional glow layer */}
      {enableGlow && (
        <mesh scale={1.2}>
          <meshBasicMaterial color="cyan" transparent opacity={glowIntensity} />
        </mesh>
      )}
    </group>
  );
}
```

### Pattern: Props-to-Config Conversion

For complex state, convert flat props to internal config:

```typescript
interface MyConfig {
  opacity: number;
  color: string;
  intensity: number;
}

function propsToConfig(props: MyEntityProps): MyConfig {
  return {
    opacity: props.opacity ?? 0.7,
    color: props.color ?? "#ffffff",
    intensity: props.intensity ?? 1.0,
  };
}

export function MyEntity(props: MyEntityProps = {}) {
  const config = useMemo(() => propsToConfig(props), [props]);

  // Use config internally
  useEffect(() => {
    world.spawn(MyTrait(config));
  }, [config]);
}
```

### Pattern: Context Override

For debug/Triplex flexibility, support context injection:

```typescript
export function MyEntity(props: MyEntityProps = {}) {
  const triplexOverride = useTriplexConfig?.();
  const debugOverride = useMyDebugContext?.();

  const finalProps = useMemo(
    () => ({
      ...props,
      ...debugOverride,      // Debug takes priority
      ...triplexOverride,    // Triplex takes absolute priority
    }),
    [props, debugOverride, triplexOverride]
  );

  // Use finalProps
}
```

---

## Phase 7: Capture Learnings (5 minutes)

After creating your entity, reflect on:

1. **Surprises** - Was anything unexpected?
2. **Patterns** - Did you use any patterns worth documenting?
3. **Gotchas** - Did you hit any edge cases?
4. **Improvements** - What would make this easier next time?

**Example learnings to capture:**
- "Trait ordering matters for system execution"
- "useEffect cleanup is critical for removing entities"
- "Props must be flat for Triplex to work"
- "Context injection prevents production pollution"

---

## Troubleshooting

### Entity Doesn't Appear in Scene
- [ ] Is component rendering a Three.js group/mesh?
- [ ] Is entity being spawned in useEffect?
- [ ] Check browser console for errors
- [ ] Verify entity is added to scene file (breathing.tsx)

### Props Don't Appear in Triplex
- [ ] Are props flat (not nested objects)?
- [ ] Is JSDoc annotation present on props?
- [ ] Did you update sceneDefaults.ts?
- [ ] Did you thread props through scene files?
- [ ] Restart Triplex editor (refresh browser)

### TypeScript Errors
- [ ] Run `npm run typecheck` to see full errors
- [ ] Check trait type signatures match system queries
- [ ] Verify prop types in sceneProps.ts
- [ ] Ensure config interface matches trait initialization

### Performance Issues
- [ ] Are you creating objects in useFrame? (use closure pattern)
- [ ] Consider quality presets if rendering is complex
- [ ] Use instanced rendering for 100+ instances
- [ ] Profile with DevTools Performance tab

### Breathing Sync Not Working
- [ ] Is your system querying BreathPhase trait?
- [ ] Is your system registered in KootaSystems (before other systems that depend on it)?
- [ ] Check BreathPhase values in console: `world.query([BreathPhase])`

---

## Next Steps

After creating your entity:

1. **Test in different scenes** - Verify works in breathing.tsx, debug.scene.tsx
2. **Add debug controls** - Create debug context if entity is complex
3. **Document** - Add entity-specific comments in code
4. **Review with improve-entity workflow** - Use metrics to identify enhancements

---

## Real Examples

Refer to completed entities for implementation examples:

- **Visual-Only:** `src/entities/lighting/` (16 props, 4 toggles)
- **Simple ECS:** `src/entities/camera/` (1 trait, 1 system, minimal props)
- **Complex ECS:** `src/entities/breathingSphere/` (23 props, 5+ traits, shader)

Check `examples.md` in the skill for code walkthroughs.

---

## When to Use This Workflow

✅ Creating entirely new entities from scratch
✅ Adding entities for new features (new level, new mode)
✅ Experimenting with architectural patterns

❌ Not for improving existing entities (use improve-entity workflow)
❌ Not for debugging (use debug-entity workflow)
❌ Not for small tweaks (edit files directly)
