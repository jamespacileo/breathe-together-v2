# Triplex Quickstart (5 minutes)

Get up and running with Triplex visual editor for this project in under 5 minutes.

## ✅ Prerequisites

- **VSCode** or **VSCode Insiders** installed
- **Node.js & npm** installed
- Project dependencies installed (`npm install`)

## 🚀 Step 1: Install Triplex Extension (1 min)

### Option A: Via VSCode UI
1. Open **Extensions** (Ctrl+Shift+X / Cmd+Shift+X)
2. Search: **"Triplex"**
3. Install the official **Triplex** extension by triplex.dev

### Option B: Via Command Line (Regular VSCode)
```bash
code --install-extension triplex.triplex
```

### Option B2: Via Command Line (VSCode Insiders)
```bash
code-insiders --install-extension triplex.triplex
```

## 🔐 Step 2: Launch VSCode with Secure Context (30 sec)

**Important:** Triplex requires a secure context (SharedArrayBuffer). Choose your approach:

### For Regular VSCode
Close all VSCode instances and relaunch with:
```bash
code --enable-coi
```

### For VSCode Insiders
```bash
code-insiders --enable-coi
```

### For Regular VSCode (Alternative)
If you prefer not to use flags, you can:
1. Close VSCode completely
2. Delete `.vscode/settings.json` temporary flags
3. Relaunch with: `code .`
4. First launch will show secure context prompt

*Note: You only need the `--enable-coi` flag once. Subsequent launches can use regular `code .` or `code-insiders .`*

## ▶️ Step 3: Start Dev Server (30 sec)

```bash
npm run dev
```

You'll see: `VITE v5.x.x ready in XXX ms` → Server is running on **http://localhost:5173**

## 🎨 Step 4: Open Your First Component (1 min)

### Editable Files in This Project

The following files are editable in Triplex (inside the main scene):

**Main Level:**
- `src/levels/breathing.tsx` — Main breathing scene with frosted glass refraction pipeline

**3D Components:**
- `src/entities/earthGlobe/index.tsx` — Central globe with breathing animation
- `src/entities/particle/ParticleSwarm.tsx` — Icosahedral shard particles
- `src/entities/particle/AtmosphericParticles.tsx` — Ambient atmospheric particles
- `src/entities/environment/index.tsx` — Clouds, stars, lighting

**UI Components:**
- `src/components/SimpleGaiaUI.tsx` — Main UI with breathing phase, inspirational text, controls
- `src/components/InspirationalText.tsx` — Breathing-synchronized messages

### Method 1: CodeLens (Easiest)
1. Open any editable file above in VSCode
2. You'll see an **"Open in Triplex"** link above the component function
3. Click it → Triplex editor opens in a sidebar panel

**Example:**
Open `src/entities/earthGlobe/index.tsx` and click the CodeLens link above `export function EarthGlobe()`

### Method 2: Command Palette
1. Press **Cmd+Shift+P** (Mac) or **Ctrl+Shift+P** (Windows/Linux)
2. Type: **"Triplex: Open File"**
3. Select the component you want to edit

## ✏️ Step 5: Make Your First Edit (2 min)

### Edit Visual Parameters with Dev Controls

1. Open `src/levels/breathing.tsx`
2. Click **"Open in Triplex"** link
3. Look for the **Leva dev controls panel** (appears in dev mode)
4. Try adjusting parameters:
   - Orbit radius (breathing space)
   - Shard size
   - Atmosphere density
   - Glass refraction (IOR, depth)
   - Environment settings (clouds, stars, lighting)

5. **See changes instantly:**
   - All changes update in real-time in the 3D viewport
   - No page reload needed
   - Changes persist in scene configuration

## 📖 How to Edit Components in Triplex

### Recommended Workflow: Edit via Level File

**Best approach for most edits:**

1. **Open the main level:** `src/levels/breathing.tsx`
2. Click the **"Open in Triplex"** link above `export function BreathingLevel()`
3. **Navigate in the component tree** (left sidebar):
   - Expand `EarthGlobe` → See globe mesh and frosted glass overlay
   - Expand `ParticleSwarm` → See icosahedral shard instances
   - Expand `Environment` → See clouds, stars, lights
4. **Select a component** → Props and dev controls appear
5. **Edit parameters** → Changes appear instantly in the 3D viewport

**Why this approach?**
- Full scene context: All lights, environment, and animations active
- See real-time breathing animation
- Easiest to see how changes affect the overall scene

### Alternative: Edit Individual Entity Files

**If you want to edit a single component in isolation:**

1. Open an entity file: e.g., `src/entities/earthGlobe/index.tsx`
2. Click the **"Open in Triplex"** link above the component
3. Use dev controls (Leva panel) to adjust parameters
4. Changes save automatically

**Limitations:**
- May not have full scene context
- Refraction pipeline requires full scene
- Better to edit via main level for complete visual feedback

---

## 🎭 Editing Scene Components (Step-by-Step Guides)

### 1️⃣ Edit the Earth Globe & Visual Parameters

**File:** `src/levels/breathing.tsx` (use Leva dev controls)

The central globe and particles create a Monument Valley inspired meditation environment.

1. **Open Triplex** — Open breathing.tsx in Triplex
2. **Open Leva Panel** — Dev controls panel (appears in dev mode)
3. **Adjust Visual Parameters:**
   - **Orbit Radius** (2.5-8.0): Breathing space - how far particles expand
   - **Shard Size** (0.3-1.5): Size of icosahedral particles
   - **Atmosphere Density** (0-300): Number of ambient atmospheric particles
