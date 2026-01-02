/**
 * Admin panel for inspirational text management
 * Tabs: Current, History, Generator
 * Features: Message viewing, history tracking, UTC timing, story support, LLM generation
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  InspirationMessage,
  MessageBatch,
  MessageDisplayHistory,
} from '../lib/types/inspirational';

type AdminTab = 'current' | 'history' | 'generator';

interface BatchState {
  currentBatchId: string;
  currentMessageIndex: number;
  nextRotationTime: number;
  nextRotationTimeISO?: string;
  timeUntilNextRotation?: number;
  totalCycles: number;
  batchStartedAtISO?: string;
  currentBatch: MessageBatch | null;
  recentHistory?: MessageDisplayHistory[];
}

interface GenerationState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

// Module-level constant (build-time value)
const API_BASE_URL = import.meta.env.VITE_PRESENCE_API_URL || 'http://localhost:8787';

// Helper function to format ISO timestamps to HH:MM:SS
function formatISO(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Tab styling helper
function getTabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '10px 16px',
    background: active ? '#7ec8d4' : '#333',
    color: active ? '#1a1a1a' : '#f0f0f0',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? 'bold' : 'normal',
  };
}

// Current Tab Content Component
interface CurrentTabProps {
  batchState: BatchState;
  onEditMessage: (index: number, message: InspirationMessage) => void;
  editingMessage: { index: number; top: string; bottom: string } | null;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditingChange: (edit: { index: number; top: string; bottom: string } | null) => void;
}

function CurrentTabContent({
  batchState,
  onEditMessage,
  editingMessage,
  onSaveEdit,
  onCancelEdit,
  onEditingChange,
}: CurrentTabProps) {
  const currentBatch = batchState.currentBatch;
  const currentMessage = currentBatch?.messages[batchState.currentMessageIndex];

  return (
    <div>
      {/* Status Panel */}
      <div
        style={{
          backgroundColor: '#2a2a2a',
          padding: '16px',
          borderRadius: '4px',
          marginBottom: '20px',
          borderLeft: '4px solid #7ec8d4',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <strong>Batch:</strong> {batchState.currentBatchId}
          </div>
          <div>
            <strong>Message:</strong> {batchState.currentMessageIndex + 1} of{' '}
            {currentBatch?.messages.length || 0}
          </div>
          <div>
            <strong>Cycles:</strong> {batchState.totalCycles}
          </div>
          <div>
            <strong>Rotation in:</strong> {batchState.timeUntilNextRotation}s
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>Next rotation:</strong> {formatISO(batchState.nextRotationTimeISO)}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>Batch started:</strong> {formatISO(batchState.batchStartedAtISO)}
          </div>
        </div>
      </div>

      {/* Now Showing */}
      {currentMessage && (
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
              padding: '20px',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
              {currentMessage.top}
            </div>
            <div style={{ fontSize: '16px' }}>{currentMessage.bottom}</div>
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#888' }}>
              Displays for 32 seconds ({currentMessage.cyclesPerMessage} cycles)
            </div>
          </div>
        </div>
      )}

      {/* Message Editor */}
      {editingMessage && currentBatch && (
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
              onChange={(e) => onEditingChange({ ...editingMessage, top: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #7ec8d4',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '13px',
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
              onChange={(e) => onEditingChange({ ...editingMessage, bottom: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #7ec8d4',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onSaveEdit}
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
              onClick={onCancelEdit}
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
      {currentBatch && !editingMessage && (
        <div
          style={{
            backgroundColor: '#2a2a2a',
            padding: '16px',
            borderRadius: '4px',
            borderLeft: '4px solid #9c27b0',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>
            📜 Messages ({currentBatch.messages.length})
          </h3>
          <div
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {currentBatch.messages.map((msg: InspirationMessage, idx: number) => (
              <div
                key={msg.id}
                style={{
                  backgroundColor: idx === batchState.currentMessageIndex ? '#1a5c5c' : '#1a1a1a',
                  padding: '12px',
                  borderRadius: '4px',
                  borderLeft:
                    idx === batchState.currentMessageIndex ? '3px solid #4dd9e8' : '3px solid #666',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>#{idx + 1}</strong> {msg.top}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{msg.bottom}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onEditMessage(idx, msg)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#333',
                    color: '#f0f0f0',
                    border: '1px solid #666',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginLeft: '12px',
                  }}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// History Tab Content Component
interface HistoryTabProps {
  batchState: BatchState;
}

function HistoryTabContent({ batchState }: HistoryTabProps) {
  const historyCount = batchState.recentHistory?.length ?? 0;

  return (
    <div
      style={{
        backgroundColor: '#2a2a2a',
        padding: '16px',
        borderRadius: '4px',
        borderLeft: '4px solid #4ade80',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '12px' }}>
        📜 Recent Messages Shown ({historyCount})
      </h3>
      <div
        style={{
          maxHeight: '600px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {!batchState.recentHistory || batchState.recentHistory.length === 0 ? (
          <div style={{ padding: '12px', color: '#888' }}>No history yet</div>
        ) : (
          batchState.recentHistory.map((entry, idx) => (
            <div
              key={`${entry.entityId}-${idx}`}
              style={{
                backgroundColor: '#1a1a1a',
                padding: '12px',
                borderRadius: '4px',
                borderLeft: '3px solid #4ade80',
              }}
            >
              <div style={{ marginBottom: '4px' }}>
                <strong>#{historyCount - idx}</strong> {entry.entityId}
              </div>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                {formatISO(entry.displayedAtISO)} • {entry.durationSeconds}s • {entry.source}
                {entry.theme && ` • ${entry.theme}`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Generator Tab Content Component
interface GeneratorTabProps {
  generationState: GenerationState;
  generationType: 'messages' | 'story';
  storyType: 'complete-arc' | 'beginning' | 'middle' | 'end';
  onGenerationTypeChange: (type: 'messages' | 'story') => void;
  onStoryTypeChange: (type: 'complete-arc' | 'beginning' | 'middle' | 'end') => void;
  onGenerate: (theme: string, intensity: string, count: number) => void;
  isLoading: boolean;
}

function GeneratorTabContent({
  generationState,
  generationType,
  storyType,
  onGenerationTypeChange,
  onStoryTypeChange,
  onGenerate,
  isLoading,
}: GeneratorTabProps) {
  return (
    <div>
      {generationState.error && (
        <div
          style={{
            backgroundColor: '#5c1a1a',
            color: '#ff9999',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          ❌ {generationState.error}
        </div>
      )}

      {generationState.success && (
        <div
          style={{
            backgroundColor: '#1a5c1a',
            color: '#99ff99',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          ✓ {generationState.success}
        </div>
      )}

      <div
        style={{
          backgroundColor: '#2a2a2a',
          padding: '16px',
          borderRadius: '4px',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Generate Messages/Story</h3>

        {/* Generation Type Selection */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'block', marginBottom: '8px' }}>
            <strong>Type:</strong>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {(['messages', 'story'] as const).map((type) => (
              <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="radio"
                  name="generation-type"
                  value={type}
                  checked={generationType === type}
                  onChange={() => onGenerationTypeChange(type)}
                />
                {type === 'messages' ? 'Individual Messages' : 'Story Arc'}
              </label>
            ))}
          </div>
        </div>

        {/* Generation Parameters */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <div>
            <label htmlFor="theme" style={{ display: 'block', marginBottom: '4px' }}>
              <strong>Theme:</strong>
            </label>
            <select
              id="theme"
              defaultValue="gratitude"
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #666',
                borderRadius: '4px',
              }}
            >
              <option value="gratitude">Gratitude</option>
              <option value="presence">Presence</option>
              <option value="release">Release</option>
              <option value="connection">Connection</option>
            </select>
          </div>

          <div>
            <label htmlFor="intensity" style={{ display: 'block', marginBottom: '4px' }}>
              <strong>Intensity:</strong>
            </label>
            <select
              id="intensity"
              defaultValue="subtle"
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #666',
                borderRadius: '4px',
              }}
            >
              <option value="subtle">Subtle</option>
              <option value="profound">Profound</option>
              <option value="energetic">Energetic</option>
            </select>
          </div>

          <div>
            <label htmlFor="count" style={{ display: 'block', marginBottom: '4px' }}>
              <strong>{generationType === 'story' ? 'Messages per story' : 'Count'}:</strong>
            </label>
            <input
              id="count"
              type="number"
              min={generationType === 'story' ? '3' : '16'}
              max={generationType === 'story' ? '12' : '64'}
              defaultValue={generationType === 'story' ? '6' : '32'}
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #666',
                borderRadius: '4px',
              }}
            />
          </div>

          {generationType === 'story' && (
            <div>
              <label htmlFor="story-type" style={{ display: 'block', marginBottom: '4px' }}>
                <strong>Story Type:</strong>
              </label>
              <select
                id="story-type"
                value={storyType}
                onChange={(e) =>
                  onStoryTypeChange(
                    e.target.value as 'complete-arc' | 'beginning' | 'middle' | 'end',
                  )
                }
                style={{
                  width: '100%',
                  padding: '6px',
                  backgroundColor: '#1a1a1a',
                  color: '#f0f0f0',
                  border: '1px solid #666',
                  borderRadius: '4px',
                }}
              >
                <option value="complete-arc">Complete Arc</option>
                <option value="beginning">Beginning</option>
                <option value="middle">Middle</option>
                <option value="end">End</option>
              </select>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={() => {
            const theme = (document.getElementById('theme') as HTMLSelectElement).value;
            const intensity = (document.getElementById('intensity') as HTMLSelectElement).value;
            const count = parseInt(
              (document.getElementById('count') as HTMLInputElement).value,
              10,
            );
            onGenerate(theme, intensity, count);
          }}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isLoading ? '#666' : '#9c27b0',
            color: '#f0f0f0',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {isLoading ? 'Generating...' : 'Generate'}
        </button>

        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '12px' }}>
          ℹ️ Uses Gemini Flash 3 when LLM_ENABLED=true. Includes recent message context to avoid
          repetition and maintain narrative coherence.
        </div>
      </div>
    </div>
  );
}

export function InspirationAdmin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('current');
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
  const [generationType, setGenerationType] = useState<'messages' | 'story'>('messages');
  const [storyType, setStoryType] = useState<'complete-arc' | 'beginning' | 'middle' | 'end'>(
    'complete-arc',
  );

  // Fetch current batch state
  const fetchBatchState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/inspirational`);
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
    }, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, [fetchBatchState]);

  const handleEditMessage = (index: number, message: InspirationMessage) => {
    setEditingMessage({ index, top: message.top, bottom: message.bottom });
  };

  const saveEditedMessage = async () => {
    if (!editingMessage || !batchState?.currentBatch) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/inspirational/message`, {
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
      const payload = {
        type: generationType,
        theme,
        intensity,
        ...(generationType === 'story' && {
          messageCount: count,
          storyType,
        }),
        ...(generationType === 'messages' && {
          count,
        }),
        recentMessageIds: batchState?.recentHistory?.map((h) => h.entityId) || [],
      };

      const response = await fetch(`${API_BASE_URL}/admin/inspirational/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Generation failed');

      const successMsg =
        generationType === 'story'
          ? `Generated story (${count} messages) - ${storyType} arc`
          : `Generated ${count} messages`;

      setGenerationState({
        loading: false,
        error: null,
        success: `${successMsg} with theme: ${theme}, intensity: ${intensity}`,
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

  if (!batchState) {
    return <div style={{ padding: '20px' }}>Loading inspirational text state...</div>;
  }

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#1a1a1a',
        color: '#f0f0f0',
        fontFamily: 'monospace',
        fontSize: '13px',
        borderRadius: '8px',
        marginBottom: '24px',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#7ec8d4' }}>
        🎭 Inspirational Text Manager
      </h2>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          marginBottom: '20px',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          style={getTabStyle(activeTab === 'current')}
        >
          📌 Current
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={getTabStyle(activeTab === 'history')}
        >
          📜 History
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('generator')}
          style={getTabStyle(activeTab === 'generator')}
        >
          ⚡ Generator
        </button>
      </div>

      {/* Current Tab */}
      {activeTab === 'current' && (
        <CurrentTabContent
          batchState={batchState}
          onEditMessage={handleEditMessage}
          editingMessage={editingMessage}
          onSaveEdit={saveEditedMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onEditingChange={setEditingMessage}
        />
      )}

      {/* History Tab */}
      {activeTab === 'history' && <HistoryTabContent batchState={batchState} />}

      {/* Generator Tab */}
      {activeTab === 'generator' && (
        <GeneratorTabContent
          generationState={generationState}
          generationType={generationType}
          storyType={storyType}
          onGenerationTypeChange={setGenerationType}
          onStoryTypeChange={setStoryType}
          onGenerate={generateMessages}
          isLoading={generationState.loading}
        />
      )}
    </div>
  );
}
