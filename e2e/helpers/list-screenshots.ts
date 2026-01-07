import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface ScreenshotInfo {
  filename: string;
  path: string;
  timestamp: string;
  tag?: string;
  viewport: string;
  sizeMB: number;
  age: string;
}

/**
 * Get current git branch name (normalized for filename comparison)
 */
function getCurrentBranch(): string {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    // Normalize branch name to match filename format (/ becomes -)
    return branch.replace(/\//g, '-');
  } catch {
    return 'unknown-branch';
  }
}

/**
 * Parse screenshot filename to extract metadata
 */
function parseScreenshotFilename(filename: string): {
  branch: string;
  viewport: string;
  tag?: string;
  timestamp: string;
} | null {
  // Format: <branch>_<viewport>_[tag]_<timestamp>.png
  const parts = filename.replace('.png', '').split('_');

  if (parts.length < 3) return null;

  // Last part is always timestamp (YYYYMMDD-HHmmss)
  const timestamp = parts[parts.length - 1];

  // Second-to-last or third-to-last is viewport
  let viewport = '';
  let tag: string | undefined;

  if (parts.length === 3) {
    // branch_viewport_timestamp
    viewport = parts[1];
  } else if (parts.length === 4) {
    // branch_viewport_tag_timestamp
    viewport = parts[1];
    tag = parts[2];
  } else {
    // branch-with-dashes_viewport_[tag]_timestamp
    const lastTwo = parts.slice(-2);
    const lastThree = parts.slice(-3);

    // Check if second-to-last is viewport (desktop, tablet, mobile)
    if (['desktop', 'tablet', 'mobile'].includes(lastTwo[0])) {
      viewport = lastTwo[0];
    } else if (['desktop', 'tablet', 'mobile'].includes(lastThree[0])) {
      viewport = lastThree[0];
      tag = lastThree[1];
    }
  }

  const branch = parts.slice(0, parts.indexOf(viewport)).join('_');

  return { branch, viewport, tag, timestamp };
}

/**
 * Format file age as human-readable string
 */
function formatAge(mtime: Date): string {
  const now = Date.now();
  const diff = now - mtime.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * List screenshots for the current branch
 */
export function listBranchScreenshots(limit: number = 10): ScreenshotInfo[] {
  const dir = process.env.SCREENSHOTS_DIR || './screenshots';

  if (!existsSync(dir)) {
    return [];
  }

  const currentBranch = getCurrentBranch();
  const files = readdirSync(dir);
  const screenshots: ScreenshotInfo[] = [];

  for (const filename of files) {
    if (!filename.endsWith('.png')) continue;

    const parsed = parseScreenshotFilename(filename);
    if (!parsed || parsed.branch !== currentBranch) continue;

    const filepath = join(dir, filename);
    const stats = statSync(filepath);
    const sizeMB = parseFloat((stats.size / 1024 / 1024).toFixed(2));

    screenshots.push({
      filename,
      path: filepath,
      timestamp: parsed.timestamp,
      tag: parsed.tag,
      viewport: parsed.viewport,
      sizeMB,
      age: formatAge(stats.mtime),
    });
  }

  // Sort by timestamp descending (newest first)
  screenshots.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return screenshots.slice(0, limit);
}

/**
 * Print screenshot list to console
 */
export function printScreenshotList(screenshots: ScreenshotInfo[]): void {
  if (screenshots.length === 0) {
    console.log('\nNo screenshots found for current branch.');
    return;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('Recent Screenshots for Current Branch');
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  for (const screenshot of screenshots) {
    const tagStr = screenshot.tag ? `[${screenshot.tag}] ` : '';
    const viewportStr = screenshot.viewport.padEnd(8);
    const sizeStr = `${screenshot.sizeMB.toFixed(1)}MB`.padStart(7);
    const ageStr = screenshot.age.padStart(8);

    console.log(`  ${tagStr}${viewportStr} ${sizeStr}  ${ageStr}  ${screenshot.path}`);
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}
