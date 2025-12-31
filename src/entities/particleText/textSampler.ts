/**
 * Text-to-Particle Sampler
 *
 * Converts text strings into 2D particle positions by:
 * 1. Rendering text to an off-screen canvas
 * 2. Sampling pixel positions where text is drawn
 * 3. Returning normalized particle positions (centered around origin)
 *
 * Used by ParticleText3D to create text formed by 3D particles.
 */

export interface TextParticlePoint {
  x: number; // -0.5 to 0.5 (normalized, centered)
  y: number; // -0.5 to 0.5 (normalized, centered)
}

export interface TextSamplerOptions {
  /** Font size in pixels (affects sampling density) @default 64 */
  fontSize?: number;
  /** Font family @default 'Arial, sans-serif' */
  fontFamily?: string;
  /** Font weight @default '600' */
  fontWeight?: string;
  /** Sampling grid spacing in pixels (lower = more particles) @default 3 */
  sampleSpacing?: number;
  /** Maximum particles per text (performance cap) @default 2000 */
  maxParticles?: number;
  /** Canvas padding around text @default 20 */
  padding?: number;
}

// Reusable canvas for sampling (avoid creating new ones each time)
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

function getSharedCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!sharedCanvas || !sharedCtx) {
    sharedCanvas = document.createElement('canvas');
    const ctx = sharedCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Could not get 2D context for text sampling');
    }
    sharedCtx = ctx;
  }
  return { canvas: sharedCanvas, ctx: sharedCtx };
}

/**
 * Sample text into particle positions
 *
 * @param text - Text string to convert to particles
 * @param options - Sampling configuration
 * @returns Array of normalized particle positions (centered around 0,0)
 */
export function sampleTextToParticles(
  text: string,
  options: TextSamplerOptions = {},
): TextParticlePoint[] {
  const {
    fontSize = 64,
    fontFamily = 'Arial, sans-serif',
    fontWeight = '600',
    sampleSpacing = 3,
    maxParticles = 2000,
    padding = 20,
  } = options;

  if (!text || text.trim() === '') {
    return [];
  }

  const { canvas, ctx } = getSharedCanvas();

  // Set up font for measuring
  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.font = font;

  // Measure text dimensions
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.2; // Approximate height

  // Size canvas to fit text with padding
  const canvasWidth = Math.ceil(textWidth + padding * 2);
  const canvasHeight = Math.ceil(textHeight + padding * 2);
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Clear and draw text (need to reset font after resize)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

  // Sample pixels
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const pixels = imageData.data;

  const points: TextParticlePoint[] = [];

  // Sample on a grid, check if pixel has text (alpha > threshold)
  for (let y = 0; y < canvasHeight; y += sampleSpacing) {
    for (let x = 0; x < canvasWidth; x += sampleSpacing) {
      const idx = (y * canvasWidth + x) * 4;
      const alpha = pixels[idx + 3]; // Alpha channel

      // Include pixel if it has significant alpha (part of text)
      if (alpha > 128) {
        // Normalize to -0.5 to 0.5 range (centered)
        const normalizedX = x / canvasWidth - 0.5;
        const normalizedY = -(y / canvasHeight - 0.5); // Flip Y for 3D space

        points.push({ x: normalizedX, y: normalizedY });
      }
    }

    // Early exit if we hit the cap
    if (points.length >= maxParticles) {
      break;
    }
  }

  // If we have too many particles, randomly downsample
  if (points.length > maxParticles) {
    // Shuffle and take first maxParticles
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [points[i], points[j]] = [points[j], points[i]];
    }
    return points.slice(0, maxParticles);
  }

  return points;
}

/**
 * Get the aspect ratio of text for proper scaling in 3D
 *
 * @param text - Text to measure
 * @param options - Same options as sampleTextToParticles
 * @returns width/height ratio
 */
export function getTextAspectRatio(text: string, options: TextSamplerOptions = {}): number {
  const {
    fontSize = 64,
    fontFamily = 'Arial, sans-serif',
    fontWeight = '600',
    padding = 20,
  } = options;

  if (!text || text.trim() === '') {
    return 1;
  }

  const { ctx } = getSharedCanvas();

  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.font = font;

  const metrics = ctx.measureText(text);
  const textWidth = metrics.width + padding * 2;
  const textHeight = fontSize * 1.2 + padding * 2;

  return textWidth / textHeight;
}
