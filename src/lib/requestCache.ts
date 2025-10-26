type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
  timeoutId?: NodeJS.Timeout;
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const DEFAULT_REQUEST_TIMEOUT = 30000;
const MAX_CACHE_SIZE = 50;
const MAX_PENDING_REQUESTS = 20;
const CACHE_CLEANUP_INTERVAL = 30000;

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT
  ): Promise<T> {
    this.enforceMaxPendingRequests();

    const existing = this.pendingRequests.get(key);
    if (existing) {
      const age = Date.now() - existing.timestamp;
      if (age < timeoutMs) {
        console.log(`[RequestDeduplicator] Reusing existing request for: ${key}`);
        return existing.promise;
      } else {
        console.warn(`[RequestDeduplicator] Clearing stale request for key: ${key} (age: ${age}ms)`);
        this.clear(key);
      }
    }

    let timeoutId: NodeJS.Timeout | undefined;

    const promise = new Promise<T>((resolve, reject) => {
      timeoutId = setTimeout(() => {
        this.pendingRequests.delete(key);
        reject(new Error(`Request timeout: ${key} exceeded ${timeoutMs}ms`));
      }, timeoutMs);

      requestFn()
        .then(result => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          if (timeoutId) clearTimeout(timeoutId);
          reject(error);
        })
        .finally(() => {
          this.pendingRequests.delete(key);
        });
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      timeoutId
    });

    return promise;
  }

  debounce<T>(
    key: string,
    requestFn: () => Promise<T>,
    delay: number = 300
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        try {
          const result = await this.deduplicate(key, requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);

      this.debounceTimers.set(key, timer);
    });
  }

  async withCache<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttlMs: number = 30000
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > now) {
      console.log(`[RequestDeduplicator] Cache hit for: ${key}`);
      return cached.data;
    }

    console.log(`[RequestDeduplicator] Cache miss for: ${key}`);
    const result = await this.deduplicate(key, requestFn);

    this.enforceMaxCacheSize();
    this.cache.set(key, {
      data: result,
      timestamp: now,
      expiresAt: now + ttlMs
    });

    return result;
  }

  async staleWhileRevalidate<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttlMs: number = 30000
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached) {
      if (cached.expiresAt > now) {
        return cached.data;
      }

      this.deduplicate(key, requestFn).then(result => {
        this.cache.set(key, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttlMs
        });
      }).catch(err => {
        console.error(`Background revalidation failed for ${key}:`, err);
      });

      return cached.data;
    }

    const result = await this.deduplicate(key, requestFn);

    this.cache.set(key, {
      data: result,
      timestamp: now,
      expiresAt: now + ttlMs
    });

    return result;
  }

  invalidateCache(key?: string) {
    if (key) {
      console.log(`[RequestDeduplicator] Invalidating cache for: ${key}`);
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    } else {
      console.log('[RequestDeduplicator] Clearing all cache');
      this.cache.clear();
      this.pendingRequests.clear();
    }
  }

  invalidateCachePattern(pattern: string) {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.invalidateCache(key));
    console.log(`[RequestDeduplicator] Invalidated ${keysToDelete.length} cache entries matching: ${pattern}`);
  }

  clear(key?: string) {
    if (key) {
      const pending = this.pendingRequests.get(key);
      if (pending?.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      this.pendingRequests.delete(key);
      this.cache.delete(key);
      const timer = this.debounceTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }
    } else {
      this.pendingRequests.forEach(pending => {
        if (pending.timeoutId) {
          clearTimeout(pending.timeoutId);
        }
      });
      this.pendingRequests.clear();
      this.cache.clear();
      this.debounceTimers.forEach(timer => clearTimeout(timer));
      this.debounceTimers.clear();
    }
  }

  clearStaleRequests(maxAgeMs: number = DEFAULT_REQUEST_TIMEOUT) {
    const now = Date.now();
    const staleKeys: string[] = [];

    this.pendingRequests.forEach((pending, key) => {
      if (now - pending.timestamp > maxAgeMs) {
        staleKeys.push(key);
      }
    });

    staleKeys.forEach(key => {
      console.warn(`[RequestDeduplicator] Clearing stale request: ${key}`);
      this.clear(key);
    });

    return staleKeys.length;
  }

  clearExpiredCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`[RequestDeduplicator] Cleared ${expiredKeys.length} expired cache entries`);
    }

    return expiredKeys.length;
  }

  private enforceMaxCacheSize() {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toDelete = Math.ceil(MAX_CACHE_SIZE * 0.25);
      for (let i = 0; i < toDelete && i < sortedEntries.length; i++) {
        this.cache.delete(sortedEntries[i][0]);
      }

      console.log(`[RequestDeduplicator] Enforced cache limit, removed ${toDelete} oldest entries`);
    }
  }

  private enforceMaxPendingRequests() {
    if (this.pendingRequests.size >= MAX_PENDING_REQUESTS) {
      const sortedRequests = Array.from(this.pendingRequests.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toDelete = Math.ceil(MAX_PENDING_REQUESTS * 0.25);
      for (let i = 0; i < toDelete && i < sortedRequests.length; i++) {
        const [key, request] = sortedRequests[i];
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
        this.pendingRequests.delete(key);
      }

      console.warn(`[RequestDeduplicator] Enforced pending request limit, removed ${toDelete} oldest requests`);
    }
  }

  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  startAutoCleanup() {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      const staleCount = this.clearStaleRequests();
      const expiredCount = this.clearExpiredCache();

      if (staleCount > 0 || expiredCount > 0) {
        console.log(`[RequestDeduplicator] Auto-cleanup: ${staleCount} stale requests, ${expiredCount} expired cache`);
      }

      const stats = this.getStats();
      console.log('[RequestDeduplicator] Stats:', stats);
    }, CACHE_CLEANUP_INTERVAL);
  }

  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      cacheSize: this.cache.size,
      debounceTimers: this.debounceTimers.size,
    };
  }

  reset() {
    this.clear();
    this.stopAutoCleanup();
    console.log('[RequestDeduplicator] Full reset completed');
  }
}

export const requestDeduplicator = new RequestDeduplicator();

if (typeof window !== 'undefined') {
  requestDeduplicator.startAutoCleanup();

  window.addEventListener('beforeunload', () => {
    requestDeduplicator.reset();
  });

  if (typeof (window as any).__RESET_REQUEST_CACHE__ === 'undefined') {
    (window as any).__RESET_REQUEST_CACHE__ = () => {
      requestDeduplicator.reset();
      requestDeduplicator.startAutoCleanup();
      console.log('[RequestDeduplicator] Manual reset via window.__RESET_REQUEST_CACHE__()');
    };
  }
}
