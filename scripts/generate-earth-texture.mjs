#!/usr/bin/env node

/**
 * Generate a Monument Valley styled Earth texture
 *
 * Usage: npm run generate-earth-texture
 *
 * Creates public/textures/earth-monument-valley.jpg with:
 * - Warm neutral continents (#f5ebe0, #e6dcd3, #d4a574)
 * - Teal/sky blue oceans (#118ab2, #06d6a0)
 * - Simple Simplex noise for continent shapes
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = `${__dirname}/../public/textures/earth-monument-valley.jpg`;

// Monument Valley color palette
const COLORS = {
  landLight: '#f5ebe0',    // Warm neutral light
  landMid: '#e6dcd3',      // Warm neutral mid
  landDark: '#d4a574',     // Sandy/warm tan
  oceanDark: '#118ab2',    // Sky blue
  oceanLight: '#06d6a0',   // Teal
  iceCaps: '#fffef7',      // Warm white
};

// Simple Simplex noise approximation for land generation
function noise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function perlinNoise(x, y, scale = 1) {
  let frequency = scale / 100;
  let value = 0;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < 3; i++) {
    value += amplitude * noise(x * frequency, y * frequency);
    maxValue += amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }

  return value / maxValue;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

function lerpColor(color1, color2, t) {
  const [r1, g1, b1] = color1;
  const [r2, g2, b2] = color2;
  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ];
}

// Create canvas and context
const width = 2048;
const height = 1024;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fill with ocean base
ctx.fillStyle = COLORS.oceanDark;
ctx.fillRect(0, 0, width, height);

// Generate continents using noise
const imageData = ctx.createImageData(width, height);
const data = imageData.data;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    // Convert pixel to lat/lon for Perlin noise
    const lon = (x / width) * 360 - 180;
    const lat = (y / height) * 180 - 90;

    // Generate landmass noise
    const continentNoise = perlinNoise(lon, lat, 2);
    const detailNoise = perlinNoise(lon, lat, 0.5);
    const noise2 = Math.sin(lat * 0.05) * 0.3 + 0.5;

    // Combine noise layers for continent shapes
    const landMass =
      continentNoise * 0.6 + detailNoise * 0.3 + noise2 * 0.1;

    // Color based on landmass value
    let rgb;

    if (Math.abs(lat) > 75) {
      // Ice caps at poles
      rgb = hexToRgb(COLORS.iceCaps);
    } else if (landMass > 0.52) {
      // Dark land
      if (landMass > 0.65) {
        rgb = hexToRgb(COLORS.landDark);
      } else {
        // Blend mid to dark
        const blend = (landMass - 0.52) / 0.13;
        rgb = lerpColor(hexToRgb(COLORS.landMid), hexToRgb(COLORS.landDark), blend);
      }
    } else if (landMass > 0.48) {
      // Light to mid land
      const blend = (landMass - 0.48) / 0.04;
      rgb = lerpColor(hexToRgb(COLORS.landLight), hexToRgb(COLORS.landMid), blend);
    } else if (landMass > 0.46) {
      // Teal shallow water
      const blend = (landMass - 0.46) / 0.02;
      rgb = lerpColor(hexToRgb(COLORS.oceanLight), hexToRgb(COLORS.oceanDark), blend);
    } else {
      // Deep ocean
      rgb = hexToRgb(COLORS.oceanDark);
    }

    // Set pixel data
    const pixelIndex = (y * width + x) * 4;
    data[pixelIndex] = rgb[0];     // R
    data[pixelIndex + 1] = rgb[1]; // G
    data[pixelIndex + 2] = rgb[2]; // B
    data[pixelIndex + 3] = 255;    // A
  }
}

ctx.putImageData(imageData, 0, 0);

// Save as JPEG
const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
writeFileSync(outputPath, buffer);

console.log(`✅ Monument Valley Earth texture generated!`);
console.log(`📍 Saved to: ${outputPath}`);
console.log(`📐 Size: ${width}x${height}px`);
console.log(`🎨 Colors: Warm neutrals + teal oceans`);
