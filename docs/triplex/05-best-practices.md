# Triplex: Best Practices & Pro Tips

Master advanced Triplex techniques for efficient development, clean code, and streamlined workflows.

## Quick Reference

**Key Best Practices:**
- 🎯 **Props as Truth** — Use typed props instead of hooks for portable components
- 🔍 **Debug Scenes** — Isolate components in dedicated debug files
- ⌨️ **Keyboard Shortcuts** — Master scene panel navigation hotkeys
- 📦 **Organize Structure** — Follow consistent file/naming patterns
- 🚀 **Performance First** — Optimize editor experience with smart patterns
- ✅ **Component Testing** — Use React Three Test Renderer for isolated tests
- 🌳 **Project Structure** — Keep entities, levels, and components separated
- 📝 **Version Control** — Commit code changes naturally with Triplex edits

---

## 1. Component Design Patterns

### Pattern: Props as Single Source of Truth

**The Problem**

Development-only hooks like Leva's `useControls` create code that doesn't ship to production:

```typescript
// ❌ BAD - Development-only code
import { useControls } from 'leva'

function Sphere() {
  const { color, scale } = useControls({
    color: "#fff",
    scale: 4,
  })

  return <mesh scale={scale}><sphereGeometry /><meshStandardMaterial color={color} /></mesh>
}

// useControls doesn't exist in Triplex, awkward in production
```

**The Solution**

Design components with typed props that work everywhere:

```typescript
// ✅ GOOD - Portable component
interface SphereProps {
  /**
   * Sphere color value
   * @type color
   */
  color?: string

  /**
   * Scale multiplier
   * @type slider
   * @min 0
   * @max 10
   * @step 0.5
   */
  scale?: number
}

export function Sphere({ color = "#fff", scale = 4 }: SphereProps) {
  return (
    <mesh scale={scale}>
      <sphereGeometry />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// Works in code, Triplex, and production
// Triplex automatically generates UI controls
```

**Benefits:**
- ✅ No development-specific code
- ✅ Single implementation for all environments
- ✅ TypeScript provides documentation and validation
- ✅ Automatic UI control generation in Triplex

### JSDoc Constraint Annotations

**Supported Annotation Tags:**

```typescript
interface ComponentProps {
  // Text input
  /** @type text */
  name?: string

  // Color picker
  /** @type color */
  color?: string

  // Numeric slider with constraints
  /**
   * @type slider
   * @min 0
   * @max 100
   * @step 5
   */
  speed?: number

  // Toggle switch
  /** @type toggle */
  enabled?: boolean

  // Dropdown select
  /**
   * @type select
   * @options low,medium,high
   */
  quality?: string
}
```

**Real-World Example:**

```typescript
interface CameraSetupProps {
  /**
   * Camera position offset from center
   * @type slider
   * @min -5
   * @max 5
   * @step 0.1
   */
  offsetX?: number

  /**
   * Vertical field of view
   * @type slider
   * @min 20
   * @max 120
   * @step 1
   */
  fov?: number

  /**
   * Camera near clipping plane
   * @type slider
   * @min 0.01
   * @max 10
   * @step 0.1
   */
  near?: number

  /**
   * Camera far clipping plane
   * @type slider
   * @min 10
   * @max 10000
   * @step 100
   */
  far?: number
}
```

### Self-Contained Components

**Problem:** Components relying on context fail when tested in Triplex isolation.

**Solution:** Provide sensible defaults as fallbacks:

```typescript
// ❌ PROBLEM - Fails in Triplex isolation
function Character() {
  const world = useKootaWorld()  // Errors if no world provider
  return <mesh />
}

// ✅ GOOD - Self-contained with fallback
function Character({
  world = createDefaultWorld()
}: CharacterProps) {
  return <mesh />
}

// Can be tested alone or with real world
```

---

## 2. Scene Panel Mastery

### Selection Techniques

**Click Cycling**

Click multiple times on overlapping objects to cycle through the selection stack:

