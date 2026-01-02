import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';

/**
 * LoadingOverlay - Displays a branded loading screen while assets load.
 *
 * Uses drei's useProgress hook to track asset loading progress.
 * Features a breathing circle animation and smooth fade-out transition.
 *
 * The overlay:
 * 1. Shows immediately on mount with breathing animation
 * 2. Displays loading progress percentage
 * 3. Fades out smoothly when loading completes
 * 4. Unmounts after fade animation completes
 */
export function LoadingOverlay() {
  const { progress, active } = useProgress();
  const [phase, setPhase] = useState<'loading' | 'fading' | 'hidden'>('loading');

  useEffect(() => {
    // When loading completes, start fade-out
    if (!active && progress === 100 && phase === 'loading') {
      // Small delay to ensure scene is rendered
      const fadeTimeout = setTimeout(() => {
        setPhase('fading');
      }, 300);

      return () => clearTimeout(fadeTimeout);
    }
  }, [active, progress, phase]);

  useEffect(() => {
    // After fade animation, hide completely
    if (phase === 'fading') {
      const hideTimeout = setTimeout(() => {
        setPhase('hidden');
      }, 800); // Match CSS transition duration

      return () => clearTimeout(hideTimeout);
    }
  }, [phase]);

  if (phase === 'hidden') return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #2a1f1a 0%, #1a1510 100%)',
        opacity: phase === 'fading' ? 0 : 1,
        transition: 'opacity 800ms ease-out',
        pointerEvents: phase === 'fading' ? 'none' : 'auto',
      }}
    >
      {/* Breathing circle animation */}
      <div className="relative mb-8">
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            width: 120,
            height: 120,
            background: 'radial-gradient(circle, rgba(77, 217, 232, 0.2) 0%, transparent 70%)',
            animation: 'breathePulse 4s ease-in-out infinite',
          }}
        />

        {/* Main breathing circle */}
        <div
          style={{
            width: 80,
            height: 80,
            margin: 20,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, rgba(77, 217, 232, 0.4) 0%, rgba(77, 217, 232, 0.1) 100%)',
            border: '2px solid rgba(77, 217, 232, 0.5)',
            boxShadow: '0 0 40px rgba(77, 217, 232, 0.3), inset 0 0 20px rgba(77, 217, 232, 0.1)',
            animation: 'breatheScale 4s ease-in-out infinite',
          }}
        />

        {/* Inner core */}
        <div
          className="absolute rounded-full"
          style={{
            width: 40,
            height: 40,
            top: 40,
            left: 40,
            background:
              'radial-gradient(circle, rgba(77, 217, 232, 0.6) 0%, rgba(77, 217, 232, 0.2) 100%)',
            animation: 'breatheScale 4s ease-in-out infinite',
            animationDelay: '-0.5s',
          }}
        />
      </div>

      {/* Loading text */}
      <div className="text-center">
        <p
          className="text-lg font-light tracking-widest mb-2"
          style={{ color: 'rgba(255, 255, 255, 0.7)' }}
        >
          {progress < 100 ? 'PREPARING' : 'READY'}
        </p>

        {/* Progress bar */}
        <div
          className="relative overflow-hidden rounded-full"
          style={{
            width: 200,
            height: 4,
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${progress}%`,
              background:
                'linear-gradient(90deg, rgba(77, 217, 232, 0.5) 0%, rgba(77, 217, 232, 0.8) 100%)',
              transition: 'width 300ms ease-out',
            }}
          />
        </div>

        {/* Percentage */}
        <p className="mt-3 text-sm font-mono" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
          {Math.round(progress)}%
        </p>
      </div>

      {/* Inline keyframe animations */}
      <style>
        {`
          @keyframes breatheScale {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }

          @keyframes breathePulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.2); }
          }
        `}
      </style>
    </div>
  );
}
