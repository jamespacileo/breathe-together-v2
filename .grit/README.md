# Three.js Biome GritQL Plugins

Custom linting rules for Three.js and React Three Fiber projects using Biome's GritQL plugin system.

## Overview

These plugins catch common Three.js/WebGL anti-patterns that lead to:
- **GPU memory leaks** (missing `dispose()` calls)
- **Performance issues** (frame loop allocations)
- **React lifecycle bugs** (event listener leaks)
- **R3F-specific mistakes** (disposing cached resources)

## Available Plugins

### 1. `threejs-memory.grit` (Priority: Critical)

Detects GPU memory leaks from missing disposal patterns.

**Rules:**
- `require_geometry_disposal` - Geometries must be disposed
- `require_material_disposal` - Materials must be disposed
- `require_texture_disposal` - Textures must be disposed
- `require_rendertarget_disposal` - Render targets must be disposed
- `no_renderer_in_component_body` - Renderer creation in wrong scope

**Example Issue:**
```typescript
// ❌ Will flag this
const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 4), []);

// ✅ Fix: Add cleanup
const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 4), []);
useEffect(() => () => geometry.dispose(), [geometry]);
```

### 2. `threejs-performance.grit` (Priority: High)

Detects performance anti-patterns in frame loops.

**Rules:**
- `no_new_in_useframe` - No object allocations in `useFrame`
- `no_clone_in_useframe` - No `.clone()` calls in frame loops
- `no_array_allocation_in_useframe` - No array literals in hot paths
- `prefer_set_over_copy_new` - Use `.set()` instead of `.copy(new Vector())`
- `no_object_spread_in_useframe` - Avoid object spread in loops

**Example Issue:**
```typescript
// ❌ Will flag this - creates new object every frame
useFrame(() => {
  mesh.position.copy(new THREE.Vector3(x, y, z));
});

// ✅ Fix: Use .set() or reuse temp object
const tempVec = new THREE.Vector3();
useFrame(() => {
  mesh.position.copy(tempVec.set(x, y, z));
});
```

### 3. `r3f-hooks.grit` (Priority: Medium)

React Three Fiber specific patterns and hook rules.

**Rules:**
- `no_conditional_r3f_hooks` - R3F hooks must be unconditional
- `require_event_cleanup` - `addEventListener` needs cleanup
- `no_dispose_loader_resources` - Don't dispose `useLoader` resources
- `prefer_primitive_for_threejs_objects` - Use `<primitive>` correctly
- `useframe_return_void` - Frame callbacks shouldn't return values
- `require_primitive_disposal` - Cleanup for `<primitive>` objects

**Example Issue:**
```typescript
// ❌ Will flag this - disposing cached resource
const texture = useLoader(THREE.TextureLoader, '/texture.png');
useEffect(() => () => texture.dispose(), [texture]); // Wrong!

// ✅ Fix: Let R3F manage lifecycle
const texture = useLoader(THREE.TextureLoader, '/texture.png');
// No manual disposal needed
```

## Installation

### Step 1: Enable Plugins in `biome.json`

```json
{
  "plugins": [
    "./.grit/threejs-memory.grit",
    "./.grit/threejs-performance.grit",
    "./.grit/r3f-hooks.grit"
  ]
}
```

### Step 2: Run Linter

```bash
# Check files
npx biome check src/

# Check and apply safe fixes (when available)
npx biome check --write src/

# Check specific file
npx biome check src/entities/particle/index.tsx
```

## Configuration

### Severity Levels

You can adjust severity by modifying the `severity` parameter in each `.grit` file:

```gritql
register_diagnostic(
  span = $pattern,
  message = "Description",
  severity = "error"  // Options: "error", "warn", "info", "hint"
)
```

### Disable Specific Rules

To disable a rule, comment out the pattern in the `.grit` file:

```gritql
or {
  require_geometry_disposal(),
  // require_material_disposal(),  // Disabled
  require_texture_disposal()
}
```

### Per-File Suppressions

Use Biome's comment directives:

