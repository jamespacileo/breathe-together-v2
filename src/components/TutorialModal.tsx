import { useCallback, useEffect, useState } from 'react';

export type TutorialModalType = 'welcome' | 'others';

interface TutorialModalProps {
  type: TutorialModalType;
  userCount?: number;
  onContinue: () => void;
}

const MODAL_CONTENT: Record<
  TutorialModalType,
  { title: string; content: React.ReactNode; cta: string }
> = {
  welcome: {
    title: 'The 4-7-8 Technique',
    content: (
      <div style={{ textAlign: 'left', maxWidth: '280px', margin: '0 auto' }}>
        <p
          style={{
            fontSize: '0.9rem',
            color: '#5a4d42',
            marginBottom: '20px',
            lineHeight: 1.6,
          }}
        >
          A simple rhythm to calm your mind, synchronized with others around the world.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <PhaseRow number={4} label="Inhale" description="Draw breath in slowly" />
          <PhaseRow number={7} label="Hold" description="Let stillness settle" />
          <PhaseRow number={8} label="Exhale" description="Release completely" />
        </div>
      </div>
    ),
    cta: 'Begin',
  },
  others: {
    title: "You're in Sync",
    content: (
      <p
        style={{
          fontSize: '0.95rem',
          color: '#5a4d42',
          lineHeight: 1.7,
          maxWidth: '280px',
          margin: '0 auto',
        }}
      >
        Right now, people around the world are breathing this same rhythm together.
      </p>
    ),
    cta: 'Join Them',
  },
};

function PhaseRow({
  number,
  label,
  description,
}: {
  number: number;
  label: string;
  description: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(201, 160, 108, 0.15)',
          border: '1.5px solid rgba(201, 160, 108, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '1.1rem',
          fontWeight: 500,
          color: '#5a4d42',
          flexShrink: 0,
        }}
      >
        {number}
      </div>
      <div>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '1rem',
            fontWeight: 500,
            color: '#4a3f35',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            color: '#8a7a6a',
            marginTop: '2px',
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

/**
 * TutorialModal - Key checkpoint modals in the tutorial flow.
 *
 * Types:
 * - welcome: Explains 4/7/8 breathing technique
 * - others: Reveals others are breathing together
 */
export function TutorialModal({ type, userCount = 73, onContinue }: TutorialModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);

  const content = MODAL_CONTENT[type];

  // Fade in on mount
  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    const animateTimer = setTimeout(() => setIsAnimated(true), 200);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(animateTimer);
    };
  }, []);

  const handleContinue = useCallback(() => {
    setIsAnimated(false);
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(onContinue, 250);
    }, 200);
  }, [onContinue]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        background: isAnimated ? 'rgba(0, 0, 0, 0.15)' : 'transparent',
        backdropFilter: 'blur(4px)',
        transition: 'background 0.4s ease-out',
      }}
    >
      <div
        style={{
          background: 'rgba(253, 251, 247, 0.95)',
          backdropFilter: 'blur(40px)',
          borderRadius: '32px',
          border: '1px solid rgba(160, 140, 120, 0.12)',
          padding: '40px 36px 32px',
          maxWidth: '360px',
          width: '90%',
          textAlign: 'center',
          opacity: isAnimated ? 1 : 0,
          transform: isAnimated ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(16px)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.12)',
        }}
      >
        {/* Title */}
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '1.6rem',
            fontWeight: 400,
            letterSpacing: '0.08em',
            color: '#4a3f35',
            margin: '0 0 20px 0',
          }}
        >
          {content.title}
        </h2>

        {/* User count for 'others' modal */}
        {type === 'others' && (
          <p
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '3rem',
              fontWeight: 300,
              color: '#4a3f35',
              margin: '0 0 8px 0',
              letterSpacing: '0.05em',
            }}
          >
            {userCount}
          </p>
        )}

        {/* Content */}
        <div style={{ marginBottom: '28px' }}>{content.content}</div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={handleContinue}
          style={{
            background:
              'linear-gradient(135deg, rgba(201, 160, 108, 0.95) 0%, rgba(180, 140, 90, 0.95) 100%)',
            color: '#fff',
            border: 'none',
            padding: '14px 40px',
            borderRadius: '28px',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 6px 24px rgba(201, 160, 108, 0.35)',
          }}
        >
          {content.cta}
        </button>
      </div>
    </div>
  );
}
