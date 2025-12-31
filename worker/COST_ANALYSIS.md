# Cost & Performance Analysis

## Current Implementation

**Architecture:**
- Single KV key storing all sessions as JSON object
- Every heartbeat: read → prune → update → write
- 10 second heartbeat interval, 30 second TTL

**Per-heartbeat cost:**
- 1 KV read
- 1 KV write
- 1 Worker request

---

## Cost Tiers (Cloudflare Free Plan Limits)

| Resource | Free Tier | Paid Rate |
|----------|-----------|-----------|
| Worker requests | 100,000/day | $0.50/million |
| KV reads | 100,000/day | $0.50/million |
| KV writes | 1,000/day | $5.00/million |

**Note:** KV writes are 10x more expensive than reads!

---

## Tier Analysis

### 10 Concurrent Users
```
Heartbeats/day = 10 users × 6/min × 60 min × 24 hr = 86,400

Worker requests: 86,400/day ✅ (under 100k free)
KV reads: 86,400/day ✅ (under 100k free)
KV writes: 86,400/day ❌ (way over 1k free)

Monthly cost: ~$13/month (KV writes)
```

### 100 Concurrent Users
```
Heartbeats/day = 100 × 8,640 = 864,000

Worker requests: 864,000/day ❌
KV reads: 864,000/day ❌
KV writes: 864,000/day ❌

Monthly cost:
- Workers: $13/month
- KV reads: $13/month
- KV writes: $130/month
Total: ~$156/month
```

### 1,000 Concurrent Users
```
Heartbeats/day = 8,640,000

Monthly cost:
- Workers: $130/month
- KV reads: $130/month
- KV writes: $1,300/month
Total: ~$1,560/month
```

### 10,000 Concurrent Users
```
Heartbeats/day = 86,400,000

Monthly cost: ~$15,600/month

Plus: Race conditions cause data loss (concurrent writes overwrite each other)
```

---

## Identified Problems

1. **Write amplification**: Every heartbeat writes the entire session map
2. **Read amplification**: Every heartbeat reads the entire session map
3. **Race conditions**: Concurrent read-modify-write cycles can lose data
4. **No caching**: Presence reads hit KV every time
5. **Short heartbeat**: 10s interval = 6 requests/user/minute

---

## Optimization Strategies

### 1. Longer Heartbeat Interval (30s → 3x cost reduction)
- Change from 10s to 30s heartbeat
- Extend TTL to 90s
- Acceptable for meditation app (not real-time chat)

### 2. Cached Aggregates (eliminate most writes)
Store pre-computed aggregate separately, update less frequently:
- `presence:sessions` - individual sessions (written on heartbeat)
- `presence:aggregate` - cached counts (written by cron every 5s)

### 3. Scheduled Cleanup (cron trigger)
Move session pruning to a scheduled task instead of every request.
Reduces compute per request.

### 4. Edge Cache for Reads
Cache presence response at edge for 5 seconds.
Multiple clients in same region share cached response.

### 5. Write Coalescing
Only write if:
- Session is new, OR
- Mood changed, OR
- Last write was >15s ago

Skip redundant writes for unchanged state.

### 6. Counter-based Architecture (major redesign)
Instead of storing sessions, store only:
```
presence:count = 42
presence:mood:gratitude = 10
presence:mood:presence = 15
...
```
Problem: KV doesn't support atomic increment. Would need Durable Objects.

### 7. Durable Objects (for scale)
Single DO per "breathing room":
- In-memory session map
- WebSocket connections
- No KV needed for live state
- Higher base cost but O(1) per-user

---

## Recommended Optimizations (Simple & Elegant)

**Phase 1 - Quick wins (implement now):**
1. ✅ Increase heartbeat to 30s (3x reduction)
2. ✅ Edge cache presence reads for 5s
3. ✅ Skip redundant writes (mood unchanged)

**Phase 2 - If needed (100+ users):**
4. Scheduled cron for cleanup
5. Separate aggregate cache key

**Phase 3 - At scale (1000+ users):**
6. Migrate to Durable Objects for real-time coordination

---

## Projected Costs After Optimization

### With 30s heartbeat + write coalescing:

| Users | Before | After | Savings |
|-------|--------|-------|---------|
| 10 | $13/mo | $2/mo | 85% |
| 100 | $156/mo | $30/mo | 81% |
| 1,000 | $1,560/mo | $300/mo | 81% |

**Key insight:** Most sessions don't change mood. Write coalescing
eliminates ~80% of writes by only writing on mood change or new session.
