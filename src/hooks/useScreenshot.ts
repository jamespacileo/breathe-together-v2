/**
 * Client-side screenshot capture hook
 *
 * Captures the Three.js canvas and optionally uploads to R2 storage.
 */

import { useThree } from '@react-three/fiber';
import { useCallback, useState } from 'react';

export interface ScreenshotOptions {
  /** Image format (default: 'image/png') */
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Quality for JPEG/WebP (0-1, default: 0.92) */
  quality?: number;
  /** Whether to upload to R2 (default: false) */
  upload?: boolean;
  /** Custom filename (default: auto-generated) */
  filename?: string;
  /** Viewport name for metadata (e.g., 'desktop', 'mobile') */
  viewport?: string;
  /** State name for metadata (e.g., 'inhale', 'exhale') */
  state?: string;
}

export interface ScreenshotResult {
  /** Data URL of the captured image */
  dataUrl: string;
  /** Blob of the captured image */
  blob: Blob;
  /** If uploaded, the R2 URL */
  url?: string;
  /** If uploaded, the R2 key */
  key?: string;
  /** Width of the captured image */
  width: number;
  /** Height of the captured image */
  height: number;
  /** Timestamp of capture */
  timestamp: string;
}

/**
 * Hook for capturing screenshots of the Three.js canvas
 *
 * @example
 * ```tsx
 * function CaptureButton() {
 *   const { capture, isCapturing, error } = useScreenshot();
 *
 *   const handleCapture = async () => {
 *     const result = await capture({ upload: true });
 *     if (result) {
 *       console.log('Screenshot URL:', result.url);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleCapture} disabled={isCapturing}>
 *       {isCapturing ? 'Capturing...' : '📸 Capture'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useScreenshot() {
  const { gl, scene, camera } = useThree();
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const capture = useCallback(
    async (options: ScreenshotOptions = {}): Promise<ScreenshotResult | null> => {
      const {
        format = 'image/png',
        quality = 0.92,
        upload = false,
        filename,
        viewport,
        state,
      } = options;

      setIsCapturing(true);
      setError(null);

      try {
        // Render the current frame to ensure we capture the latest state
        gl.render(scene, camera);

        // Get the canvas data
        const canvas = gl.domElement;
        const dataUrl = canvas.toDataURL(format, quality);

        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        const result: ScreenshotResult = {
          dataUrl,
          blob,
          width: canvas.width,
          height: canvas.height,
          timestamp: new Date().toISOString(),
        };

        // Upload to R2 if requested
        if (upload) {
          const formData = new FormData();
          const name = filename || `screenshot-${Date.now()}.png`;
          formData.append('file', blob, name);

          if (viewport) formData.append('viewport', viewport);
          if (state) formData.append('state', state);

          const uploadResponse = await fetch('/api/screenshots', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
          }

          const uploadResult = await uploadResponse.json();
          result.url = uploadResult.url;
          result.key = uploadResult.key;
        }

        return result;
      } catch (err) {
        const captureError = err instanceof Error ? err : new Error(String(err));
        setError(captureError);
        console.error('Screenshot capture failed:', captureError);
        return null;
      } finally {
        setIsCapturing(false);
      }
    },
    [gl, scene, camera],
  );

  /**
   * Capture and download the screenshot locally
   */
  const captureAndDownload = useCallback(
    async (options: Omit<ScreenshotOptions, 'upload'> = {}) => {
      const result = await capture({ ...options, upload: false });

      if (result) {
        const link = document.createElement('a');
        link.href = result.dataUrl;
        link.download = options.filename || `breathe-screenshot-${Date.now()}.png`;
        link.click();
      }

      return result;
    },
    [capture],
  );

  /**
   * Capture and copy to clipboard
   */
  const captureAndCopy = useCallback(
    async (options: Omit<ScreenshotOptions, 'upload'> = {}) => {
      const result = await capture({ ...options, upload: false });

      if (result && navigator.clipboard) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              [result.blob.type]: result.blob,
            }),
          ]);
        } catch (err) {
          console.warn('Failed to copy to clipboard:', err);
        }
      }

      return result;
    },
    [capture],
  );

  /**
   * Capture and share via Web Share API
   */
  const captureAndShare = useCallback(
    async (options: Omit<ScreenshotOptions, 'upload'> = {}) => {
      const result = await capture({ ...options, upload: false });

      if (result && navigator.share) {
        const file = new File([result.blob], options.filename || 'breathe-screenshot.png', {
          type: result.blob.type,
        });

        try {
          await navigator.share({
            title: 'Breathe Together Screenshot',
            files: [file],
          });
        } catch (err) {
          // User cancelled or share failed
          if (err instanceof Error && err.name !== 'AbortError') {
            console.warn('Share failed:', err);
          }
        }
      }

      return result;
    },
    [capture],
  );

  return {
    /** Capture a screenshot */
    capture,
    /** Capture and download locally */
    captureAndDownload,
    /** Capture and copy to clipboard */
    captureAndCopy,
    /** Capture and share via Web Share API */
    captureAndShare,
    /** Whether a capture is in progress */
    isCapturing,
    /** Last capture error, if any */
    error,
  };
}
