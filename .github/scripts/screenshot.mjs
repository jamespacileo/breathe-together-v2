import { chromium } from 'playwright';
import { mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const PREVIEW_URL = process.env.PREVIEW_URL;
const SCREENSHOTS_DIR = './screenshots';

if (!PREVIEW_URL) {
  console.error('❌ PREVIEW_URL environment variable is required');
  process.exit(1);
}

// Load breathing config
const breathConfig = JSON.parse(
  await readFile(new URL('../../breath-config.json', import.meta.url), 'utf-8')
);

const PHASES = {
  inhale: { start: 0, end: breathConfig.breathPhases.inhale },
  holdIn: {
    start: breathConfig.breathPhases.inhale,
    end: breathConfig.breathPhases.inhale + breathConfig.breathPhases.holdIn
  },
  exhale: {
    start: breathConfig.breathPhases.inhale + breathConfig.breathPhases.holdIn,
    end: breathConfig.breathPhases.inhale + breathConfig.breathPhases.holdIn + breathConfig.breathPhases.exhale
  },
};
const CYCLE_DURATION = PHASES.exhale.end;

const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

// Get current position in cycle (0 to CYCLE_DURATION)
const getCyclePos = () => (Date.now() / 1000) % CYCLE_DURATION;

// Get ms until midpoint of a phase
function getMsUntilPhase(phase) {
  const mid = (PHASES[phase].start + PHASES[phase].end) / 2;
  let wait = mid - getCyclePos();
  if (wait < 0.5) wait += CYCLE_DURATION; // Wait for next cycle if too close
  return Math.ceil(wait * 1000);
}

// Wait for page to be ready (canvas rendering)
async function waitForReady(page) {
  await page.waitForSelector('canvas', { timeout: 30000 });
  // Wait for Three.js to initialize
  await page.waitForTimeout(2000);
  // Wait for fonts with timeout
  await page.evaluate(() => Promise.race([
    document.fonts.ready,
    new Promise(r => setTimeout(r, 3000))
  ]));
}

async function captureScreenshots() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    await mkdir(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader'],
  });

  console.log(`Capturing from: ${PREVIEW_URL}`);
  console.log(`Cycle: ${CYCLE_DURATION}s | Viewports: ${VIEWPORTS.map(v => v.name).join(', ')}\n`);

  try {
    // Create all viewport contexts and pages in parallel
    console.log('🚀 Initializing viewports in parallel...');
    const contexts = await Promise.all(
      VIEWPORTS.map(async (vp) => {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
        });
        const page = await ctx.newPage();
        await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 60000 });
        await waitForReady(page);
        console.log(`   ✓ ${vp.name} ready`);
        return { vp, ctx, page };
      })
    );

    // Capture breathing phases - wait once, capture all viewports
    const breathingPhases = ['inhale', 'holdIn', 'exhale'];
    for (const phase of breathingPhases) {
      const ms = getMsUntilPhase(phase);
      console.log(`\n⏳ Waiting ${(ms/1000).toFixed(1)}s for ${phase}...`);
      await new Promise(r => setTimeout(r, ms));

      console.log(`📸 Capturing ${phase} (all viewports)...`);
      await Promise.all(
        contexts.map(async ({ vp, page }) => {
          const filename = `${vp.name}-${phase === 'holdIn' ? 'hold' : phase}.png`;
          await page.screenshot({
            path: `${SCREENSHOTS_DIR}/${filename}`,
            timeout: 30000,
          });
          console.log(`   ✓ ${filename}`);
        })
      );
    }

    // Capture admin page - all viewports in parallel
    console.log('\n📸 Capturing admin (all viewports)...');
    await Promise.all(
      contexts.map(async ({ vp, ctx, page }) => {
        await page.goto(`${PREVIEW_URL}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1000);
        const filename = `${vp.name}-admin.png`;
        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/${filename}`,
          timeout: 30000,
        });
        console.log(`   ✓ ${filename}`);
      })
    );

    // Cleanup
    await Promise.all(contexts.map(({ ctx }) => ctx.close()));

    console.log('\n✨ Done! Captured 12 screenshots.');
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