4. **Adjust Glass Effects:**
   - **IOR** (1.0-2.5): Index of refraction for frosted glass
   - **Glass Depth** (0-1): Intensity of glass depth effect
5. **Watch the preview** — All changes update in real-time

**Visual result:** Globe and particles breathe in harmony with frosted glass refraction effects.

---

### 2️⃣ Edit Environment Settings

**File:** `src/levels/breathing.tsx` (use Leva dev controls - Environment folder)

Control the atmospheric environment - clouds, stars, and lighting:

1. **Open Triplex** — Open breathing.tsx in Triplex
2. **Find Environment Controls** — In Leva panel, expand "Environment" folder
3. **Adjust Clouds:**
   - **Show Clouds**: Toggle cloud visibility
   - **Cloud Opacity** (0-1): Cloud transparency
   - **Cloud Speed** (0-2): Animation speed
4. **Adjust Stars:**
   - **Show Stars**: Toggle star field visibility
5. **Adjust Lighting:**
   - **Ambient Light Intensity** (0-1): Overall scene brightness
   - **Ambient Light Color**: Background light color
   - **Key Light Intensity** (0-2): Main directional light strength
   - **Key Light Color**: Main light color

**Visual result:** Creates the atmospheric mood - from cosmic starfield to minimal meditation space.

---

### 3️⃣ Quick Tips for Tuning the Experience

**Use the Momentum Controls:**
- Drag to rotate the scene
- iOS-style momentum scrolling for natural feel
- Adjust damping and speed in dev controls

**Performance Tuning:**
- Reduce shard count if FPS drops
- Lower atmosphere density for better performance
- Disable depth-of-field for faster rendering

**Audio Integration:**
- Audio settings in Leva panel (dev mode)
- Synchronized with breathing cycle
- Ambient drones and breath tones

---

## 🐛 Common Issues & Troubleshooting

### Scene appears dark or empty in Triplex

**Cause:** Breath system or BreathEntity not enabled in Triplex provider

**Fix:** Verify `.triplex/providers.tsx` includes:
1. `import { BreathEntity } from "../src/entities/breath";` at the top
2. `breathSystemEnabled={true}` prop passed to KootaSystems
3. `<BreathEntity />` rendered inside KootaSystems

If these are missing, animations won't run and scene will appear dark.

**Check the file:** `.triplex/providers.tsx` should have:
```typescript
<KootaSystems
  breathSystemEnabled={true}  // ← Must be true
  particlePhysicsSystemEnabled={true}
  // ...
>
  <BreathEntity />  {/* ← Must be present */}
  {children}
</KootaSystems>
```

### Individual entity files show black screen

**Cause:** File not in `.triplex/config.json` allowed list or rendering without context

**Fix:**
1. Check `.triplex/config.json` includes `"../src/entities/**/*.tsx"` in files array
2. Restart Triplex: Cmd+Shift+P → "Developer: Reload Window"
3. Try editing through main level file instead (`breathing.tsx`)

### "SharedArrayBuffer is not defined" Error

**Cause:** VSCode needs secure context mode

**Fix:** Close all VSCode instances and launch with:
```bash
code --enable-coi
```

### Component not appearing in Triplex

**Cause:** Component not exported or dev server not running

**Fix:**
1. Verify `npm run dev` is running
2. Ensure component starts with `export function ComponentName() {}`
3. Restart dev server if needed

### Triplex panel not loading

**Cause:** Dev server on wrong port or extension not initialized

**Fix:**
1. Check dev server is running: `npm run dev` (should show port 5173)
2. Reload VSCode: Cmd+Shift+P → "Developer: Reload Window"
3. Try reinstalling extension

## 📚 Next Steps: Try These Edits

### Quick Wins (1-2 minutes each)

1. **Adjust Breathing Space:**
   - Open `src/levels/breathing.tsx` in Triplex
   - Open Leva panel
   - Change "Orbit Radius" from 4.5 to 6.0
   - Watch particles expand further during exhale

2. **Increase Shard Size:**
   - In Leva panel
   - Change "Shard Size" from 0.6 to 1.0
   - Watch particles become more prominent

3. **Add More Atmosphere:**
   - In Leva panel
   - Change "Atmosphere Density" from 100 to 200
   - Watch more ambient particles appear

4. **Adjust Glass Effect:**
   - In Leva panel → "Glass" folder
   - Change "IOR" from 1.5 to 2.2
   - Watch the refraction effect intensify

### Deeper Exploration

- Read **`TRIPLEX_SETUP.md`** for full features, JSDoc annotations, and advanced configuration
- Explore the codebase: Props are documented with JSDoc comments (`@type`, `@min`, `@max`)
- Check `src/constants.ts` to see the default values (SPHERE_COLOR_INHALE, PARTICLE_COUNT, etc.)

### Official Resources

- [Triplex Official Docs](https://triplex.dev/docs) — Complete reference
- [VSCode Extension](https://marketplace.visualstudio.com/items?itemName=trytriplex.triplex-vsce) — Install updates
- [Triplex GitHub](https://github.com/pmndrs/triplex) — Issues and discussions

## ⚡ Quick Tips

| Task | How |
|------|-----|
| Edit prop values | Click field → Slider/input/color picker |
| Undo changes | Cmd+Z (unsaved changes only) |
| Auto-save? | ✅ Yes, all changes auto-save |
| GPU slow? | Cmd+Shift+P → "Preferences: Configure Runtime Arguments" → Add `"disable-hardware-acceleration": false` |
| Search components | In Triplex panel sidebar (Cmd+F) |

---

**You're ready!** Open Triplex and start designing visually. Questions? Check `TRIPLEX_SETUP.md` for detailed troubleshooting. 🎨
