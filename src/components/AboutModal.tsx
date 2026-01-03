import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';

interface AboutModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
}

/**
 * AboutModal - Information about the breathe together experience
 *
 * Explains:
 * - The 4-7-8 breathing technique
 * - Global synchronization concept
 * - Privacy and data handling
 */
export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Handle open animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);

      // Animate in
      const tl = gsap.timeline();

      if (overlayRef.current) {
        tl.fromTo(
          overlayRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: 'power2.out' },
          0,
        );
      }

      if (contentRef.current) {
        tl.fromTo(
          contentRef.current,
          { opacity: 0, scale: 0.95, y: 20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.4)' },
          0.1,
        );
      }
    }
  }, [isOpen]);

  // Handle close with animation
  const handleClose = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        setIsVisible(false);
        onClose();
      },
    });

    if (contentRef.current) {
      tl.to(contentRef.current, {
        opacity: 0,
        scale: 0.95,
        y: 10,
        duration: 0.2,
        ease: 'power2.in',
      });
    }

    if (overlayRef.current) {
      tl.to(overlayRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0.05);
    }
  }, [onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        opacity: 0,
      }}
    >
      <div
        ref={contentRef}
        style={{
          background: 'rgba(253, 251, 247, 0.95)',
          backdropFilter: 'blur(40px)',
          borderRadius: '28px',
          border: '1px solid rgba(160, 140, 120, 0.15)',
          padding: '40px',
          maxWidth: '520px',
          width: '90%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15)',
          opacity: 0,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2
            id="about-modal-title"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '2rem',
              fontWeight: 400,
              margin: '0 0 8px 0',
              letterSpacing: '0.15em',
              textTransform: 'lowercase',
              color: '#4a3f35',
            }}
          >
            breathe together
          </h2>
          <p
            style={{
              fontSize: '0.85rem',
              color: '#8b7a6a',
              margin: 0,
              letterSpacing: '0.05em',
            }}
          >
            A global meditation experience
          </p>
        </div>

        {/* Content sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* About the technique */}
          <section>
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '1.1rem',
                fontWeight: 500,
                color: '#5a4a3a',
                margin: '0 0 12px 0',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              The 4-7-8 Technique
            </h3>
            <p
              style={{
                fontSize: '0.9rem',
                color: '#6a5a4a',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Developed by Dr. Andrew Weil, the 4-7-8 breathing technique is a natural tranquilizer
              for your nervous system. By breathing in for 4 seconds, holding for 7 seconds, and
              exhaling for 8 seconds, you activate your parasympathetic nervous system—the body's
              "rest and digest" mode.
            </p>
          </section>

          {/* Global synchronization */}
          <section>
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '1.1rem',
                fontWeight: 500,
                color: '#5a4a3a',
                margin: '0 0 12px 0',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Breathing Together
            </h3>
            <p
              style={{
                fontSize: '0.9rem',
                color: '#6a5a4a',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              All breathing is synchronized to UTC time. This means everyone around the world—in
              Tokyo, London, New York, or anywhere else—is inhaling and exhaling at exactly the same
              moment. Each glowing shard represents a real person breathing with you right now.
            </p>
          </section>

          {/* Privacy */}
          <section>
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '1.1rem',
                fontWeight: 500,
                color: '#5a4a3a',
                margin: '0 0 12px 0',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Your Privacy
            </h3>
            <p
              style={{
                fontSize: '0.9rem',
                color: '#6a5a4a',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              We value your privacy. No personal information is collected. Your presence is
              represented only by an anonymous shard with a color reflecting your chosen mood. No
              accounts, no tracking—just breathing.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'linear-gradient(135deg, #c9a06c 0%, #b8906c 100%)',
              color: '#fff',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '28px',
              fontSize: '0.8rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(180, 140, 90, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            Close
          </button>

          <p
            style={{
              marginTop: '20px',
              fontSize: '0.7rem',
              color: '#a09080',
              letterSpacing: '0.05em',
            }}
          >
            Made with intention • 2024
          </p>
        </div>
      </div>
    </div>
  );
}
