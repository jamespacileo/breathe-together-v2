# React Three Fiber: Prioritized Implementation Plan

**Generated:** 2026-01-05
**Source:** React Three Fiber Ecosystem Research Report
**Branch:** `claude/research-react-three-fiber-CzvuC`

---

## Priority Matrix

Priorities based on:
- **Impact:** Performance gain, UX improvement, accessibility, visual quality
- **Effort:** Lines of code, testing complexity, learning curve
- **Risk:** Breaking changes, browser compatibility, maintenance burden

---

## 🔴 P0: Critical - Immediate Implementation (This Week)

### 1. Mobile Performance - AdaptiveDpr
**Effort:** 5 minutes | **Impact:** 🔥 High | **Risk:** ✅ Low

**Why:** Mobile users likely experiencing <30fps on particle animations.

**Implementation:**
```tsx
// src/levels/breathing.tsx
import { AdaptiveDpr } from '@react-three/drei'

<Canvas>
  <AdaptiveDpr pixelated />
  {/* existing scene */}
</Canvas>
```

**Expected Outcome:** 2-3x FPS improvement on low-end mobile devices.

**Testing:** Test on iPhone SE (375px), Android mid-range, iPad.

---

### 2. Accessibility - Screen Reader Support
**Effort:** 30 minutes | **Impact:** 🔥 High | **Risk:** ✅ Low

**Why:** WebGL content is invisible to screen readers. Legal/ethical requirement.

**Implementation:**
```bash
npm install @react-three/a11y
```

```tsx
// src/levels/breathing.tsx
import { A11yAnnouncer, A11y } from '@react-three/a11y'

// Wrap Canvas sibling
<>
  <Canvas>
    <A11y
      role="content"
      description={`Breathing meditation - ${phaseLabel} phase`}
    >
      <EarthGlobe />
    </A11y>

    <A11y role="content" description="Atmospheric particles orbiting in sync with breath">
      <ParticleSwarm />
    </A11y>
  </Canvas>
  <A11yAnnouncer />
</>
```

**Hook Integration:**
```tsx
// src/hooks/useReducedMotion.ts
import { useA11y } from '@react-three/a11y'

export function useReducedMotion() {
  const a11y = useA11y()
  return a11y?.prefersReducedMotion ?? false
}

// Usage in systems
const shouldAnimate = !useReducedMotion()
```

**Expected Outcome:**
- ARIA labels for screen readers
- Respect `prefers-reduced-motion` (disable particle animations for vestibular disorders)
- WCAG 2.1 Level AA compliance

**Testing:**
- macOS VoiceOver (Cmd+F5)
- Chrome DevTools → Rendering → Emulate prefers-reduced-motion

---

### 3. Performance Monitoring - r3f-perf
**Effort:** 10 minutes | **Impact:** 🔥 High | **Risk:** ✅ Low

**Why:** No visibility into render performance bottlenecks.

**Implementation:**
```bash
npm install r3f-perf
```

```tsx
// src/levels/breathing.tsx
import { Perf } from 'r3f-perf'

<Canvas>
  {import.meta.env.DEV && <Perf position="top-left" />}
  {/* existing scene */}
</Canvas>
```

**Metrics to Monitor:**
- FPS (target: 60fps)
- Draw calls (target: <500)
- Triangles (current: ~300 particles × icosahedron detail)
- Texture memory

**Expected Outcome:**
- Identify particle system bottlenecks
- Measure impact of future optimizations
- Mobile performance baselines

---

### 4. Asset Preloading - Earth Texture
**Effort:** 10 minutes | **Impact:** Medium | **Risk:** ✅ Low

**Why:** Prevent flash when earth texture loads.

**Implementation:**
```tsx
// src/app.tsx
import { useTexture } from '@react-three/drei'

function App() {
  useEffect(() => {
    // Preload before Canvas mounts
    useTexture.preload('/textures/earth-texture.png')
  }, [])

  return <BreathingLevel />
}
```

**Expected Outcome:** Eliminate texture pop-in during initial load.

---

## 🟡 P1: High Impact - This Month

### 5. Organized Leva Controls
**Effort:** 1 hour | **Impact:** Medium | **Risk:** ✅ Low

**Why:** 171+ props in flat list overwhelming for developers.