```
Click once   → Selects topmost object
Click again  → Selects next object underneath
Click again  → Selects next, etc.
```

**Pro Tip:** Useful for selecting hidden UI elements or deeply nested meshes.

**Hidden Objects**

Use the scene panel to select non-rendering elements:

- Groups without geometry
- Fragment components
- Context providers (invisible)
- Systems without visual representation

**Example:**
```typescript
<group name="environment">  {/* Selectable in scene panel */}
  <Lighting />             {/* No geometry but selectable */}
  <Terrain />
</group>
```

### Name Prop for Organization

**Requirement:** `name` prop must be a **static string literal** (not a variable).

```typescript
// ❌ BAD - Won't appear in scene panel
<mesh name={particleId} />

// ✅ GOOD - Static literal appears in scene panel
<mesh name="particle_01" />
<mesh name="particle_02" />

// Naming pattern helps organize hierarchy
<mesh name="enemy_humanoid_male" />
<mesh name="enemy_creature_spider" />
```

**Organization Pattern:**

```typescript
<group name="scene_main">
  <group name="lights">
    <pointLight name="light_key" />
    <pointLight name="light_fill" />
  </group>

  <group name="entities">
    <mesh name="player" />
    <mesh name="npc_merchant" />
  </group>

  <group name="environment">
    <mesh name="terrain" />
    <mesh name="building_01" />
  </group>
</group>
```

### Keyboard Shortcuts

Essential shortcuts for scene panel navigation:

```
F              → Zoom to selected element
Cmd/Ctrl + D   → Duplicate selected element
Cmd/Ctrl + G   → Group selected elements
Backspace      → Delete selected element
Arrow Keys     → Navigate scene hierarchy (when focused on scene panel)
```

### Element Actions

**Right-Click Context Menu:**

```
Go To Definition    → Navigate to source code
Zoom To Element (F) → Focus camera on element
View Child Elements → Inspect children (even from node_modules)
Duplicate (Cmd+D)   → Create copy with same props
Delete (Backspace)  → Remove from scene
```

---

## 3. Debug Scene Setup

### Isolated Component Testing

**Pattern: Dedicated Debug File**

Create `src/levels/debug.tsx` for testing individual components:

```typescript
// src/levels/debug.tsx
import { axesHelper, gridHelper } from '@react-three/drei'

export function DebugScene() {
  return (
    <>
      {/* Spatial reference */}
      <axesHelper args={[5]} />    {/* X=Red, Y=Green, Z=Blue */}
      <gridHelper args={[10, 10]} />

      {/* Test single components in isolation */}
      <BreathingSphere scale={1} />

      {/* Vary props to test states */}
      <ParticleSystem
        particleCount={50}  {/* Reduced for performance */}
        debugMode={true}
      />

      {/* Override context for testing */}
      <Lighting intensity={0.8} />
    </>
  )
}
```

**Benefits:**
- ✅ Test components without full app overhead
- ✅ Modify props live in Triplex
- ✅ Quick iteration loop
- ✅ Isolated from application state

### Debug API (Experimental)

**Enable in Config:**

```json
// .triplex/config.json
{
  "experimental": {
    "debug_api": true
  }
}
```

**Usage in Components:**

```typescript
function ParticleSystem() {
  useFrame(({ clock }) => {
    const state = calculateComplexPhysics()

    // Log to Triplex debug panel (no console spam)
    window.triplex?.debug({
      particleCount: state.particles.length,
      avgVelocity: state.avgVelocity,
      timestamp: clock.getElapsedTime()
    })
  })

  return <instancedMesh />
}
```

**Benefits:**
- Zero performance overhead when debug_api is off
- Timestamped data points
- Cleaner than console logging
- Inspector integration (experimental)

### Component Isolation Checklist

**Making Components Triplex-Ready:**

