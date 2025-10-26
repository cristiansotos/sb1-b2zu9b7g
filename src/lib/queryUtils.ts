import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export class QueryTimeoutError extends Error {
  constructor(message: string = 'Query timed out') {
    super(message);
    this.name = 'QueryTimeoutError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  errorMessage?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new QueryTimeoutError(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: boolean;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true,
    onRetry
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;

        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export function isNetworkError(error: any): boolean {
  return (
    error?.message?.includes('network') ||
    error?.message?.includes('fetch') ||
    error?.code === 'NETWORK_ERROR' ||
    error?.name === 'NetworkError' ||
    error?.message?.includes('Failed to fetch')
  );
}

export function isTimeoutError(error: any): boolean {
  return (
    error?.name === 'QueryTimeoutError' ||
    error?.message?.includes('timed out') ||
    error?.message?.includes('timeout')
  );
}

export function getUserFriendlyError(error: any): string {
  if (isNetworkError(error)) {
    return 'No se pudo conectar al servidor. Por favor, verifica tu conexión a internet.';
  }

  if (isTimeoutError(error)) {
    return 'La operación tardó demasiado tiempo. Por favor, inténtalo de nuevo.';
  }

  if (error?.message?.includes('JWT') || error?.message?.includes('auth')) {
    return 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.';
  }

  return error?.message || 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
}

interface QueryWrapperOptions {
  timeoutMs?: number;
  retries?: number;
  throwOnError?: boolean;
}

export async function wrapQuery<T>(
  queryBuilder: any,
  options: QueryWrapperOptions = {}
): Promise<{ data: T | null; error: any }> {
  const {
    timeoutMs = 15000,
    retries = 2,
    throwOnError = false
  } = options;

  try {
    const result = await withTimeout(
      withRetry(
        async () => {
          const { data, error } = await queryBuilder;

          if (error) {
            throw error;
          }

          return { data, error: null };
        },
        {
          maxRetries: retries,
          delayMs: 500,
          backoff: true,
          onRetry: (attempt, error) => {
            console.warn(`[QueryWrapper] Retry attempt ${attempt} due to:`, error.message);
          }
        }
      ),
      timeoutMs
    );

    return result;
  } catch (error: any) {
    console.error('[QueryWrapper] Query failed:', error);

    if (throwOnError) {
      throw error;
    }

    return { data: null, error };
  }
}
