import type { Page } from '@playwright/test';

/**
 * CSS to hide all modal elements
 * Targets SimpleGaiaUI modals: welcome, settings, mood select, keyboard hint
 */
const HIDE_MODALS_CSS = `
  /* Welcome modal backdrop and content */
  [data-testid="welcome-modal"],
  [data-testid="welcome-backdrop"],

  /* Settings modal */
  [data-testid="settings-modal"],
  [data-testid="settings-backdrop"],

  /* Mood selection modal */
  [data-testid="mood-modal"],
  [data-testid="mood-backdrop"],

  /* Keyboard hint */
  [data-testid="keyboard-hint"],

  /* Generic modal selectors (fallback) */
  .modal-backdrop,
  .modal-overlay,
  [role="dialog"],
  [aria-modal="true"],

  /* Leva panel (dev controls) */
  .leva-c-kWgxhW,
  [class*="leva-"],

  /* r3f-perf monitor */
  .r3f-perf,
  [class*="r3f-perf"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

/**
 * Hide all modals via CSS injection
 * This is faster than clicking through dismissal buttons
 */
export async function hideModals(page: Page): Promise<void> {
  // Check if we should skip modal hiding
  if (process.env.NO_MODALS === 'false') {
    return;
  }

  await page.addStyleTag({ content: HIDE_MODALS_CSS });
}

/**
 * Dismiss modals by clicking through them (alternative approach)
 * Use when CSS hiding causes issues with render state
 */
export async function dismissModalsViaClicks(page: Page): Promise<void> {
  // Try to click "Begin" button on welcome modal
  try {
    const beginButton = page.locator('button:has-text("Begin")');
    if (await beginButton.isVisible({ timeout: 2000 })) {
      await beginButton.click();
    }
  } catch {
    // Welcome modal may not be present
  }

  // Try to close settings if open
  try {
    const closeButton = page.locator('[data-testid="settings-close"], button[aria-label="Close"]');
    if (await closeButton.isVisible({ timeout: 1000 })) {
      await closeButton.click();
    }
  } catch {
    // Settings may not be open
  }

  // Small delay for modal animations
  await page.waitForTimeout(300);
}