**Implementation:**
```tsx
// src/hooks/useDevControls.ts
import { folder, useControls } from 'leva'

export function useDevControls() {
  return useControls({
    Scene: folder({
      backgroundColor: '#f5f1e8',
      sphereColor: '#d4a574',
      sphereOpacity: { value: 0.12, min: 0, max: 1, step: 0.01 },
    }),

    Particles: folder({
      particleCount: { value: 300, min: 50, max: 1000, step: 50 },
      orbitRadius: { value: 3.5, min: 1, max: 10, step: 0.1 },
    }),

    Lighting: folder({
      environmentPreset: { value: 'meditation', options: ['meditation', 'cosmic', 'minimal', 'studio'] },
      ambientIntensity: { value: 0.4, min: 0, max: 1, step: 0.05 },
    }),

    Debug: folder({
      showOrbitBounds: false,
      showParticleStats: false,
      isPaused: false,
    }, { collapsed: true }),
  })
}
```

**Expected Outcome:**
- Collapsible sections reduce cognitive load
- Debug controls hidden by default
- Easier onboarding for new developers

---

### 6. Environment Preset Exploration
**Effort:** 1 hour | **Impact:** Medium | **Risk:** ✅ Low

**Why:** drei `Stage` component already in use - explore other presets for visual variety.

**Implementation:**
```tsx
// src/entities/environment/index.tsx
const PRESET_MAP = {
  meditation: { stage: 'soft', shadows: false },
  cosmic: { stage: 'rembrandt', shadows: true },
  minimal: { stage: 'portrait', shadows: false },
  studio: { stage: 'upfront', shadows: true },
}

// Try different Stage presets
<Stage
  preset={PRESET_MAP[environmentPreset].stage}
  intensity={0.4}
  shadows={PRESET_MAP[environmentPreset].shadows}
>
  {/* existing environment */}
</Stage>
```

**Alternative Approach:**
```tsx
// Replace manual lighting with Environment HDRI
import { Environment } from '@react-three/drei'

<Environment
  preset="sunset"  // or files="/hdri/meditation.hdr"
  blur={0.8}
  background={false}
/>
```

**Testing Matrix:**
| Preset | Aesthetic | Performance | Mobile |
|--------|-----------|-------------|--------|
| soft | Warm, even | ✅ Fast | ✅ Yes |
| rembrandt | Dramatic shadows | ⚠️ Medium | ⚠️ Test |
| sunset HDRI | Golden hour | ⚠️ Medium | ⚠️ Test |

**Expected Outcome:**
- Richer lighting with minimal code
- User preference setting for mood

---

### 7. Zustand for UI State Management
**Effort:** 2 hours | **Impact:** Medium | **Risk:** ⚠️ Medium

**Why:** Koota ECS overkill for UI state (modals, settings). Separate concerns.

**Current Architecture:**
- Koota: Entity/component/system data (breathing, particles)
- React useState: UI state (modal open/closed, audio volume)

**Proposed Hybrid:**
- Koota: 3D world state
- Zustand: App/UI state

**Implementation:**
```bash
npm install zustand
```

```tsx
// src/stores/uiStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  // Modal state
  isSettingsOpen: boolean
  isAudioSettingsOpen: boolean

  // User preferences
  audioVolume: number
  reducedMotion: boolean

  // Actions
  openSettings: () => void
  closeSettings: () => void
  setAudioVolume: (volume: number) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      isSettingsOpen: false,
      isAudioSettingsOpen: false,
      audioVolume: 0.5,
      reducedMotion: false,

      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      setAudioVolume: (volume) => set({ audioVolume: volume }),
    }),
    {
      name: 'breathe-together-ui',  // localStorage key
    }
  )
)
```

```tsx
// Usage in components
import { useUIStore } from '@/stores/uiStore'

function SimpleGaiaUI() {
  const { isSettingsOpen, openSettings, closeSettings } = useUIStore()

  return (
    <>
      <button onClick={openSettings}>Settings</button>
      {isSettingsOpen && <SettingsModal onClose={closeSettings} />}
    </>
  )
}
```

**Migration Path:**
1. Create Zustand store
2. Migrate modal state from useState
3. Migrate audio settings
4. Add localStorage persistence
5. Remove redundant useState

