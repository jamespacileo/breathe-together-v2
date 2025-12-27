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
- `src/levels/breathing.tsx` — Main breathing scene with lighting setup

**3D Components:**
- `src/entities/breathingSphere/index.tsx` — Central sphere (color, opacity, detail)
- `src/entities/particleSystem/index.tsx` — Particle orbit system (particle count, size, color)
- `src/entities/environment/index.tsx` — Sky stars, floor, and lighting

**UI Components:**
- `src/components/BreathingHUD.tsx` — Breathing phase display and timer

### Method 1: CodeLens (Easiest)
1. Open any editable file above in VSCode
2. You'll see an **"Open in Triplex"** link above the component function
3. Click it → Triplex editor opens in a sidebar panel

**Example:**
Open `src/entities/breathingSphere/index.tsx` and click the CodeLens link above `export function BreathingSphere()`

### Method 2: Command Palette
1. Press **Cmd+Shift+P** (Mac) or **Ctrl+Shift+P** (Windows/Linux)
2. Type: **"Triplex: Open File"**
3. Select the component you want to edit

## ✏️ Step 5: Make Your First Edit (2 min)

### Edit the Breathing Sphere Color

1. Open `src/entities/breathingSphere/index.tsx`
2. Click **"Open in Triplex"** link
3. You'll see the **BreathingSphere** component in the editor with props:
   - `color` — Current cyan color
   - `opacity` — How transparent (0-1)
   - `segments` — Geometry detail

4. **Change the color:**
   - Click the color swatch next to `color`
   - Pick a new color (try purple: `#bd10e0`)
   - Watch the sphere change **instantly** in the 3D viewport

5. **Verify auto-save:**
   - The file `src/entities/breathingSphere/index.tsx` is updated automatically
   - Reload the page → color persists ✅

## 📖 How to Edit Components in Triplex

### Recommended Workflow: Edit via Level File

**Best approach for most edits:**

1. **Open the main level:** `src/levels/breathing.tsx`
2. Click the **"Open in Triplex"** link above `export function BreathingLevel()`
3. **Navigate in the component tree** (left sidebar):
   - Expand `BreathingSphere` → See sphere meshes and props
   - Expand `ParticleSystem` → See particle instance mesh
   - Expand `Environment` → See stars, floor, lights
4. **Select a component** → Props appear in the sidebar
5. **Edit props** → Changes appear instantly in the 3D viewport

**Why this approach?**
- Full scene context: All lights, environment, and animations active
- See real-time breathing animation
- Easiest to see how changes affect the overall scene

### Alternative: Edit Individual Entity Files

**If you want to edit a single component in isolation:**

1. Open an entity file: e.g., `src/entities/breathingSphere/index.tsx`
2. Click the **"Open in Triplex"** link above the component
3. Edit props in the sidebar
4. Changes save automatically

**Limitations:**
- No lights or environment context
- No breathing animation (unless breathSystem is enabled)
- May appear dark or incomplete
- Good for fine-tuning individual props

---

## 🎭 Editing Scene Components (Step-by-Step Guides)

### 1️⃣ Edit the Breathing Sphere

**File:** `src/entities/breathingSphere/index.tsx`

The central sphere pulses with breathing. You can customize:

1. **Open in Triplex** — Click "Open in Triplex" in the file
2. **Change Color:**
   - Find `color` prop
   - Click the color swatch
   - Pick a new color (default: cyan `#4dd9e8`)
3. **Change Opacity (Transparency):**
   - Find `opacity` prop
   - Drag the slider 0-1 (default: 0.15)
   - Lower = more transparent, Higher = more opaque
4. **Change Detail Level:**
   - Find `segments` prop
   - Adjust slider 16-128 (default: 64)
   - Higher = smoother sphere, Lower = angular facets
5. **Watch the preview** — Changes appear instantly in the 3D viewport

**Visual result:** Sphere scales with breathing cycle, colors shift from cyan (inhale) to dark blue (exhale).

---

### 2️⃣ Edit the Particle System (User Presence)

**File:** `src/entities/particleSystem/index.tsx`

300+ particles represent users breathing together. Customize the particle behavior:

