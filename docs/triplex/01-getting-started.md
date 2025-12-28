# Triplex: Getting Started

Set up and master the Triplex visual editor for React Three Fiber.

## What is Triplex?

Triplex is a visual workspace for building React Three Fiber components. Drag components to place them, edit props in the sidebar, and write code when needed.

## Quick Start

### 1. Install

```bash
npm install triplex --save-dev
```

### 2. Configure

Create `.triplex/config.json`:

```json
{
  "components": ["src/entities/**/*.tsx", "src/levels/**/*.tsx"],
  "production": {
    "include": ["src/**"]
  }
}
```

### 3. Run Dev Server

```bash
npm run dev
# Then open Triplex UI at localhost:5173 (with Vite)
```

### 4. Start Editing

- Drag components to place them
- Edit props in sidebar
- Changes hot-reload instantly

---

## Triplex Provider Architecture

### The Pattern

In **breathe-together-v2** (`.triplex/providers.tsx`):

```typescript
// Re-export providers so Triplex can access them
export { GlobalProvider, CanvasProvider } from '../src/contexts/triplex'
```

Triplex wraps the scene with these providers so ECS systems and shared state are available.

### Simple Configuration

Props override component defaults directly:

```typescript
<CanvasProvider breathSystemEnabled>
  <BreathingLevel sphereColor="#ff0000" />
</CanvasProvider>
```

---

## JSDoc Annotations for Triplex

Make props editable in Triplex sidebar:

```typescript
interface MyComponentProps {
  /**
   * @type color
   */
  color?: string

  /**
   * @type slider
   * @min 0
   * @max 100
   * @step 5
   */
  speed?: number

  /**
   * @type toggle
   */
  enabled?: boolean
}

function MyComponent({ color = 'red', speed = 50, enabled = true }: MyComponentProps) {
  // ...
}
```

### Available Annotations

```typescript
// Text input
/** @type text */
name?: string

// Color picker
/** @type color */
color?: string

// Slider
/** @type slider
 *  @min 0
 *  @max 100
 *  @step 1
 */
value?: number

// Toggle
/** @type toggle */
enabled?: boolean

// Select dropdown
/** @type select
 *  @options subtle,balanced,bold
 */
mode?: string
```

---

## Debug Toggles in Triplex

### System Toggles

In **breathe-together-v2**, Triplex exposes system toggles as props:

```typescript
interface CanvasProviderProps {
  breathSystemEnabled?: boolean
  particlePhysicsSystemEnabled?: boolean
}

function CanvasProvider({ breathSystemEnabled = true }: CanvasProviderProps) {
  useFrame(() => {
    if (breathSystemEnabled) breathSystem()
    // ...
  })
}
```

Then in Triplex, you can toggle these on/off to debug:
- Disable breathSystem → see particles without animation
- Disable physics → see particles freeze at rest

---

## Visual Editing Best Practices

### 1. Use `<group>` for Composition

```typescript
function Scene() {
  return (
    <group>
      <Player />
      <Environment />
      <Particles />
    </group>
  )
}
```

Triplex can drag/reorder groups.

### 2. Expose Key Props

```typescript
interface PlayerProps {
  /** @type slider @min 0 @max 10 @step 0.1 */
  scale?: number

  /** @type color */
  color?: string

  /** @type toggle */
  visible?: boolean
}
```

### 3. Keep Components Testable

Components should work standalone and in Triplex:

```typescript
function Box({ position = [0, 0, 0], ...props }) {
  return (
    <mesh position={position} {...props}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}

// Works in code: <Box position={[1, 2, 3]} />
// Works in Triplex: Can drag to edit position visually
```

---

## Troubleshooting Triplex

### Component Not Appearing

1. Check `.triplex/config.json` includes the file path
2. Verify the component exports JSX
3. Check browser console for errors

### Props Not Editable

1. Add JSDoc annotations to interface
2. Use standard types (string, number, boolean)
3. Restart dev server

### Hot-reload Not Working

1. Check that vite is running on correct port
2. Verify `.triplex/providers.tsx` exports correctly
3. Restart Triplex UI

---

## Related Resources

- [Triplex Official](https://triplex.dev/)
- [Configuration Guide](https://triplex.dev/docs/config)
- [Next: Configuration Patterns](./02-configuration-patterns.md)

---

## Pro Tips

1. Start with isolated components in Triplex
2. Use props for anything you want to tune
3. Keep systems' debug toggles accessible
4. Export multiple preview variants
5. Use color pickers for material properties
