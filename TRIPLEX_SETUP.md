# Triplex Visual Editor Setup Guide

## What is Triplex?

Triplex is a **visual editor for React Three Fiber** that lets you edit 3D components in real-time without touching code.

Features:
- 🎨 Live visual editing of 3D scenes
- 🔧 Real-time prop adjustment (sliders, color pickers)
- 📱 Responsive preview
- 💾 Auto-save to source files

---

## Installation

### Step 1: Install Triplex Extension in VSCode

1. Open **VSCode**
2. Go to **Extensions** (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for **"Triplex"**
4. Install the official **"Triplex"** extension by triplex.dev

Alternatively, use command line:
```bash
code --install-extension triplex.triplex
```

### Step 2: Verify Installation

After installing, you should see:
- ✅ Triplex icon in VSCode sidebar
- ✅ Triplex commands available (Cmd+Shift+P → "Triplex")

---

## Opening the Visual Editor

### Method 1: Via Sidebar Icon
1. Click the **Triplex icon** in the VSCode sidebar (looks like a 3D cube)
2. This opens the Triplex panel showing available components

### Method 2: Via Command Palette
1. Press **Cmd+Shift+P** (Mac) or **Ctrl+Shift+P** (Windows/Linux)
2. Type **"Triplex"**
3. Select **"Triplex: Open Editor"**

### Method 3: Via File Context Menu
1. Right-click on a component file (e.g., `src/entities/breathingSphere/index.tsx`)
2. Select **"Open in Triplex"**

---

## Editing Components

### Finding Components

Once the Triplex panel opens, you'll see:
```
BreathingLevel
├── BreathingSphere
├── ParticleSystem
└── BreathingHUD

Entities
├── breath/
├── breathingSphere/
├── particleSystem/
└── [others]
```

### Editing Props

1. **Click** a component in the list
2. Triplex shows its props with UI controls:
   - **Color fields** → Color picker
   - **Number fields** (with @min/@max) → Sliders
   - **String fields** → Text input
   - **Boolean fields** → Toggles

### Example: Edit BreathingSphere

1. Click **BreathingSphere** in Triplex panel
2. See props:
   - `color` (default: #7ec8d4) → Click to open color picker
   - `opacity` (default: 0.15) → Slider 0-1
   - `segments` (default: 64) → Slider 16-128
3. Adjust any value
4. Changes apply **live** to the 3D viewport
5. Changes **auto-save** to source file

### Example: Edit ParticleSystem

1. Click **ParticleSystem** in Triplex panel
2. See props:
   - `totalCount` → Slider 50-500 (change particle count)
   - `particleSize` → Slider 0.02-0.3
   - `fillerColor` → Color picker
3. Watch particles update in real-time

---

## Component Annotation Reference

Components use JSDoc comments for Triplex UI controls:

```typescript
interface ComponentProps {
  /**
   * Sphere color
   * @type color
   */
  color?: string;

  /**
   * Material opacity
   * @min 0
   * @max 1
   * @step 0.01
   */
  opacity?: number;

  /**
   * Geometry segments
   * @min 16
   * @max 128
   * @step 16
   */
  segments?: number;
}
```

### Supported Annotations

| Annotation | UI Control | Example |
|-----------|-----------|---------|
| `@type color` | Color picker | `color: string` |
| `@min X @max Y` | Slider | `@min 0 @max 1` |
| `@step X` | Slider step size | `@step 0.01` |
| `@type color` | Color input | For hex colors |

---

## Workflow Example

### Scenario: Change Sphere Color to Purple

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open Triplex:**
   - Click Triplex icon in sidebar OR
   - Cmd+Shift+P → "Triplex: Open Editor"

3. **Navigate to BreathingSphere:**
   - Look for `src/entities/breathingSphere/index.tsx`
   - Click it in the component list

4. **Edit color prop:**
   - See `color: #7ec8d4` field
   - Click the color swatch
   - Pick purple: `#bd10e0`

5. **See live change:**
   - Sphere in viewport turns purple instantly

6. **Save:**
   - Auto-saves to `src/entities/breathingSphere/index.tsx`
   - Changes persist after page reload

---

## Advanced: Creating New Editable Components

To make a new component editable in Triplex:

```typescript
// src/components/MyComponent.tsx

interface MyComponentProps {
  /**
   * Background color
   * @type color
   */
  bgColor?: string;

  /**
   * Scale multiplier
   * @min 0.5
   * @max 2
   * @step 0.1
   */
  scale?: number;
}

export function MyComponent({ bgColor = '#000000', scale = 1 }: MyComponentProps) {
  return <div style={{ backgroundColor: bgColor, transform: `scale(${scale})` }} />;
}
```

That's it! Triplex automatically discovers components with JSDoc annotations.

---

## Troubleshooting

### Problem: Triplex panel not showing

**Solution 1: Reload VSCode**
- Press Cmd+Shift+P → "Developer: Reload Window"

**Solution 2: Reinstall extension**
- Go to Extensions
- Uninstall Triplex
- Reinstall Triplex

**Solution 3: Check dev server**
- Make sure `npm run dev` is running
- Verify port 5173 is available

### Problem: Component not appearing in Triplex

**Causes:**
- Dev server not running
- Component not exported
- Component doesn't have JSDoc annotations

**Solution:**
1. Verify component is exported: `export function MyComponent() {}`
2. Add JSDoc annotations to props
3. Restart dev server

### Problem: Changes not saving

**Solution:**
- Check file permissions
- Verify dev server has write access
- Look for error messages in Triplex panel

### Problem: Props not showing sliders

**Solution:**
- Add JSDoc annotations: `@min X @max Y`
- Use correct format: `@type color` for color fields
- Reload Triplex panel

---

## Keyboard Shortcuts (in Triplex Editor)

| Action | Shortcut |
|--------|----------|
| Open editor | Cmd+Shift+P → "Triplex" |
| Focus search | Cmd+F (in component list) |
| Save | Cmd+S (auto-saves by default) |
| Reload | Cmd+R |

---

## Best Practices

### ✅ Do This

- Keep component props simple and intuitive
- Use meaningful prop names
- Add helpful JSDoc descriptions
- Test props with reasonable ranges
- Document color palette choices

### ❌ Don't Do This

- Use complex nested props (Triplex works best with flat props)
- Create prop values that depend on other props
- Use undefined as defaults (use actual values)
- Add console.log in render functions

---

## Example Edits to Try

### Test 1: Change Breathing Sphere
1. Open Triplex
2. Select **BreathingSphere**
3. Change `opacity` from 0.15 to 0.5
4. See sphere become more opaque

### Test 2: Change Particle Count
1. Open Triplex
2. Select **ParticleSystem**
3. Change `totalCount` from 300 to 500
4. See more particles orbit

### Test 3: Change Colors
1. Open Triplex
2. Select **BreathingSphere**
3. Change `color` from cyan to any color you like
4. Instantly see the change

---

## Configuration Reference

**File:** `triplex.config.ts`

```typescript
{
  devServer: {
    command: "npm run dev",     // How to start dev server
    port: 5173,                 // Dev server port
    baseURL: "/breathe-together-v2",  // URL path
  },

  files: [
    "src/levels/**/*.tsx",      // Editable level files
    "src/entities/**/*.tsx",    // Editable entity files
    "src/components/**/*.tsx",  // Editable component files
  ],

  canvas: {
    entry: "src/index.tsx",     // Entry point
  }
}
```

---

## Tips & Tricks

### Tip 1: Use Color Picker for Design System
- Define colors in Triplex
- Copy hex values
- Add to design tokens

### Tip 2: A/B Test Props
- Make two adjustments side-by-side
- Screenshot both versions
- Decide which looks better

### Tip 3: Document Discoveries
- Note which prop ranges look best
- Share visual links with team
- Use Triplex for design reviews

### Tip 4: Export from Triplex
- Right-click edited component
- Select "Export as component"
- Share with team

---

## Next Steps

1. ✅ Install Triplex extension
2. ✅ Open VSCode at project root
3. ✅ Start dev server: `npm run dev`
4. ✅ Open Triplex editor (sidebar icon)
5. ✅ Try editing **BreathingSphere** props
6. ✅ Watch changes appear live
7. ✅ Adjust **ParticleSystem** particle count
8. ✅ Experiment with colors and sizes

---

## Support

**Official Docs:** https://triplex.dev/docs
**GitHub:** https://github.com/triplexstudio/triplex
**VSCode Extension:** https://marketplace.visualstudio.com/items?itemName=triplex.triplex

---

## Summary

| Feature | Status | How to Use |
|---------|--------|-----------|
| Visual editing | ✅ Ready | Click Triplex icon |
| Color picker | ✅ Ready | Edit `@type color` props |
| Number sliders | ✅ Ready | Edit `@min/@max` props |
| Auto-save | ✅ Ready | Changes save automatically |
| Real-time preview | ✅ Ready | See changes as you edit |

**You're all set!** Open Triplex and start designing visually. 🎨

---

**Last Updated:** 2025-12-26
**Status:** ✅ Ready to Use
