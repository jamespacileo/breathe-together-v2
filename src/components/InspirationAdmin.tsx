/**
 * Admin panel for inspirational text management
 * View, edit, and generate inspirational messages
 */

import { useCallback, useEffect, useState } from 'react';
import type { InspirationMessage, MessageBatch } from '../lib/types/inspirational';

interface BatchState {
  currentBatchId: string;
  currentMessageIndex: number;
  nextRotationTime: number;
  totalCycles: number;
  currentBatch: MessageBatch | null;
}

interface GenerationState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

export function InspirationAdmin() {
  const [batchState, setBatchState] = useState<BatchState | null>(null);
  const [editingMessage, setEditingMessage] = useState<{
    index: number;
    top: string;
    bottom: string;
  } | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>({
    loading: false,
    error: null,
    success: null,
  });

  const apiBaseUrl = import.meta.env.VITE_PRESENCE_API_URL || 'http://localhost:8787';

  // Fetch current batch state
  // biome-ignore lint/correctness/useExhaustiveDependencies: apiBaseUrl is constant (from env vars), not reactive
  const fetchBatchState = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/inspirational`);
      if (!response.ok) throw new Error('Failed to fetch batch state');
      const data = (await response.json()) as BatchState;
      setBatchState(data);
    } catch (err) {
      console.error('Fetch batch state error:', err);
    }
  }, []);

  useEffect(() => {
    fetchBatchState();
    const interval = setInterval(() => {
      fetchBatchState();
    }, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [fetchBatchState]);

  const handleEditMessage = (index: number, message: InspirationMessage) => {
    setEditingMessage({ index, top: message.top, bottom: message.bottom });
  };

  const saveEditedMessage = async () => {
    if (!editingMessage || !batchState?.currentBatch) return;

    try {
      const response = await fetch(`${apiBaseUrl}/admin/inspirational/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: batchState.currentBatchId,
          messageIndex: editingMessage.index,
          top: editingMessage.top,
          bottom: editingMessage.bottom,
        }),
      });

      if (!response.ok) throw new Error('Failed to save message');

      setEditingMessage(null);
      await fetchBatchState();
    } catch (err) {
      console.error('Save message error:', err);
    }
  };

  const generateMessages = async (theme: string, intensity: string, count: number) => {
    setGenerationState({ loading: true, error: null, success: null });

    try {
      const response = await fetch(`${apiBaseUrl}/admin/inspirational/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          intensity,
          count,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      setGenerationState({
        loading: false,
        error: null,
        success: `Generated ${count} messages with theme: ${theme}, intensity: ${intensity}`,
      });

      await fetchBatchState();
    } catch (err) {
      setGenerationState({
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        success: null,
      });
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeUntilRotation = (nextTime: number) => {
    const remaining = Math.max(0, nextTime - Date.now());
    const seconds = Math.floor((remaining / 1000) % 60);
    const minutes = Math.floor((remaining / 1000 / 60) % 60);
    return `${minutes}m ${seconds}s`;
  };

  if (!batchState) {
    return <div style={{ padding: '20px' }}>Loading inspirational text state...</div>;
  }

  const currentBatch = batchState.currentBatch;
  const isShowingOverride = editingMessage !== null;

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#1a1a1a',
        color: '#f0f0f0',
        fontFamily: 'monospace',
        fontSize: '14px',
        borderRadius: '8px',
        marginBottom: '24px',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#7ec8d4' }}>
        🎭 Inspirational Text Manager
      </h2>

      {/* Current Status */}
      <div
        style={{
          backgroundColor: '#2a2a2a',
          padding: '16px',
          borderRadius: '4px',
          marginBottom: '20px',
          borderLeft: '4px solid #7ec8d4',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Current Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <strong>Batch:</strong> {batchState.currentBatchId}
          </div>
          <div>
            <strong>Message:</strong> {batchState.currentMessageIndex + 1} of{' '}
            {currentBatch?.messages.length || 0}
          </div>
          <div>
            <strong>Rotation in:</strong> {getTimeUntilRotation(batchState.nextRotationTime)}
          </div>
          <div>
            <strong>Total cycles:</strong> {batchState.totalCycles}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>Updated:</strong> {formatTime(Date.now())}
          </div>
        </div>
      </div>

      {/* Current Message */}
      {currentBatch && (
        <div
          style={{
            backgroundColor: '#2a2a2a',
            padding: '16px',
            borderRadius: '4px',
            marginBottom: '20px',
            borderLeft: '4px solid #4dd9e8',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Now Showing</h3>
          <div
            style={{
              backgroundColor: '#1a1a1a',
              padding: '12px',
              borderRadius: '4px',
              textAlign: 'center',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              {currentBatch.messages[batchState.currentMessageIndex]?.top || '...'}
            </div>
            <div style={{ fontSize: '16px' }}>
              {currentBatch.messages[batchState.currentMessageIndex]?.bottom || '...'}
            </div>
          </div>
        </div>
      )}

      {/* Message Editor */}
      {isShowingOverride && editingMessage && currentBatch && (
        <div
          style={{
            backgroundColor: '#2a2a2a',
            padding: '16px',
            borderRadius: '4px',
            marginBottom: '20px',
            borderLeft: '4px solid #ff9500',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>✏️ Edit Message</h3>
          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="top-text" style={{ display: 'block', marginBottom: '4px' }}>
              Top text:
            </label>
            <input
              id="top-text"
              type="text"
              value={editingMessage.top}
              onChange={(e) => setEditingMessage({ ...editingMessage, top: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #7ec8d4',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="bottom-text" style={{ display: 'block', marginBottom: '4px' }}>
              Bottom text:
            </label>
            <input
              id="bottom-text"
              type="text"
              value={editingMessage.bottom}
              onChange={(e) => setEditingMessage({ ...editingMessage, bottom: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #7ec8d4',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={saveEditedMessage}
              style={{
                padding: '8px 16px',
                backgroundColor: '#7ec8d4',
                color: '#1a1a1a',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingMessage(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#333',
                color: '#f0f0f0',
                border: '1px solid #666',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Message List */}
      {currentBatch && !isShowingOverride && (
        <div
          style={{
            backgroundColor: '#2a2a2a',
            padding: '16px',
            borderRadius: '4px',
            marginBottom: '20px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>
            📜 Messages ({currentBatch.messages.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentBatch.messages.map((msg: InspirationMessage, idx: number) => (
              <div
                key={msg.id}
                style={{
                  backgroundColor: idx === batchState.currentMessageIndex ? '#3a3a3a' : '#1a1a1a',
                  padding: '12px',
                  borderRadius: '4px',
                  borderLeft: idx === batchState.currentMessageIndex ? '4px solid #4dd9e8' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {idx + 1}. {msg.top}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{msg.bottom}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleEditMessage(idx, msg)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ff9500',
                    color: '#1a1a1a',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    marginLeft: '8px',
                  }}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generation Section */}
      <div
        style={{
          backgroundColor: '#2a2a2a',
          padding: '16px',
          borderRadius: '4px',
          marginBottom: '20px',
          borderLeft: '4px solid #9c27b0',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '12px' }}>🤖 Generate with AI</h3>

        {generationState.error && (
          <div style={{ color: '#ff6b6b', marginBottom: '12px', fontSize: '12px' }}>
            Error: {generationState.error}
          </div>
        )}

        {generationState.success && (
          <div style={{ color: '#51cf66', marginBottom: '12px', fontSize: '12px' }}>
            ✓ {generationState.success}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px' }}>
          <div>
            <label
              htmlFor="theme"
              style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}
            >
              Theme
            </label>
            <select
              id="theme"
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #666',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              <option value="gratitude">Gratitude</option>
              <option value="presence">Presence</option>
              <option value="release">Release</option>
              <option value="connection">Connection</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="intensity"
              style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}
            >
              Intensity
            </label>
            <select
              id="intensity"
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #666',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              <option value="subtle">Subtle</option>
              <option value="profound">Profound</option>
              <option value="energetic">Energetic</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="count"
              style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}
            >
              Count
            </label>
            <input
              type="number"
              id="count"
              min="16"
              max="64"
              defaultValue="32"
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #666',
                borderRadius: '4px',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const theme = (document.getElementById('theme') as HTMLSelectElement).value;
              const intensity = (document.getElementById('intensity') as HTMLSelectElement).value;
              const count = parseInt(
                (document.getElementById('count') as HTMLInputElement).value,
                10,
              );
              generateMessages(theme, intensity, count);
            }}
            disabled={generationState.loading}
            style={{
              padding: '6px 16px',
              backgroundColor: generationState.loading ? '#666' : '#9c27b0',
              color: '#f0f0f0',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: generationState.loading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            {generationState.loading ? 'Generating...' : 'Generate'}
          </button>
        </div>

        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '8px' }}>
          ℹ️ Generates messages with Gemini Flash 3 (when LLM_ENABLED=true)
        </div>
      </div>
    </div>
  );
}
