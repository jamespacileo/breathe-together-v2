# Earth Textures

## Monument Valley Earth Texture

**Required file:** `earth-monument-valley.jpg`

### Specifications

- **Format:** JPEG (2048x1024 or 4096x2048 for higher quality)
- **Projection:** Equirectangular (standard lat/long mapping)
- **Color Palette:**
  - Land: `#f5ebe0`, `#e6dcd3`, `#d4a574` (warm neutrals, sandy tones)
  - Ocean: `#118ab2` (sky blue), `#06d6a0` (teal for shallow water)
  - Ice caps: `#fffef7` (warm white)

### Options for Creation

#### Option A: Using Photoshop/Figma (Recommended)
1. Create a new 2048x1024px document
2. Use equirectangular Earth reference as base
3. Color-grade using Monument Valley palette
4. Export as JPEG

#### Option B: Using Node.js Script
Run the texture generation script:
```bash
npm run generate-earth-texture
```

This will create `earth-monument-valley.jpg` with procedurally generated continents.

#### Option C: Online Tools
- NASA Blue Marble: Desaturate and color-grade
- [Planetmaker](https://www.planetmaker.org): Generate procedural planet, then grade colors
- Photopea: Free browser-based editor

### Verification

Once created, verify the texture:
1. Place in this directory: `public/textures/earth-monument-valley.jpg`
2. Run `npm run dev` and check that the globe displays
3. Colors should match Monument Valley palette (warm neutrals, teal oceans)

### Fallback

If texture is missing, r3f-globe will render with solid color fallback.