```typescript
// 1. No context dependencies
// ❌ BAD
function Component() {
  const world = useContext(WorldContext)  // Fails in isolation
}

// ✅ GOOD
function Component({ world = createDefaultWorld() }: Props) {
  // Has sensible default
}

// 2. Typed props with JSDoc
interface ComponentProps {
  /** @type slider @min 0 @max 10 */
  scale: number
}

// 3. Default values for all props
export function Component({ scale = 1 }: ComponentProps = {}) {
  return <mesh scale={scale} />
}

// 4. Static string names
<mesh name="component_main" />  // ✅ Works
<mesh name={dynamicName} />     // ❌ Fails
```

---

## 4. Provider Configuration

### Koota/ECS Integration

**Setup Pattern:**

```typescript
// .triplex/providers.tsx
import { createSystem } from '@triplex/api'
import { KootaWorld, KootaSystems } from '@/providers'

// Global provider (world and context)
export function GlobalProvider({ children }) {
  return (
    <KootaWorld>
      {children}
    </KootaWorld>
  )
}

// Canvas provider (systems)
export function CanvasProvider({ children }) {
  return (
    <KootaSystems>
      {children}
    </KootaSystems>
  )
}
```

### System Injection for Debugging

**Pattern: Props Control Systems**

```typescript
interface KootaSystemsProps {
  /** @type toggle */
  breathSystemEnabled?: boolean

  /** @type toggle */
  particlePhysicsEnabled?: boolean

  /** @type toggle */
  renderingEnabled?: boolean
}

export function KootaSystems({
  breathSystemEnabled = true,
  particlePhysicsEnabled = true,
  renderingEnabled = true,
}: KootaSystemsProps) {
  const world = useWorld()

  useFrame(() => {
    if (breathSystemEnabled) breathSystem(world)
    if (particlePhysicsEnabled) physicsSystem(world)
    if (renderingEnabled) renderSystem(world)
  })
}

// In Triplex: Toggles appear as checkbox controls!
// Disable physics to see particles at rest
// Disable rendering to test without draw calls
```

### Tailwind CSS Setup (Optional)

**PostCSS Configuration:**

```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Provider Setup:**

```tsx
// .triplex/providers.tsx
import './tailwind.css'

export function GlobalProvider({ children }) {
  return <>{children}</>
}
```

**Benefit:** UI overlays can use Tailwind classes in Triplex.

---

## 5. Performance Optimization

### Transform Controls Improvements (2025)

**New Behavior:** Transform controls now flush updates through props:

```typescript
// Transform edits → component props update → visual changes
function EditableEntity({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: Props) {
  const meshRef = useRef()

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(...position)
      meshRef.current.rotation.set(...rotation)
    }
  }, [position, rotation])

  return (
    <TransformControls>
      <mesh ref={meshRef}>
        <boxGeometry />
        <meshStandardMaterial />
      </mesh>
    </TransformControls>
  )
}

// Drag in Triplex:
// 1. Visual position updates
// 2. Prop updates in code
// 3. Changes save to file
```

**Use Cases Unlocked:**
- Positioning decals on surfaces
- Bone positioning on skinned meshes
- Individual instance manipulation in batched geometries

### Hot Reload Best Practices

**Two-Way Binding:**
- Code changes → Reflected in editor
- Visual changes → Saved back to code

**Modifier Keys for Precision:**

```
Shift → Fine-grained adjustment (0.01 increment)
Ctrl  → Coarse adjustment (10x increment)
```

**Pro Tip:** Use live prop editing to test variations without committing changes.

### Rendering Optimizations

**Object Reuse Pattern:**

```typescript
// ❌ BAD - Creates new geometry per render
{items.map(item => (
  <mesh key={item.id}>
    <boxGeometry />  {/* New geometry each time */}
    <meshStandardMaterial />
  </mesh>
))}

// ✅ GOOD - Reuse shared geometry
const sharedGeometry = new THREE.BoxGeometry()

{items.map(item => (
  <mesh key={item.id} geometry={sharedGeometry}>
    <meshStandardMaterial />
  </mesh>
))}
```

**Cost of Material Compilation:**
- First material of each type compiles shader: ~5-20ms
- Subsequent materials of same type: ~0.5ms
- Minimize unique materials

---

## 6. Testing & Debugging

### React Three Test Renderer

**Basic Component Test:**

```typescript
import { create } from '@react-three/test-renderer'

