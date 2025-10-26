# Story Loading Timeout Debugging Guide

## Issue Description

Users experiencing timeout errors when:
1. Inviting a new member to family group
2. Accessing a story
3. Inviting another member
4. Accessing a different story
5. Repeating this cycle multiple times

**Key symptom**: Browser refresh temporarily solves the issue, indicating client-side state pollution.

## Root Causes Identified & Fixed

### 1. Request Deduplicator Cache Pollution ✅ FIXED

**Problem**:
- Cache grew indefinitely without size limits
- Stale cache entries never expired
- Pending requests accumulated without cleanup
- Failed promises remained in the Map

**Solution Implemented**:
- Added `MAX_CACHE_SIZE = 50` and `MAX_PENDING_REQUESTS = 20` limits
- Automatic enforcement with LRU eviction (removes oldest 25% when limit reached)
- New `clearExpiredCache()` method removes expired entries
- Auto-cleanup runs every 30 seconds
- Pattern-based cache invalidation with `invalidateCachePattern()`

### 2. Cache Not Invalidated After Family Operations ✅ FIXED

**Problem**:
- Inviting members didn't clear related story caches
- Family membership changes didn't trigger data refresh
- Stale data served from cache after invitations

**Solution Implemented**:
- `inviteMember()` now calls `invalidateCachePattern(familyGroupId)`
- `acceptInvitation()` calls `invalidateCache()` to clear ALL caches
- `removeMember()` invalidates family-specific patterns
- Stories refetch with fresh data after family changes

### 3. Background Progress Updates Blocking Queries ✅ FIXED

**Problem**:
- Multiple concurrent progress calculations queued up
- No rate limiting on background refreshes
- Advisory locks in `update_story_progress` could block concurrent operations
- Rapid story switching triggered dozens of background operations

**Solution Implemented**:
- Added `backgroundRefreshInProgress` flag to prevent concurrent updates
- `MIN_REFRESH_INTERVAL = 5000ms` prevents excessive updates
- Used `setTimeout` to defer background work, keeping UI responsive
- Reduced timeout from 15s to 10s for faster failure recovery
- Progress updates now skip if already in progress

### 4. No Request Cancellation on Navigation ✅ FIXED

**Problem**:
- Old requests continued when user navigated away
- Component unmount didn't cancel pending fetches
- Switching stories left orphaned fetch operations

**Solution Implemented**:
- Dashboard `useEffect` cleanup invalidates `fetchStoriesForFamily` pattern
- StoryDashboard `useEffect` cleanup invalidates story-specific caches
- Pattern-based invalidation clears related pending requests
- Proper cleanup on component unmount

### 5. Missing Request Tracking & Debugging ✅ FIXED

**Problem**:
- No visibility into performance bottlenecks
- Couldn't identify which operation was timing out
- No metrics on cache efficiency

**Solution Implemented**:
- New `PerformanceMonitor` class tracks all major operations
- Automatic logging of slow operations (>5s)
- `window.__PERFORMANCE_MONITOR__` for runtime inspection
- `window.__PERF_REPORT__()` for performance summary
- Detailed console logging at each critical step

## Debugging Tools Available

### Browser Console Commands

```javascript
// Reset all caches and pending requests
window.__RESET_REQUEST_CACHE__()

// View performance report
window.__PERF_REPORT__()

// Inspect current cache state
window.__PERFORMANCE_MONITOR__.getStats()

// See slowest operations
window.__PERFORMANCE_MONITOR__.getSlowestMeasurements(10)

// Get requestDeduplicator stats (add manually in console)
window.requestDeduplicator = (await import('./src/lib/requestCache.js')).requestDeduplicator
window.requestDeduplicator.getStats()
```

### Console Log Markers

Look for these patterns in console to track the issue:

```
[RequestDeduplicator] - Cache operations
[StoryStore] - Story loading operations
[FamilyGroupStore] - Family member operations
[PerformanceMonitor] - Performance measurements
[Dashboard] - Dashboard lifecycle
[StoryDashboard] - Story view lifecycle
```

### Key Metrics to Monitor

1. **Request Deduplicator Stats**
   - `pendingRequests` should be < 5 normally
   - `cacheSize` should be < 50
   - Watch for warnings about clearing stale requests

