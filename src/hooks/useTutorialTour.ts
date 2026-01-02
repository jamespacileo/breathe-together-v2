import { type Driver, type DriveStep, driver } from 'driver.js';
import { useCallback, useEffect, useRef } from 'react';
import 'driver.js/dist/driver.css';

export interface TutorialTourCallbacks {
  /** Called when welcome step completes - start showing user's shard */
  onWelcomeComplete?: () => void;
  /** Called when breathing intro step completes - start breathing guidance */
  onBreathingStart?: () => void;
  /** Called when entire tour completes */
  onComplete?: () => void;
  /** Called when tour is destroyed/skipped */
  onDestroy?: () => void;
}

/**
 * useTutorialTour - Driver.js integration for breathing tutorial
 *
 * Provides a step-by-step guided tour explaining:
 * 1. Welcome - introduces the experience
 * 2. The 4-7-8 breathing technique
 * 3. User's presence visualization
 * 4. Breathing practice guidance
 * 5. Social reveal - others breathing together
 */
export function useTutorialTour(callbacks: TutorialTourCallbacks = {}) {
  const driverRef = useRef<Driver | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Initialize driver instance
  useEffect(() => {
    const steps: DriveStep[] = [
      {
        popover: {
          title: 'Welcome',
          description: `
            <div style="text-align: center; padding: 8px 0;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #5a4a3a;">
                Take a moment to slow down and breathe with others around the world.
              </p>
              <p style="margin: 0; font-size: 13px; color: #8a7a6a; font-style: italic;">
                This guided experience will teach you the 4-7-8 relaxation technique.
              </p>
            </div>
          `,
          align: 'center',
          side: 'over',
        },
      },
      {
        popover: {
          title: 'The 4-7-8 Technique',
          description: `
            <div style="padding: 8px 0;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; color: #5a4a3a; text-align: center;">
                A simple breathing pattern that calms your nervous system:
              </p>
              <div style="display: flex; justify-content: center; gap: 16px; margin: 16px 0;">
                <div style="text-align: center;">
                  <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #c9a06c 0%, #d4b896 100%); display: flex; align-items: center; justify-content: center; margin: 0 auto 8px;">
                    <span style="font-size: 18px; font-weight: 600; color: #fff;">4</span>
                  </div>
                  <span style="font-size: 12px; color: #7a6a5a; text-transform: uppercase; letter-spacing: 0.05em;">Inhale</span>
                </div>
                <div style="text-align: center;">
                  <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #a89878 0%, #b8a888 100%); display: flex; align-items: center; justify-content: center; margin: 0 auto 8px;">
                    <span style="font-size: 18px; font-weight: 600; color: #fff;">7</span>
                  </div>
                  <span style="font-size: 12px; color: #7a6a5a; text-transform: uppercase; letter-spacing: 0.05em;">Hold</span>
                </div>
                <div style="text-align: center;">
                  <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #8a7a68 0%, #9a8a78 100%); display: flex; align-items: center; justify-content: center; margin: 0 auto 8px;">
                    <span style="font-size: 18px; font-weight: 600; color: #fff;">8</span>
                  </div>
                  <span style="font-size: 12px; color: #7a6a5a; text-transform: uppercase; letter-spacing: 0.05em;">Exhale</span>
                </div>
              </div>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #8a7a6a; text-align: center;">
                One complete breath cycle takes 19 seconds.
              </p>
            </div>
          `,
          align: 'center',
          side: 'over',
        },
      },
      {
        // No element highlight - shard orbits dynamically around globe
        popover: {
          title: 'This is You',
          description: `
            <div style="text-align: center; padding: 8px 0;">
              <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #5a4a3a;">
                See the glowing shard orbiting Earth?
              </p>
              <p style="margin: 0; font-size: 14px; color: #5a4a3a;">
                That's <strong>you</strong> — your presence in this moment.
              </p>
            </div>
          `,
          align: 'center',
          side: 'over',
        },
        onHighlightStarted: () => {
          callbacksRef.current.onWelcomeComplete?.();
        },
      },
      {
        // No element highlight - breathing UI appears after tour
        popover: {
          title: "Let's Practice",
          description: `
            <div style="text-align: center; padding: 8px 0;">
              <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #5a4a3a;">
                Follow the breathing prompts for one complete cycle.
              </p>
              <p style="margin: 0; font-size: 13px; color: #8a7a6a;">
                A progress ring will guide you through each phase.
              </p>
            </div>
          `,
          align: 'center',
          side: 'over',
        },
        onHighlightStarted: () => {
          callbacksRef.current.onBreathingStart?.();
        },
      },
    ];

    driverRef.current = driver({
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Continue',
      prevBtnText: 'Back',
      doneBtnText: 'Begin Breathing',
      allowClose: false,
      overlayColor: 'rgba(30, 25, 20, 0.75)',
      stagePadding: 12,
      stageRadius: 8,
      popoverClass: 'tutorial-popover',
      steps,
      onDestroyStarted: () => {
        // Call onDestroy callback - driver handles its own destruction
        callbacksRef.current.onDestroy?.();
      },
      onDestroyed: () => {
        callbacksRef.current.onComplete?.();
      },
    });

    return () => {
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    driverRef.current?.drive();
  }, []);

  const moveNext = useCallback(() => {
    driverRef.current?.moveNext();
  }, []);

  const destroy = useCallback(() => {
    driverRef.current?.destroy();
  }, []);

  const isActive = useCallback(() => {
    return driverRef.current?.isActive() ?? false;
  }, []);

  return {
    start,
    moveNext,
    destroy,
    isActive,
  };
}
