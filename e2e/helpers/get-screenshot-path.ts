import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

/**
 * Get branch-aware screenshot path with timestamp
 * Format: ./screenshots/<branch>_<viewport>_[tag]_<timestamp>.png
 */
export function getScreenshotPath(viewport: string, tag?: string): string {
  const dir = process.env.SCREENSHOTS_DIR || './screenshots';

  // Ensure directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Check for custom output path override
  if (process.env.SCREENSHOT_OUTPUT) {
    return process.env.SCREENSHOT_OUTPUT;
  }

  // Get current branch name
  let branch = 'unknown-branch';
  try {
    branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    // Sanitize branch name for filename (replace / with -)
    branch = branch.replace(/\//g, '-');
  } catch {
    // Fallback if not in a git repo
  }

  // Generate timestamp (YYYYMMDD-HHmmss format)
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

  // Get tag from env or parameter
  const screenshotTag = process.env.SCREENSHOT_TAG || tag;

  // Build filename parts
  const parts = [branch, viewport, screenshotTag, timestamp].filter(Boolean);
  const filename = `${parts.join('_')}.png`;

  return `${dir}/${filename}`;
}

/**
 * Get a shared timestamp for consistent naming across parallel screenshots
 */
export function getSharedTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
}
