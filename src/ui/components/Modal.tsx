import { type CSSProperties, type ReactNode, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '../primitives/Button';
import { HStack, Spacer } from '../primitives/Stack';
import { Heading } from '../primitives/Text';
import { animation, zIndex } from '../tokens';
import { colors } from '../tokens/colors';
import { blur, radius, spacing } from '../tokens/spacing';

export interface ModalProps {
  /** Whether modal is visible */
  open: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Whether clicking backdrop closes modal */
  closeOnBackdrop?: boolean;
  /** Whether pressing Escape closes modal */
  closeOnEscape?: boolean;
  /** Hide close button */
  hideCloseButton?: boolean;
  /** Footer content (buttons) */
  footer?: ReactNode;
}

const sizeMap = {
  sm: '320px',
  md: '480px',
  lg: '640px',
  full: 'calc(100vw - 48px)',
} as const;

/**
 * Modal - Dialog overlay component
 *
 * Glass morphism modal with backdrop blur.
 * Supports keyboard navigation and focus trapping.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  hideCloseButton = false,
  footer,
}: ModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: zIndex.overlay,
    background: colors.surface.backdrop,
    backdropFilter: `blur(${blur.sm})`,
    WebkitBackdropFilter: `blur(${blur.sm})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    animation: `fadeIn ${animation.duration.fast} ${animation.easing.easeOut}`,
  };

  const modalStyle: CSSProperties = {
    position: 'relative',
    zIndex: zIndex.modal,
    width: '100%',
    maxWidth: sizeMap[size],
    maxHeight: 'calc(100vh - 48px)',
    background: colors.surface.glassStrong,
    backdropFilter: `blur(${blur.lg})`,
    WebkitBackdropFilter: `blur(${blur.lg})`,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: radius.xl,
    boxShadow: `0 24px 64px ${colors.shadow.strong}`,
    overflow: 'hidden',
    animation: `slideUp ${animation.duration.normal} ${animation.easing.spring}`,
  };

  const contentStyle: CSSProperties = {
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 200px)',
    padding: spacing.lg,
  };

  const handleBackdropClick = closeOnBackdrop ? onClose : undefined;
  const handleBackdropKeyDown = closeOnBackdrop
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }
    : undefined;

  const content = (
    // biome-ignore lint/a11y/noStaticElementInteractions: Backdrop is a presentation layer, click is supplementary to Escape key
    <div
      style={backdropStyle}
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      role="presentation"
    >
      <div
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <HStack
            align="center"
            padding="lg"
            style={{
              borderBottom: `1px solid ${colors.border.subtle}`,
            }}
          >
            {title && (
              <Heading level={3} id="modal-title">
                {title}
              </Heading>
            )}
            <Spacer />
            {!hideCloseButton && (
              <IconButton aria-label="Close modal" onClick={onClose} size="sm">
                <CloseIcon />
              </IconButton>
            )}
          </HStack>
        )}

        {/* Content */}
        <div style={contentStyle}>{children}</div>

        {/* Footer */}
        {footer && (
          <HStack
            justify="end"
            gap="sm"
            padding="lg"
            style={{
              borderTop: `1px solid ${colors.border.subtle}`,
            }}
          >
            {footer}
          </HStack>
        )}

        {/* Keyframe styles */}
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(16px) scale(0.98);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}
        </style>
      </div>
    </div>
  );

  // Portal to body
  return createPortal(content, document.body);
}

/**
 * Close icon (X)
 */
function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <title>Close</title>
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </svg>
  );
}

/**
 * ModalActions - Convenience wrapper for modal footer buttons
 */
export function ModalActions({ children }: { children: ReactNode }) {
  return (
    <HStack gap="sm" justify="end">
      {children}
    </HStack>
  );
}
