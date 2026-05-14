// Stale-while-revalidate cache backed by the public.api_cache table.
// Returns cached payload instantly when fresh; on upstream failure, falls back
// to any cached payload up to `staleMaxAgeMs` old.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const sb = () =>
  createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

export type CacheRow = { payload: unknown; fetched_at: string };

export const cacheRead = async (key: string): Promise<CacheRow | null> => {
  const { data, error } = await sb()
    .from('api_cache')
    .select('payload, fetched_at')
    .eq('cache_key', key)
    .maybeSingle();
  if (error) {
    console.warn('cacheRead error:', error.message);
    return null;
  }
  return (data as CacheRow) ?? null;
};

export const cacheWrite = async (key: string, payload: unknown): Promise<void> => {
  const { error } = await sb()
    .from('api_cache')
    .upsert(
      { cache_key: key, payload, fetched_at: new Date().toISOString() },
      { onConflict: 'cache_key' },
    );
  if (error) console.warn('cacheWrite error:', error.message);
};

export type ServeOptions<T> = {
  key: string;
  freshMs: number;          // serve cache instantly if newer than this
  staleMaxAgeMs: number;    // fall back to cache up to this old when upstream fails
  fetcher: () => Promise<T>;
  forceFresh?: boolean;     // bypass fresh window (still writes back)
};

export type ServeResult<T> = {
  payload: T;
  source: 'fresh' | 'cache-fresh' | 'cache-stale' | 'upstream-no-cache';
  fetchedAt: string;
};

// Read-through + write-back with stale fallback.
// Throws only if upstream fails AND no usable cache exists.
export const serveCached = async <T>(opts: ServeOptions<T>): Promise<ServeResult<T>> => {
  const { key, freshMs, staleMaxAgeMs, fetcher, forceFresh } = opts;
  const now = Date.now();

  // Fast path: serve fresh cache.
  if (!forceFresh) {
    const cached = await cacheRead(key);
    if (cached && now - new Date(cached.fetched_at).getTime() < freshMs) {
      return {
        payload: cached.payload as T,
        source: 'cache-fresh',
        fetchedAt: cached.fetched_at,
      };
    }
  }

  // Try upstream.
  try {
    const fresh = await fetcher();
    await cacheWrite(key, fresh);
    return { payload: fresh, source: 'fresh', fetchedAt: new Date().toISOString() };
  } catch (err) {
    console.warn(`serveCached upstream failed for ${key}:`, err instanceof Error ? err.message : err);
    const cached = await cacheRead(key);
    if (cached && now - new Date(cached.fetched_at).getTime() < staleMaxAgeMs) {
      return {
        payload: cached.payload as T,
        source: 'cache-stale',
        fetchedAt: cached.fetched_at,
      };
    }
    throw err;
  }
};

export const cacheHeaders = (result: ServeResult<unknown>) => ({
  'X-Cache': result.source,
  'X-Cache-Fetched-At': result.fetchedAt,
});
