/**
 * Text Texture Generator for InspirationRibbon
 *
 * Renders inspirational text to a canvas texture that wraps around
 * the cylindrical ribbon geometry. Text repeats seamlessly for
 * infinite scrolling effect.
 */

import * as THREE from 'three';

export interface TextTextureOptions {
  /** Text to render (will be repeated for seamless wrap) */
  text: string;
  /** Canvas width in pixels (higher = sharper text) */
  width?: number;
  /** Canvas height in pixels */
  height?: number;
  /** Font size in pixels */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Text color */
  textColor?: string;
  /** Background color (use transparent for overlay effect) */
  backgroundColor?: string;
  /** Letter spacing multiplier */
  letterSpacing?: number;
  /** Add decorative separators between repetitions */
  separator?: string;
}

/**
 * Creates a canvas texture with text for the inspiration ribbon
 *
 * The text is rendered with padding and repeated to create
 * seamless horizontal wrapping when applied to a cylinder.
 */
export function createTextTexture(options: TextTextureOptions): THREE.CanvasTexture {
  const {
    text,
    width = 2048,
    height = 128,
    fontSize = 48,
    fontFamily = '"Helvetica Neue", Helvetica, Arial, sans-serif',
    textColor = '#d4a574',
    backgroundColor = 'transparent',
    letterSpacing = 0.15,
    separator = '  ✦  ',
  } = options;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas 2D context');
  }

  // Fill background
  if (backgroundColor === 'transparent') {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Configure text style
  ctx.font = `300 ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Create the repeating text string
  const fullText = `${text}${separator}`;

  // Measure text width with letter spacing
  const baseWidth = ctx.measureText(fullText).width;
  const spacedWidth = baseWidth * (1 + letterSpacing);

  // Calculate how many repetitions fit on canvas
  const repetitions = Math.ceil(width / spacedWidth) + 1;

  // Draw text repeatedly
  let x = 0;
  for (let i = 0; i < repetitions; i++) {
    drawTextWithSpacing(ctx, fullText, x, height / 2, letterSpacing);
    x += spacedWidth;
  }

  // Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Draw text with custom letter spacing
 */
function drawTextWithSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacingMultiplier: number,
): void {
  const chars = text.split('');
  let currentX = x;

  for (const char of chars) {
    ctx.fillText(char, currentX, y);
    const charWidth = ctx.measureText(char).width;
    currentX += charWidth * (1 + spacingMultiplier);
  }
}

/**
 * Updates an existing texture with new text
 * Useful for changing messages during breath cycles
 */
export function updateTextTexture(texture: THREE.CanvasTexture, options: TextTextureOptions): void {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const {
    text,
    fontSize = 48,
    fontFamily = '"Helvetica Neue", Helvetica, Arial, sans-serif',
    textColor = '#d4a574',
    backgroundColor = 'transparent',
    letterSpacing = 0.15,
    separator = '  ✦  ',
  } = options;

  // Clear canvas
  if (backgroundColor === 'transparent') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Configure text style
  ctx.font = `300 ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Create the repeating text string
  const fullText = `${text}${separator}`;

  // Measure and repeat
  const baseWidth = ctx.measureText(fullText).width;
  const spacedWidth = baseWidth * (1 + letterSpacing);
  const repetitions = Math.ceil(canvas.width / spacedWidth) + 1;

  let x = 0;
  for (let i = 0; i < repetitions; i++) {
    drawTextWithSpacing(ctx, fullText, x, canvas.height / 2, letterSpacing);
    x += spacedWidth;
  }

  texture.needsUpdate = true;
}

/**
 * Default inspirational messages for the ribbon
 * These cycle through during different breath cycles
 */
export const RIBBON_MESSAGES = [
  'breathe together',
  'we are connected',
  'peace flows through us',
  'one breath, one world',
  'stillness within',
  'presence is a gift',
  'let go and breathe',
  'together we rise',
] as const;