```typescript
// biome-ignore lint(grit): Intentional pattern - shared geometry across components
const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 4), []);
```

## Testing Plugins

### Validate GritQL Syntax

```bash
# Check if .grit files are valid
npx biome check .grit/

# Test against specific file
npx biome check src/entities/earthGlobe/index.tsx --max-diagnostics=50
```

### Example Test Cases

Create test files in `.grit/test/`:

```typescript
// .grit/test/memory-leak.test.tsx
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

// Should flag: Missing disposal
export function BadGeometry() {
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 4), []);
  return <mesh geometry={geometry} />;
}

// Should pass: Proper disposal
export function GoodGeometry() {
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 4), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} />;
}
```

## Performance Impact

GritQL plugins use Biome's Scanner for multi-file analysis:
- **Expected overhead:** 10-20% slower than basic linting
- **Still faster than ESLint:** 10-15x faster overall
- **Recommendation:** Use in CI/CD and pre-commit hooks

## Roadmap

### Phase 1: Core Rules ✅
- [x] Memory leak detection (5 rules)
- [x] Performance optimization (5 rules)
- [x] R3F hooks patterns (6 rules)

### Phase 2: Advanced Patterns (Planned)
- [ ] Class component support
- [ ] Shared resource tracking
- [ ] WebGL context state validation
- [ ] Shader uniform type checking

### Phase 3: Auto-Fix (Future)
- [ ] Waiting for Biome GritQL rewrite operator (`=>`)
- [ ] Auto-add `useEffect` disposal cleanup
- [ ] Auto-convert `.copy(new Vector())` to `.set()`

## Contributing

### Adding New Rules

1. Choose the appropriate `.grit` file based on category
2. Add pattern function:
```gritql
pattern my_new_rule() {
  `$pattern` where {
    register_diagnostic(
      span = $pattern,
      message = "Clear description of issue and fix",
      severity = "warn"
    )
  }
}
```
3. Add to `or` block at bottom of file
4. Test against real code
5. Document in this README

### Reporting Issues

Found a false positive or missing pattern?
1. Create test case in `.grit/test/`
2. Document expected vs actual behavior
3. Submit GitHub issue with test case

## Resources

### Documentation
- [Biome GritQL Reference](https://biomejs.dev/reference/gritql/)
- [GritQL Tutorial](https://docs.grit.io/tutorials/gritql)
- [Three.js Disposal Guide](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects)
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)

### Tools
- [Biome Playground](https://biomejs.dev/playground/) - Test GritQL patterns interactively
- [Three.js Forum](https://discourse.threejs.org/) - Community discussions on best practices

## FAQ

**Q: Why GritQL instead of ESLint?**
A: Biome is 15x faster and has better performance. GritQL offers more precise structural matching than ESLint's AST selectors.

**Q: Can I use this with ESLint's @react-three/eslint-plugin?**
A: Yes! They're complementary. This plugin has more rules (16 vs 2) but ESLint has auto-fix capabilities.

**Q: Will this slow down my build?**
A: Minimal impact. GritQL adds 10-20% overhead to linting, but Biome is still 10-15x faster than ESLint overall.

**Q: Can I disable specific rules?**
A: Yes, comment out patterns in `.grit` files or use `biome-ignore` comments in source code.

**Q: Do these rules work with vanilla Three.js (non-React)?**
A: Partially. Memory leak detection works, but R3F-specific rules won't apply. We recommend using these rules even in vanilla Three.js projects for the memory leak detection alone.

**Q: When will auto-fix be available?**
A: Waiting on Biome to implement GritQL rewrite operator (`=>`). Follow [biome#1762](https://github.com/biomejs/biome/discussions/1762) for updates.

## License

MIT - Same as parent project

## Acknowledgments

- Biome team for GritQL plugin system
- @react-three/eslint-plugin for rule inspiration
- Three.js community for anti-pattern documentation
- breathe-together-v2 project for real-world testing

---

**Version:** 1.0.0-beta
**Last Updated:** January 2, 2026
**Maintainer:** breathe-together-v2 project