test('mesh has correct children', async () => {
  const { scene } = await create(<MyMesh />)
  expect(scene.children[0].children.length).toBe(2)
})
```

**Interaction Testing:**

```typescript
test('click updates scale', async () => {
  const { scene, fireEvent } = await create(<InteractiveMesh />)

  await fireEvent.click(scene.children[0])

  expect(scene.children[0].scale).toEqual([2, 2, 2])
})
```

### Debug Helpers from Drei

**Spatial Reference Helpers:**

```typescript
import { axesHelper, gridHelper, BoundsHelper } from '@react-three/drei'

function DebugScene() {
  return (
    <>
      {/* Axes: X=Red, Y=Green, Z=Blue */}
      <axesHelper args={[5]} />

      {/* Grid with fade */}
      <gridHelper
        args={[10, 10]}
        position-y={-5}
      />

      {/* Bounds visualization */}
      <mesh>
        <boxGeometry />
        <BoundsHelper box={{min: [-1,-1,-1], max: [1,1,1]}} />
      </mesh>

      <OrbitControls makeDefault />
    </>
  )
}
```

### Frame Loop Monitoring

**Pattern: Debug Overlay State**

```typescript
function DebugOverlay() {
  const [metrics, setMetrics] = useState({
    fps: 0,
    frameTime: 0,
  })

  useFrame(({ clock }) => {
    // Calculate metrics
    const frameTime = performance.now()
    setMetrics({
      fps: Math.round(1 / clock.getDelta()),
      frameTime: frameTime % 1000,
    })
  })

  return (
    <div className="absolute top-4 left-4 font-mono text-white bg-black/50 p-2">
      <div>FPS: {metrics.fps}</div>
      <div>Frame: {metrics.frameTime.toFixed(1)}ms</div>
    </div>
  )
}
```

---

## 7. Project Organization

### File Structure Pattern

```
src/
├── entities/           # ECS entities (Triplex editable)
│   ├── breath/
│   │   ├── index.tsx       # Component
│   │   ├── traits.tsx      # Data
│   │   └── systems.tsx     # Behavior
│   ├── particle/
│   ├── camera/
│   └── light/
│
├── levels/            # Complete scenes
│   ├── main.tsx       # Production scene
│   ├── debug.tsx      # Debug/test scene
│   └── prototype.tsx  # Prototype experiments
│
├── components/        # UI overlays (not 3D)
│   ├── HUD.tsx
│   └── Menu.tsx
│
├── lib/              # Pure utilities
│   ├── math.ts
│   └── colors.ts
│
├── shared/           # Common traits/systems
│   ├── traits.tsx
│   └── systems.tsx
│
└── .triplex/        # Triplex configuration
    ├── config.json
    └── providers.tsx
```

### Naming Conventions

**Components:**
- PascalCase: `BreathingParticle`, `CameraController`
- Descriptive, domain-specific
- `index.tsx` for main export

**Props:**
- camelCase: `particleCount`, `enableDebug`
- Prefix booleans: `is`, `has`, `should`
  - `isVisible`, `hasPhysics`, `shouldRender`

**Files:**
- Directories: kebab-case: `particle-system`
- Component files: PascalCase: `ParticleSystem.tsx`
- Utilities: camelCase: `breathCalculation.ts`

**3D Names (Static Strings):**
- snake_case: `particle_01`, `light_key`
- Hierarchical: `scene_main/lights/light_fill`

---

## 8. Version Control Integration

### Git Workflow with Triplex

**What Triplex Changes Create:**

Triplex edits save directly to component code:
- Prop changes → Update function signatures
- Visual repositioning → Update position/rotation props
- Hierarchy changes → Component structure updates

**Example Commit:**

```bash
# Make visual changes in Triplex
# Triplex saves changes to code