2. **Performance Measurements**
   - `fetchStoriesForFamily` should complete < 5000ms
   - `fetchMemories` should complete < 3000ms
   - Background refresh should complete < 10000ms

3. **Cache Behavior**
   - "Cache hit" messages indicate good caching
   - "Cache miss" followed by immediate "Cache hit" indicates problem
   - Pattern invalidations should happen after member operations

## Testing the Fix

### 10-Cycle Stress Test

1. Start with clean browser state (hard refresh: Cmd+Shift+R)
2. Run this cycle 10 times:
   - Invite a user to family group
   - Wait for invitation to complete
   - Access Story A
   - Wait for story to load completely
   - Invite another user
   - Wait for invitation to complete
   - Access Story B
   - Wait for story to load completely

3. Monitor console for:
   - No timeout errors
   - Cache stats staying within limits
   - Performance measurements < 5s
   - No accumulation of pending requests

### Expected Behavior

- Stories load in < 3 seconds consistently
- Cache size stays between 10-30 entries
- Pending requests stay between 0-3
- No memory leaks (Chrome DevTools Memory profiler)
- Background refresh only runs once per 5 seconds

### Signs of Remaining Issues

- "Clearing stale request" warnings appearing frequently (> 1/minute)
- "Enforced cache limit" messages (cache full)
- "Skipping background refresh - already in progress" appearing on every request
- Timeout errors after 5-7 cycles
- Browser becoming sluggish

## Advanced Debugging

### Capture Performance Data

```javascript
// Start monitoring
const perfData = [];
const originalLog = console.log;
console.log = (...args) => {
  if (args[0]?.includes('[PerformanceMonitor]') ||
      args[0]?.includes('[StoryStore]') ||
      args[0]?.includes('[RequestDeduplicator]')) {
    perfData.push({ time: Date.now(), message: args.join(' ') });
  }
  originalLog.apply(console, args);
};

// After testing, analyze
console.table(perfData);
```

### Network Waterfall Analysis

1. Open Chrome DevTools > Network tab
2. Filter by "supabase"
3. Look for:
   - Concurrent requests > 5 (indicates request spam)
   - Requests > 10s duration (indicates timeout issue)
   - Failed requests (RED) after story loading
   - Waterfall showing sequential vs parallel execution

### Memory Leak Detection

1. Open Chrome DevTools > Memory tab
2. Take heap snapshot before test
3. Run 10-cycle test
4. Take heap snapshot after test
5. Compare snapshots:
   - Look for growing arrays/maps
   - Check for detached DOM nodes
   - Verify closures are properly cleaned up

## Configuration Tuning

If issues persist, adjust these constants:

```typescript
// In requestCache.ts
const MAX_CACHE_SIZE = 50;           // Reduce to 30 if memory constrained
const MAX_PENDING_REQUESTS = 20;     // Reduce to 10 for slower connections
const CACHE_CLEANUP_INTERVAL = 30000; // Reduce to 15000 for more aggressive cleanup

// In storyStore.ts
const MIN_REFRESH_INTERVAL = 5000;   // Increase to 10000 to reduce background load
```

## Recovery Actions

If user encounters timeout:

1. **Immediate**: Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
2. **Persistent**: Clear browser cache and cookies
3. **Last resort**: Clear localStorage: `localStorage.clear()`

## Monitoring in Production

Add these to your error tracking:

```typescript
// Track cache stats periodically
setInterval(() => {
  const stats = requestDeduplicator.getStats();
  if (stats.pendingRequests > 10 || stats.cacheSize > 60) {
    // Log to monitoring service
    console.error('[Monitoring] Cache pollution detected', stats);
  }
}, 60000);
```

## Success Criteria

✅ All 10 cycles complete without timeout
✅ Cache size < 50 throughout test
✅ Pending requests < 5 throughout test
✅ No "Clearing stale request" warnings
✅ All operations complete < 5 seconds
✅ Memory usage remains stable (< 10% increase)
✅ Browser remains responsive

## Additional Notes

- The 25-second timeout for `fetchStoriesForFamily` is intentionally high for production database latency
- Background progress updates are intentionally throttled to 1 per 5 seconds
- Cache invalidation is aggressive after family operations to ensure data freshness
- Request deduplication prevents duplicate fetches but may serve stale data if cache invalidation fails