1. **Open in Triplex** — Click "Open in Triplex" in the file
2. **Change Particle Count:**
   - Find `totalCount` prop
   - Drag slider 50-500 (default: 300)
   - More particles = more visual presence
   - Try 500 for a dense cloud
3. **Change Particle Size:**
   - Find `particleSize` prop
   - Drag slider 0.02-0.3 (default: 0.05)
   - Larger particles = more visible
4. **Change Filler Color (Empty User Spots):**
   - Find `fillerColor` prop
   - Click the color swatch
   - This color fills empty particle slots when fewer users are present
5. **Watch the preview** — Particles orbit in a sphere pattern, contracting on exhale and expanding on inhale

**Visual result:** Particles pulse with the breathing cycle, shifting colors based on user moods.

---

### 3️⃣ Edit the Environment (Stars, Floor, Lighting)

**File:** `src/entities/environment/index.tsx`

Controls the space background and atmospheric lighting.

1. **Open in Triplex** — Click "Open in Triplex" in the file

2. **Edit the Stars (Background):**
   - Find the `<Stars>` component with these props:
     - `radius` — How far away stars appear (default: 100)
     - `depth` — Depth of star layer (default: 50)
     - `count` — How many stars (default: 5000, try 2000 for sparse sky)
     - `factor` — Star size multiplier (default: 4)
     - `saturation` — Color saturation 0-1 (default: 0 = grayscale)

3. **Edit the Floor (Ground Plane):**
   - Find the `<mesh>` with `planeGeometry`
   - The mesh has `rotation={[-Math.PI / 2, 0, 0]}` and `position={[0, -4, 0]}`
   - Modify `position[1]` (the `-4`) to move floor up/down
   - Try `-2` to bring floor closer to center

4. **Watch the preview** — Stars twinkle in the background, floor gives sense of scale and horizon

---

### 4️⃣ Edit Lighting in the Main Level

**File:** `src/levels/breathing.tsx`

Control the three-light setup (key, fill, rim lights):

1. **Open in Triplex** — Click "Open in Triplex" above `export function BreathingLevel()`

2. **Background Color:**
   - Find `<color attach="background" args={[VISUALS.BG_COLOR]} />`
   - Value is from `src/constants.ts` (default: `#0a0816` = dark purple)
   - To edit directly in Triplex: Change would need constant update

3. **Ambient Light (Overall Brightness):**
   - Find `<ambientLight intensity={...} />`
   - Try values like 0.5-1.0 for brighter scene
   - Default is 0.3

4. **Key Light (Main Direction Light):**
   - Find first `<directionalLight>` at position `[2, 3, 5]`
   - Adjust `intensity` from default range
   - Try position `[5, 5, 5]` for different angle

5. **Watch the preview** — Lighting shifts across the sphere and particles

---

### ❌ Camera Position (Read-Only in Triplex)

**File:** `src/entities/camera/CameraRig.tsx`

The camera is **NOT directly editable in Triplex** because it's controlled entirely by logic (follows mouse position and breathing phase). To edit:

- You must modify the TypeScript code directly
- Find lines like `targetPosition.current.set(mouse.x * 0.5, mouse.y * 0.5, 10 - zoomOffset)`
- Default position: `[0, 0, 10]` (10 units away on Z axis)
- To move camera further back, increase the `10` to `15`
- To disable mouse follow, comment out the mouse calculation line

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
  cameraFollowFocusedSystem={false}
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

1. **Edit ParticleSystem Density:**
   - Open `src/entities/particleSystem/index.tsx` in Triplex
   - Change `totalCount` from 300 to 500
   - Watch the particle cloud become denser
   - Reset to 300 when done

2. **Change Environment Stars:**
   - Open `src/entities/environment/index.tsx` in Triplex
   - Find `<Stars>` component
   - Change `count` from 5000 to 2000
   - Watch the night sky become sparser
   - Try `count={10000}` for a dense star field

3. **Adjust Lighting:**
   - Open `src/levels/breathing.tsx` in Triplex
   - Find `<ambientLight>`
   - Change `intensity` from 0.3 to 0.6
   - Watch the entire scene brighten

4. **Make Particles Bigger:**
   - Open `src/entities/particleSystem/index.tsx` in Triplex
   - Change `particleSize` from 0.05 to 0.1
   - Particles become twice as large

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