git status
# Modified: src/entities/breath/index.tsx
# Modified: src/entities/particle/index.tsx

git add src/entities/
git commit -m "feat: Adjust breathing sphere scale and particle distribution"

# Standard Git workflow applies!
```

### What to Commit

✅ **Commit:**
- Component changes from Triplex edits
- `.triplex/config.json` (project settings)
- `.triplex/providers.tsx` (shared context)
- New files created in Triplex

❌ **Don't Commit:**
- Triplex cache files (if any exist)
- Temporary debug outputs
- Personal prop variations

### Collaboration Pattern

**Feature Branch Workflow:**

```bash
# Create feature branch
git checkout -b feature/particle-glow

# Edit in Triplex
# Test variations
# Commit changes

git add src/entities/particle/
git commit -m "feat: Add glow effect to particles during exhale phase"

# Push and create PR
git push -u origin feature/particle-glow
```

---

## 9. Common Gotchas & Solutions

### Gotcha 1: Vertex Shader Shadows

**Problem:** Displacing vertices with GLSL vertex shaders breaks shadow calculations.

**Cause:** Shadow map doesn't reflect displaced geometry.

**Solution:**

```typescript
// ✅ Update shadow map calculations to match displaced geometry
const material = new THREE.ShaderMaterial({
  vertexShader: `
    uniform float displacement;
    void main() {
      vec3 newPos = position + normal * displacement;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,
  // Ensure shadow depth shader matches
  customDepthMaterial: depthMaterial,
})
```

### Gotcha 2: Missing Props in Triplex UI

**Problem:** Component props don't appear as editable controls.

**Cause:** Missing JSDoc annotations or incorrect TypeScript interface.

**Solution:**

```typescript
// ✅ Export interface, use in component
export interface MyComponentProps {
  /**
   * Component scale
   * @type slider
   * @min 0
   * @max 10
   */
  scale?: number
}

export function MyComponent({ scale = 1 }: MyComponentProps) {
  // ...
}
```

### Gotcha 3: Context Dependencies in Isolation

**Problem:** Component errors in Triplex when tested alone.

**Cause:** Missing context provider.

**Solution:**

```typescript
// Option 1: Provide context via .triplex/providers.tsx
// Option 2: Self-contained with fallback
function Component({ world = createDefaultWorld() }: Props) {
  // Works standalone or with real world
}
```

### Gotcha 4: Static String Literal Requirement

**Problem:** `name` prop doesn't appear in scene panel.

**Cause:** Name must be static string literal, not variable.

```typescript
// ❌ WRONG - Variable
<mesh name={getId()} />

// ✅ CORRECT - Static literal
<mesh name="entity_main" />
```

---

## 10. Real-World Workflows

### Iterative Visual Development

**Workflow:**

```
1. Create component with typed props
   ↓
2. Open in Triplex
   ↓
3. Use live prop editing to test variations
   ↓
4. Adjust with transform controls
   ↓
5. Use keyboard modifiers for precision
   ↓
6. Save changes back to code
   ↓
7. Repeat until satisfied
```

**Pro Tip:** Don't commit every iteration—batch related changes into one commit.

### Rapid Prototyping

**Pattern: Prototype Component**

```typescript
interface ProtoProps {
  /**
   * Effect intensity
   * @type slider
   * @min 0
   * @max 10
   * @step 0.5
   */
  intensity?: number

  /**
   * Rotation angle (degrees)
   * @type slider
   * @min 0
   * @max 360
   * @step 15
   */
  rotation?: number
}

export function Prototype({ intensity = 1, rotation = 0 }: ProtoProps) {
  const rad = (rotation * Math.PI) / 180

  return (
    <group rotation-z={rad}>
      <mesh>
        <icosahedronGeometry />
        <meshStandardMaterial emissive="cyan" emissiveIntensity={intensity} />
      </mesh>
    </group>
  )
}

// In Triplex: Adjust sliders in real-time
// See effect immediately
// Iterate rapidly without code changes
```

### Component Inspection

**Use Case:** Debug third-party component internals.

**Process:**

1. Open component in Triplex
2. Right-click → "View Child Elements"
3. Inspect internal structure (even from node_modules)
4. Identify props/structure for your implementation

---

## 11. Key Takeaways & Checklist

### Top 10 Best Practices

1. ✅ **Props over Hooks** — Use typed props for portable components
2. ✅ **JSDoc Annotations** — Add `@type`, `@min`, `@max`, `@step` tags
3. ✅ **Self-Contained** — Provide context defaults or pass as props
4. ✅ **Static Names** — Use string literals for `name` prop
5. ✅ **Keyboard Shortcuts** — Master F, Cmd+D, Cmd+G, Backspace
6. ✅ **Debug Files** — Keep `src/levels/debug.tsx` for testing
7. ✅ **Reuse Objects** — Share geometries/materials across meshes
8. ✅ **Version Control** — Commit Triplex changes as normal code
9. ✅ **Isolation Ready** — Test components in Triplex without app state
10. ✅ **Performance First** — Monitor FPS and material compilation

### Quick Checklist

Before committing components to production:

- [ ] All props have TypeScript interfaces
- [ ] JSDoc annotations present for editable props
- [ ] Component works standalone in Triplex
- [ ] Default values provided for all props
- [ ] Static string used for `name` prop
- [ ] No development-only hooks (Leva, etc.)
- [ ] Geometry/materials are reused where possible
- [ ] Context dependencies have fallbacks
- [ ] Component tested in debug scene
- [ ] Performance acceptable (< 5ms per system)

### Troubleshooting Quick Guide

| Issue | Cause | Solution |
|-------|-------|----------|
| Props not editable | Missing JSDoc | Add `/** @type ... */` annotation |
| Component errors in Triplex | Missing context | Provide default via prop |
| Name not in scene panel | Variable instead of literal | Use `name="static_string"` |
| Hot reload not working | Port mismatch | Check Vite config, restart server |
| Geometry looks wrong | Vertex displacement | Update shadow depth shader |
| Props not updating | Dependency issue | Check useEffect dependencies |

---

## Pro Tips Summary

### Editor Productivity

- Use click cycling to select overlapping objects
- Keyboard modifiers (Shift/Ctrl) for precise adjustments
- Component Switcher to toggle without losing work
- Right-click "Go To Definition" to edit code

### Code Quality

- Export interfaces for all component props
- Use JSDoc constraints for UI validation
- Keep systems focused (one responsibility each)
- Name components and objects descriptively

### Performance

- Profile before optimizing—use Triplex metrics
- Reuse geometries and materials aggressively
- Minimize unique shader materials
- Test in debug scene with reduced counts

### Workflow

- Create `debug.tsx` for each feature
- Commit changes naturally with Triplex edits
- Use feature branches for experimentation
- Document complex systems with comments

---

## Related Resources

- [Triplex Official Documentation](https://triplex.dev/docs/get-started)
- [Replacing Leva With Typed Props](https://triplex.dev/resources/replacing-leva-with-props)
- [Scene Panel Guide](https://triplex.dev/docs/building-your-scene/scene/scene-panel)
- [Triplex Blog - Live Editing Props](https://triplex.dev/blog/v0.56.0-live-editing-props)
- [React Three Fiber Performance](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [React Three Fiber Testing](https://r3f.docs.pmnd.rs/api/testing)
- [Drei Documentation](https://drei.docs.pmnd.rs/)
- [Poimandres Discord Community](https://discord.com/invite/poimandres)
- [Triplex GitHub](https://github.com/pmndrs/triplex)

---

## Community Contribution

Have tips or patterns to share? Contributions welcome!

- **GitHub Issues:** [pmndrs/triplex](https://github.com/pmndrs/triplex/issues)
- **Discussions:** [GitHub Discussions](https://github.com/pmndrs/triplex/discussions)
- **Discord:** Join [Poimandres server](https://discord.com/invite/poimandres)