**Expected Outcome:**
- Persistent user preferences across sessions
- Cleaner component code (less prop drilling)
- Separation of concerns (3D world vs UI state)

**Risk Mitigation:**
- Keep Koota for 3D entities (don't migrate breathing/particle state)
- Gradual migration (one feature at a time)

---

## 🟢 P2: Enhancement - Next Quarter

### 8. Subtle Bloom Post-Processing
**Effort:** 2 hours | **Impact:** Medium | **Risk:** ⚠️ Medium

**Why:** Enhance "glowing breath" aesthetic during exhale phase.

**Implementation:**
```bash
npm install @react-three/postprocessing postprocessing
```

```tsx
// src/levels/breathing.tsx
import { EffectComposer, Bloom } from '@react-three/postprocessing'

<Canvas>
  <Scene />

  <EffectComposer>
    <Bloom
      intensity={0.3}
      luminanceThreshold={0.95}  // Only bloom very bright objects
      luminanceSmoothing={0.025}
      mipmapBlur  // Performance optimization
    />
  </EffectComposer>
</Canvas>
```

**Dynamic Bloom (Breath-Synced):**
```tsx
// Increase bloom intensity during exhale
const bloomIntensity = breathPhase > 0.5 ? 0.5 : 0.2
```

**Performance Impact:**
- Adds 1-2 render passes
- Mobile: Test on mid-range devices
- Fallback: Disable on low FPS

**Expected Outcome:**
- Subtle glow on particles during exhale
- Enhanced meditation aesthetic
- 5-10% FPS cost

**Testing:**
- Desktop: Should maintain 60fps
- Mobile: Monitor with r3f-perf, disable if <30fps

---

### 9. Custom Shader Material - Breathing Glow
**Effort:** 4 hours | **Impact:** High | **Risk:** ⚠️ Medium

**Why:** Add vertex displacement + glow synchronized to breath phase without losing refraction.

**Implementation:**
```bash
npm install three-custom-shader-material
```

```tsx
// src/entities/particle/BreathingTransmissionMaterial.tsx
import CustomShaderMaterial from 'three-custom-shader-material'
import { MeshTransmissionMaterial } from '@react-three/drei'

const vertexShader = `
  uniform float breathPhase;

  void main() {
    // Vertex displacement during exhale
    vec3 displaced = position + normal * breathPhase * 0.1;
    csm_Position = displaced;
  }
`

const fragmentShader = `
  uniform float breathPhase;
  uniform vec3 glowColor;

  void main() {
    // Add glow during exhale
    float glow = breathPhase * 0.3;
    csm_DiffuseColor = vec4(glowColor * glow, 1.0);
  }
`

<CustomShaderMaterial
  baseMaterial={MeshTransmissionMaterial}
  vertexShader={vertexShader}
  fragmentShader={fragmentShader}
  uniforms={{
    breathPhase: { value: 0 },
    glowColor: { value: new THREE.Color(0.3, 0.8, 1.0) }
  }}
  // Inherit transmission props
  transmission={1}
  thickness={0.5}
  roughness={0}
/>
```

**Expected Outcome:**
- Particles "breathe" with vertex displacement
- Subtle cyan glow during exhale
- Maintains refraction/transmission

**Learning Resources:**
- [Maxime Heckel - Shader Study](https://blog.maximeheckel.com/posts/the-study-of-shaders-with-react-three-fiber/)
- [three-custom-shader-material Docs](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial)

**Risk Mitigation:**
- Create separate branch for shader work
- A/B test with current material
- Fallback to MeshTransmissionMaterial if shader errors

---

### 10. MeshReflectorMaterial for Floor
**Effort:** 1 hour | **Impact:** Medium | **Risk:** ✅ Low

**Why:** Add subtle reflections to floor for depth.

**Implementation:**
```tsx
// src/entities/environment/Floor.tsx
import { MeshReflectorMaterial } from '@react-three/drei'

<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
  <planeGeometry args={[50, 50]} />
  <MeshReflectorMaterial
    blur={[400, 100]}  // Blur reflection
    resolution={512}   // Lower for performance
    mixBlur={0.5}
    mixStrength={0.3}  // Subtle reflection
    mirror={0}         // Not a perfect mirror
    color="#f5f1e8"    // Match background
  />
</mesh>
```

**Performance Impact:**
- Adds 1 render pass for reflections
- Mobile: Use resolution={256}

**Expected Outcome:**
- Subtle floor reflections of particles
- Enhanced depth perception
- Monument Valley aesthetic

---

### 11. Sparkles During Exhale Phase
**Effort:** 30 minutes | **Impact:** Low | **Risk:** ✅ Low

**Why:** Visual feedback for "releasing breath" moment.

**Implementation:**
```tsx
// src/entities/environment/BreathSparkles.tsx
import { Sparkles } from '@react-three/drei'

function BreathSparkles() {
  const breathPhase = useBreathPhase()
  const isExhale = breathPhase < 0.42  // Exhale phase (11s of 19s cycle)

  if (!isExhale) return null

  return (
    <Sparkles
      count={20}
      speed={0.3}
      opacity={0.3 * breathPhase}  // Fade in/out
      color="#4dd9e8"
      size={1}
      scale={[10, 10, 10]}
      noise={1}
    />
  )
}
```

**Expected Outcome:**
- Subtle sparkle effect during exhale only
- Reinforces breathing cycle visually
- Minimal performance cost

---

## 🔵 P3: Future/Research - Next 6 Months

### 12. GPU-Based Particle System (10k+ Particles)
**Effort:** 20 hours | **Impact:** 🔥 High | **Risk:** 🔴 High

**Why:** Scale from 300 → 10,000 particles for richer atmosphere.

**Current Bottleneck:**
- JavaScript updates 300 particle positions per frame
- CPU-bound (main thread)
- Can't scale beyond ~1000 particles at 60fps

**Solution:** Move particle physics to GPU shaders.

**Implementation Pattern (from Maxime Heckel):**
```tsx
// 1. Store particle data in FBO texture (not JavaScript arrays)
const particleData = useFBO(256, 256)  // 65,536 particles max

// 2. Update positions in shader (runs on GPU)
const updateShader = `
  uniform float time;
  uniform float breathPhase;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 particle = texture2D(particleData, uv);

    // Physics calculations in shader
    vec3 velocity = particle.xyz;
    vec3 position = particle.xyz + velocity * delta;

    gl_FragColor = vec4(position, 1.0);
  }
`

// 3. Render particles using data texture
<points>
  <bufferGeometry>
    <bufferAttribute
      attach="attributes-position"
      count={particleCount}
      array={new Float32Array(particleCount * 3)}
      itemSize={3}
    />
  </bufferGeometry>
  <shaderMaterial
    uniforms={{
      particleData: { value: particleData.texture }
    }}
  />
</points>
```

**Learning Path:**
1. Complete [Maxime Heckel - Particle Systems](https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/)
2. Study [wawa-sensei/r3f-particles](https://github.com/wawawasensei/r3f-particles)
3. Build prototype with 1000 particles
4. Scale to 10,000 particles
5. A/B test with current system

**Expected Outcome:**
- 10,000+ particles at 60fps
- Complex motion (curl noise, flow fields)
- Lower CPU usage (moves to GPU)

**Risk Assessment:**
- **High learning curve:** GLSL shader programming
- **Debugging difficulty:** GPU debugging harder than JavaScript
- **Maintenance:** Harder to modify than JavaScript physics
- **Browser compatibility:** Requires WebGL 2.0 (98% support)

**Go/No-Go Decision:**
- ✅ Go if: User feedback requests "more particles"
- ❌ No-go if: 300 particles sufficient for meditation aesthetic

---

### 13. Theatre.js Animation Sequencing
**Effort:** 8 hours | **Impact:** Low | **Risk:** ⚠️ Medium

**Why:** Add "onboarding" animation sequence for first-time users.

**Use Case:**
- Camera flythrough on first visit
- Introduce breathing cycle visually
- Fade in UI elements sequentially

**Implementation:**
```bash
npm install @theatre/core @theatre/studio @theatre/r3f
```

```tsx
// src/animations/onboarding.tsx
import { SheetProvider, editable as e } from '@theatre/r3f'

function OnboardingAnimation() {
  const sheet = getProject('Onboarding').sheet('CameraFlight')

  useEffect(() => {
    sheet.sequence.play({ iterationCount: 1 })
  }, [])

  return (
    <SheetProvider sheet={sheet}>
      <e.perspectiveCamera
        theatreKey="camera"
        makeDefault
        position={[10, 5, 10]}
      />

      <e.group theatreKey="earth">
        <EarthGlobe />
      </e.group>
    </SheetProvider>
  )
}
```

**Expected Outcome:**
- Professional onboarding experience
- Visual education of breathing cycle
- Higher user engagement

**Risk:**
- Adds complexity for single-use animation
- Theater.js learning curve
- May annoy users who want to start immediately

**Alternative:** Simple CSS/Framer Motion fade-in (lower effort)

---

### 14. WebGPU / React Three Fiber TSL Migration
**Effort:** 40+ hours | **Impact:** Unknown | **Risk:** 🔴 High

**Why:** Future-proof for next-generation rendering API.

**What is WebGPU:**
- Successor to WebGL
- Lower-level GPU access
- Better performance (multi-threading)
- Modern shader language (WGSL, not GLSL)

**Current Status (Jan 2026):**
- Chrome/Edge: Shipped
- Firefox: In development
- Safari: Experimental flag
- Three.js: r167+ supports WebGPU
- React Three Fiber: Experimental support

**Migration Complexity:**
- Rewrite all shaders (GLSL → WGSL)
- Different rendering pipeline
- Limited drei support
- Debugging tools immature

**Recommendation:**
- ⏸️ Wait until 2027
- Monitor Three.js WebGPU development
- Reassess when Safari ships stable support

---

## 📊 Implementation Roadmap

### Week 1 (Jan 6-12, 2026)
- [ ] Add AdaptiveDpr (5 min)
- [ ] Add r3f-perf monitoring (10 min)
- [ ] Preload earth texture (10 min)
- [ ] Add accessibility (A11y) support (30 min)
- [ ] Test on mobile devices (2 hours)

**Deliverable:** Mobile performance improved, accessibility compliance achieved.

---

### Week 2-3 (Jan 13-26, 2026)
- [ ] Organize Leva controls into folders (1 hour)
- [ ] Explore Environment presets (1 hour)
- [ ] Implement Zustand for UI state (2 hours)
- [ ] Test and refine (2 hours)

**Deliverable:** Better developer experience, persistent user preferences.

---

### Month 2 (Feb 2026)
- [ ] Add subtle Bloom post-processing (2 hours)
- [ ] Implement MeshReflectorMaterial floor (1 hour)
- [ ] Add Sparkles during exhale (30 min)
- [ ] Performance testing and optimization (4 hours)

**Deliverable:** Enhanced visual aesthetic, maintained 60fps.

---

### Month 3 (Mar 2026)
- [ ] Custom shader material (breathing glow) (4 hours)
- [ ] A/B test shader vs current material (2 hours)
- [ ] User testing and feedback (ongoing)

**Deliverable:** Breath-synchronized visual effects.

---

### Q2 2026 (Research Phase)
- [ ] Complete Maxime Heckel shader course
- [ ] Build GPU particle prototype
- [ ] Evaluate Theatre.js for onboarding
- [ ] Monitor WebGPU browser support

**Deliverable:** Technical feasibility assessment for advanced features.

---

## 🧪 Testing Strategy

### Performance Benchmarks
| Device | Target FPS | Particle Count | Post-Processing |
|--------|-----------|----------------|-----------------|
| Desktop (M1/M2) | 60fps | 300-1000 | Yes (Bloom) |
| iPad Pro | 60fps | 300-500 | Yes (reduced) |
| iPhone 14 | 45-60fps | 300 | Conditional |
| iPhone SE | 30-45fps | 150-300 | No |
| Android Mid-Range | 30fps | 150-300 | No |

**AdaptiveDpr should handle fallback automatically.**

---

### Accessibility Testing
- [x] macOS VoiceOver (Cmd+F5)
- [ ] Windows Narrator
- [ ] NVDA screen reader
- [ ] Chrome DevTools → Lighthouse (Accessibility score)
- [ ] prefers-reduced-motion emulation

**Target:** WCAG 2.1 Level AA compliance.

---

### Browser Compatibility
| Browser | Version | WebGL | WebGPU | Notes |
|---------|---------|-------|--------|-------|
| Chrome | 120+ | ✅ | ✅ | Primary target |
| Firefox | 120+ | ✅ | ⚠️ Dev | Test regularly |
| Safari | 17+ | ✅ | ❌ | iOS primary concern |
| Edge | 120+ | ✅ | ✅ | Chromium-based |

**Test Matrix:** Chrome (desktop), Safari (iPhone), Firefox (desktop).

---

## 📚 Learning Resources

### Immediate (P0-P1 Implementation)
- [drei Documentation](https://github.com/pmndrs/drei) - AdaptiveDpr, A11y, Environment
- [r3f-perf Documentation](https://github.com/RenaudRohlinger/r3f-perf)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [React Three Fiber Performance Guide](https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance)

### Advanced (P2-P3 Research)
- [Maxime Heckel - Shader Study](https://blog.maximeheckel.com/posts/the-study-of-shaders-with-react-three-fiber/)
- [Maxime Heckel - GPU Particles](https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/)
- [three-custom-shader-material](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial)
- [Theatre.js Documentation](https://www.theatrejs.com/docs/latest/getting-started)
- [Three.js Journey Course](https://threejs-journey.com/) - Comprehensive paid course

---

## 🚫 Explicitly Deprioritized

These were considered but rejected:

### On-Demand Rendering
**Why rejected:** Breathing animation is continuous (UTC-synced). Requires 60fps rendering.

### use-gesture (Drag Interactions)
**Why rejected:** Meditation app is non-interactive 3D. No user manipulation needed.

### gltfjsx (3D Model Converter)
**Why rejected:** Using procedural geometry (spheres, icosahedrons). No artist-created assets.

### @react-three/offscreen (Worker Canvas)
**Why rejected:** Experimental, no Safari support, harder debugging. Wait for maturity.

### Physics Libraries (Cannon.js, Rapier)
**Why rejected:** No collision detection needed. Breathing animation is deterministic.

### BakeShadows
**Why rejected:** Scene is animated (particles moving). Only works for static scenes.

---

## ✅ Success Criteria

### P0 Complete When:
- [ ] Mobile FPS improves 2x (measured via r3f-perf)
- [ ] Screen readers announce "Breathing sphere - [phase]"
- [ ] `prefers-reduced-motion` disables particle animations
- [ ] Lighthouse Accessibility score ≥90
- [ ] No texture flash on page load

### P1 Complete When:
- [ ] Leva controls organized into <5 top-level folders
- [ ] User preferences persist across sessions (localStorage)
- [ ] Environment preset can be changed via UI setting
- [ ] Developer onboarding time reduced (subjective feedback)

### P2 Complete When:
- [ ] Bloom effect visible during exhale phase
- [ ] Desktop maintains 60fps with post-processing
- [ ] Mobile devices gracefully degrade (disable bloom if <30fps)
- [ ] Custom shader material matches current visual quality

---

## 📝 Notes

### Architectural Principles
1. **Separation of Concerns:** Koota for 3D entities, Zustand for UI state
2. **Progressive Enhancement:** Features degrade gracefully on low-end devices
3. **Performance Budget:** 60fps desktop, 30fps mobile minimum
4. **Accessibility First:** WCAG 2.1 Level AA compliance non-negotiable
5. **Minimal Dependencies:** Only add libraries solving real user problems

### Risk Management
- **Mobile First:** Test all features on iPhone SE before desktop
- **Feature Flags:** Toggle experimental features (bloom, custom shaders) via dev controls
- **A/B Testing:** Compare new implementations with current baseline
- **Rollback Plan:** Keep git branches for easy reversion

### Feedback Loops
- **Performance:** r3f-perf metrics in dev mode
- **Accessibility:** Lighthouse audits in CI/CD
- **User Feedback:** GitHub Discussions for feature requests
- **Analytics:** (Future) Track FPS, device types, drop-off rates

---

## 🔗 Related Documents

- [CLAUDE.md](../../CLAUDE.md) - Project overview and architecture
- [React Three Fiber Research Report](./react-three-fiber-ecosystem-research.md) - Full research findings
- [Triplex Composition Patterns](../triplex/06-composition-patterns.md) - Component architecture
- [GPU Memory Management](../../CLAUDE.md#three-js-memory-management-patterns) - Resource disposal patterns

---

**Last Updated:** 2026-01-05
**Next Review:** After P0 completion (Week 1)
**Owner:** Claude Agent SDK / breathe-together-v2 maintainers
