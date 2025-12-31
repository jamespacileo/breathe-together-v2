# Cost & Performance Analysis

## Architecture: Probabilistic Sampling

Instead of tracking every user individually, we use **statistical sampling**:

1. Each client sends heartbeat with **3% probability**
2. Server stores only active samples (not all users)
3. Total is **extrapolated**: `estimatedUsers = sampleCount / 0.03`
4. Mood distribution calculated from sample ratios

**Trade-off**: ~5-10% accuracy variance for 97% cost reduction.

For a meditation app showing "~247 people breathing with you", this is perfectly acceptable.

---

## Cost Breakdown

### Cloudflare Free Tier Limits

| Resource | Free Limit | Paid Rate |
|----------|------------|-----------|
| Worker requests | 100,000/day | $0.50/million |
| KV reads | 100,000/day | $0.50/million |
| KV writes | 1,000/day | $5.00/million |

### 10,000 Concurrent Users

**Heartbeat writes (3% sample rate):**
```
Samples = 10,000 × 3% = 300 samples/heartbeat cycle
Heartbeats/day = 300 × 2/min × 60 × 24 = 864,000 writes/day
```

**Presence reads (all users poll):**
```
Reads = 10,000 × 6/min × 60 × 24 = 8.64M reads/day
But: Edge cached for 5s → actual KV reads = 8.64M / 30 = ~288k/day
```

**Total Daily Cost:**
| Resource | Volume | Cost |
|----------|--------|------|
| Worker requests | 9.5M/day | Free tier: 100k, then ~$4.50 |
| KV reads | 288k/day | Free tier: 100k, then ~$0.09 |
| KV writes | 864k/day | Free tier: 1k, then ~$4.30 |

**Monthly estimate: ~$270/month** ❌ Still too expensive!

---

## Further Optimization: Reduce Presence Polling

The bottleneck is **presence polling** (10k users × 6 reads/min).

**Solution**: Clients poll less frequently + use local interpolation.

### Optimized Client Behavior

1. **Poll presence every 30s** (not 10s) → 3x fewer reads
2. **Interpolate between polls** → smooth UX
3. **Heartbeat at 3% sample rate** (unchanged)

**Revised calculations:**
```
Presence reads = 10,000 × 2/min × 60 × 24 = 2.88M/day
With edge cache (5s) = 2.88M / 6 = 480k/day
With edge cache (10s) = 2.88M / 12 = 240k/day
```

**Better approach: Use edge cache more aggressively**

If we cache presence for **30 seconds** at the edge:
```
Actual KV reads = 2.88M / 60 = 48k/day ✅ Under free tier!
```

---

## Final Architecture (Target: <$10/month)

### Configuration
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Sample rate | 3% | Balance accuracy vs. cost |
| Heartbeat interval | 30s | Reasonable freshness |
| Presence poll interval | 30s | Matches heartbeat |
| Edge cache (presence) | 30s | Aggressive caching |
| Edge cache (config) | 5min | Rarely changes |
| Sample TTL | 120s | 4× heartbeat interval |

### Cost at 10,000 Users

**Writes (heartbeats):**
```
300 samples × 2/min × 60 × 24 = 864,000 writes/day
= 25.9M writes/month
Cost: $5 × 25.9 = ~$130/month ❌
```

Still too expensive. Need another approach.

---

## Ultra-Low-Cost: Batch Writes

**Problem**: Each heartbeat = 1 KV write = expensive at scale.

**Solution**: Batch multiple samples into single write.

### Time-Bucketed Aggregation

Instead of writing on each heartbeat, use **time buckets**:

1. Client sends heartbeat to `/api/heartbeat`
2. Worker accumulates samples in memory (using Durable Objects)
3. Every 10 seconds, flush batch to KV (1 write instead of N)

**Or simpler: Just accept eventual consistency**

### Lazy Write Strategy

Only write to KV when:
- New unique sample arrives (not seen in current window)
- Scheduled cron (every minute)

With 300 unique samples/2-min-window and 30s heartbeats:
- First heartbeat of each sample → write (300 writes/2min = 9k writes/hour)
- Subsequent heartbeats → no write (already counted)

```
Writes = 300 unique × 30 windows/hour × 24 = 216k/day = 6.5M/month
Cost: $5 × 6.5 = ~$32/month
```

Still not under $10. Need more aggressive optimization.

---

## Minimum Cost Architecture: Read-Heavy + Write-Minimal

### Key Insight

The **mood distribution doesn't change rapidly**. We can:
1. Write only on **mood changes** or **new sessions**
2. Estimate count from **write rate** (inverse sampling)

### Implementation

**On join**: Force heartbeat (register sample)
**On mood change**: Force heartbeat (update sample)
**Otherwise**: Only poll presence (read-only)

**Writes only happen:**
- When user joins (~10k/day for 10k users with 5min avg session? Unclear)
- When mood changes (rare, maybe 1x/session)

Let's estimate 10k users with 15min average session:
```
Sessions/day = 10k × (24h / 0.25h) = 960k sessions
Writes = 960k joins + 960k mood changes = ~2M/day = 60M/month
Cost: $5 × 60 = $300/month ❌
```

---

## Nuclear Option: Client-Side Estimation

For truly minimal cost, **don't use a backend at all**:

1. Show a **simulated count** based on time of day
2. Use **historical averages** for mood distribution
3. Backend only for optional analytics

This gives "~247 people breathing" without any infrastructure cost.

**But this defeats the purpose of "breathing together".**

---

## Practical Minimum: Durable Objects

For 10k users under $10/month, **Durable Objects** are the answer:

### Why Durable Objects

- **In-memory state**: No KV reads/writes for live data
- **WebSocket support**: Push updates instead of polling
- **Pay per duration**: Not per request

### Cost Estimate

```
10k concurrent connections
Average 15min session
Monthly: 10k × 24h × 30d × 60min = 432M connection-minutes

Durable Objects pricing:
- Duration: $0.001/GB-second
- Memory: ~100KB per 1000 connections = 0.1MB total
- Cost: 0.0001GB × 432M × 60s × $0.001 = ~$2.60/month

Plus request charges: ~$5/month for connect/disconnect
```

**Total with Durable Objects: ~$8/month** ✅

---

## Recommendation

### For <$10/month at 10k users: Use Durable Objects

```
┌─────────────┐     WebSocket      ┌──────────────────┐
│   Client    │◄──────────────────►│  Durable Object  │
│             │                    │  (BreathingRoom) │
└─────────────┘                    └──────────────────┘
                                            │
                                            │ Periodic backup
                                            ▼
                                   ┌──────────────────┐
                                   │        KV        │
                                   │   (snapshots)    │
                                   └──────────────────┘
```

### Current Implementation (KV-based)

Works well for **<1000 users** at **<$30/month**.

For MVP/launch, this is fine. Migrate to Durable Objects when scale demands.

---

## Summary Table

| Users | KV-based (current) | With DO |
|-------|-------------------|---------|
| 100 | ~$3/month | ~$2/month |
| 1,000 | ~$30/month | ~$3/month |
| 10,000 | ~$300/month | ~$8/month |
| 100,000 | Not feasible | ~$50/month |

**Conclusion**: Current probabilistic sampling approach works for MVP.
Plan migration to Durable Objects for 10k+ scale.
