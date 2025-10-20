type PendingRequest<T> = Promise<T>;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private cache: Map<string, CacheEntry<any>> = new Map();

  deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing;
    }

    const promise = requestFn()
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
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
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  clear(key?: string) {
    if (key) {
      this.pendingRequests.delete(key);
      this.cache.delete(key);
      const timer = this.debounceTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }
    } else {
      this.pendingRequests.clear();
      this.cache.clear();
      this.debounceTimers.forEach(timer => clearTimeout(timer));
      this.debounceTimers.clear();
    }
  }
}

export const requestDeduplicator = new RequestDeduplicator();
