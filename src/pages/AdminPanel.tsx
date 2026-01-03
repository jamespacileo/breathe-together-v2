/**
 * Admin Panel - Organized monitoring dashboard with tabs
 *
 * Tabs:
 * - Overview: Statistics and mood distribution
 * - Users: Current connected users
 * - Events: Recent connection and mood events
 * - Messages: Inspirational text management
 */

import { useCallback, useEffect, useState } from 'react';
import { InspirationAdmin } from '../components/InspirationAdmin';
import { MOOD_COLORS } from '../styles/designTokens';

type AdminTab = 'overview' | 'users' | 'events' | 'messages';

// =============================================================================
// Types
// =============================================================================

interface AdminUser {
  order: number;
  id: string;
  mood: string;
  connectedAt: number;
  durationMs: number;
}

interface AdminEvent {
  id: string;
  type: 'join' | 'leave' | 'mood_change';
  userId: string;
  mood?: string;
  previousMood?: string;
  timestamp: number;
}

interface AdminStats {
  totalEvents: number;
  joinCount: number;
  leaveCount: number;
  moodChangeCount: number;
  currentUsers: number;
  presence: {
    count: number;
    moods: Record<string, number>;
  };
}

// =============================================================================
// API Helpers
// =============================================================================

const API_BASE = import.meta.env.VITE_PRESENCE_API_URL || 'http://localhost:8787';

async function fetchAdminUsers(): Promise<{ users: AdminUser[] }> {
  const res = await fetch(`${API_BASE}/admin/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

async function fetchAdminEvents(limit = 50): Promise<{ events: AdminEvent[] }> {
  const res = await fetch(`${API_BASE}/admin/events?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

// =============================================================================
// Formatting Helpers
// =============================================================================

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getEventIcon(type: AdminEvent['type']): string {
  switch (type) {
    case 'join':
      return '+';
    case 'leave':
      return '-';
    case 'mood_change':
      return '~';
  }
}

function getEventColor(type: AdminEvent['type']): string {
  switch (type) {
    case 'join':
      return '#4ade80'; // green
    case 'leave':
      return '#f87171'; // red
    case 'mood_change':
      return '#fbbf24'; // yellow
  }
}

// =============================================================================
// Component
// =============================================================================

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [usersData, eventsData, statsData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminEvents(30),
        fetchAdminStats(),
      ]);
      setUsers(usersData.users);
      setEvents(eventsData.events);
      setStats(statsData);
      setLastUpdate(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    // Fire-and-forget initial fetch - errors handled internally
    void fetchData();
    const interval = setInterval(() => {
      // Fire-and-forget polling - errors handled internally
      void fetchData();
    }, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'events', label: 'Events', icon: '📝' },
    { id: 'messages', label: 'Messages', icon: '💬' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a1a',
        color: '#e5e5e5',
        fontFamily: "'JetBrains Mono', 'SF Mono', Monaco, monospace",
        fontSize: '13px',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #333',
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 500 }}>Breathe Together - Admin</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {error && <span style={{ color: '#f87171', fontSize: '12px' }}>Error: {error}</span>}
          <span style={{ color: '#666', fontSize: '12px' }}>
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            type="button"
            onClick={fetchData}
            style={{
              background: '#333',
              border: '1px solid #444',
              borderRadius: '4px',
              padding: '6px 12px',
              color: '#e5e5e5',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav
        style={{
          display: 'flex',
          gap: '0',
          padding: '0 24px',
          borderBottom: '1px solid #333',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 'none',
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #7ec8d4' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? '#7ec8d4' : '#666',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'color 0.2s, border-color 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content - Scrollable */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
        }}
      >
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Bar */}
            {stats && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                <StatCard label="Current Users" value={stats.currentUsers} />
                <StatCard label="Total (w/ sim)" value={stats.presence.count} />
                <StatCard label="Joins" value={stats.joinCount} color="#4ade80" />
                <StatCard label="Leaves" value={stats.leaveCount} color="#f87171" />
                <StatCard label="Mood Changes" value={stats.moodChangeCount} color="#fbbf24" />
                <StatCard label="Total Events" value={stats.totalEvents} />
              </div>
            )}

            {/* Mood Distribution */}
            {stats && (
              <div
                style={{
                  padding: '16px',
                  background: '#242424',
                  borderRadius: '8px',
                  border: '1px solid #333',
                }}
              >
                <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#999' }}>
                  Mood Distribution
                </h3>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  {Object.entries(stats.presence.moods).map(([mood, count]) => (
                    <div key={mood} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: MOOD_COLORS[mood as keyof typeof MOOD_COLORS] || '#666',
                        }}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{mood}:</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div
            style={{
              background: '#242424',
              borderRadius: '8px',
              border: '1px solid #333',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #333',
                flexShrink: 0,
              }}
            >
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
                Current Users ({users.length})
              </h2>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {users.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                  No users connected
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1a1a1a', position: 'sticky', top: 0 }}>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>User ID</th>
                      <th style={thStyle}>Mood</th>
                      <th style={thStyle}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: '1px solid #333',
                          background: index % 2 === 0 ? 'transparent' : '#1f1f1f',
                        }}
                      >
                        <td style={tdStyle}>{user.order}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace' }}>
                          {user.id.slice(0, 12)}...
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background:
                                  MOOD_COLORS[user.mood as keyof typeof MOOD_COLORS] || '#666',
                              }}
                            />
                            {user.mood}
                          </span>
                        </td>
                        <td style={tdStyle}>{formatDuration(user.durationMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div
            style={{
              background: '#242424',
              borderRadius: '8px',
              border: '1px solid #333',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #333',
                flexShrink: 0,
              }}
            >
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
                Recent Events ({events.length})
              </h2>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {events.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                  No events yet
                </div>
              ) : (
                <div style={{ padding: '8px 0' }}>
                  {events.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderBottom: '1px solid #2a2a2a',
                      }}
                    >
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          background: getEventColor(event.type),
                          color: '#1a1a1a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '14px',
                          flexShrink: 0,
                        }}
                      >
                        {getEventIcon(event.type)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ marginBottom: '2px' }}>
                          <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                            {event.type.replace('_', ' ')}
                          </span>
                          <span style={{ color: '#666', marginLeft: '8px' }}>
                            {event.userId.slice(0, 12)}...
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {event.type === 'mood_change' ? (
                            <>
                              <span
                                style={{
                                  color:
                                    MOOD_COLORS[event.previousMood as keyof typeof MOOD_COLORS] ||
                                    '#666',
                                }}
                              >
                                {event.previousMood}
                              </span>
                              {' → '}
                              <span
                                style={{
                                  color:
                                    MOOD_COLORS[event.mood as keyof typeof MOOD_COLORS] || '#666',
                                }}
                              >
                                {event.mood}
                              </span>
                            </>
                          ) : (
                            <span
                              style={{
                                color:
                                  MOOD_COLORS[event.mood as keyof typeof MOOD_COLORS] || '#666',
                              }}
                            >
                              {event.mood}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ color: '#666', fontSize: '11px', flexShrink: 0 }}>
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && <InspirationAdmin />}
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function StatCard({
  label,
  value,
  color = '#e5e5e5',
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: '#242424',
        borderRadius: '8px',
        border: '1px solid #333',
        padding: '12px 16px',
      }}
    >
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

// =============================================================================
// Styles
// =============================================================================

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: '11px',
  textTransform: 'uppercase',
  color: '#666',
  fontWeight: 500,
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
};

export default AdminPanel;
