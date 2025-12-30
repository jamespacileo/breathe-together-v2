import React, { type ReactNode } from 'react';
import * as logger from '../lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - Catches React component errors and displays fallback UI
 * Prevents entire app from crashing due to component-level errors
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error);
    logger.error('Error info:', errorInfo.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #faf5ed 0%, #f2d9cc 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#8c7b6c',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              maxWidth: '400px',
              padding: '40px',
              background: 'rgba(250, 248, 243, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(140, 123, 108, 0.15)',
              boxShadow: '0 20px 50px rgba(138, 131, 124, 0.12)',
              textAlign: 'center',
            }}
          >
            <h1
              style={{ fontSize: '1.2rem', fontWeight: 300, marginTop: 0, letterSpacing: '0.1em' }}
            >
              Something went wrong
            </h1>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '24px' }}>
              An unexpected error occurred. Please try reloading the page.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  fontSize: '0.75rem',
                  textAlign: 'left',
                  marginBottom: '24px',
                  padding: '12px',
                  background: 'rgba(140, 123, 108, 0.05)',
                  borderRadius: '8px',
                  color: '#666',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '8px' }}>
                  Error Details
                </summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                background: '#d4a574',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#fff',
                cursor: 'pointer',
                transition: 'background 0.3s ease',
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget;
                btn.style.background = '#c2945f';
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget;
                btn.style.background = '#d4a574';
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
