import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "../lib/api";

const memoryCache = new Map<string, unknown>();

function getPwaApi() {
  if (typeof window === 'undefined') return null;
  return window.NOCPwa || null;
}

export interface UseApiOptions<T> {
  url: string | null;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  initialData?: T;
  skipCache?: boolean;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  offline: boolean;
  refetch: () => Promise<void>;
}

export function useApi<T = unknown>({
  url,
  method = "GET",
  body,
  initialData = null as unknown as T,
  skipCache = false,
}: UseApiOptions<T>): UseApiResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offline, setOffline] = useState(false);

  const cacheKey = url ? `${method}:${url}:${JSON.stringify(body ?? "")}` : null;
  const bodyRef = useRef(body);
  bodyRef.current = body;

  const execute = useCallback(async () => {
    if (!url) return;

    if (method === "GET" && cacheKey && memoryCache.has(cacheKey) && !skipCache) {
      setData(memoryCache.get(cacheKey) as T);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setOffline(false);
    try {
      const options: RequestInit = { method };
      if (method !== "GET" && bodyRef.current !== undefined) {
        options.body = JSON.stringify(bodyRef.current);
      }
      const res = await fetchWithAuth(url, options);
      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`);
      }
      const result = (await res.json()) as T;
      if (method === "GET" && cacheKey) {
        memoryCache.set(cacheKey, result);
        getPwaApi()?.saveApiCache(url, result).catch(() => {});
      }
      setData(result);
    } catch (err) {
      const isNetwork = err instanceof Error && (err as Error & { code?: string }).code === 'NETWORK_UNAVAILABLE';
      if (method === "GET" && isNetwork) {
        try {
          const cached = await getPwaApi()?.loadApiCache(url);
          if (cached?.data !== undefined) {
            setData(cached.data as T);
            setOffline(true);
            setError(null);
            setLoading(false);
            return;
          }
        } catch {}
      }
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [url, method, cacheKey, skipCache]);

  useEffect(() => {
    execute();
  }, [execute]);

  const refetch = useCallback(async () => {
    if (cacheKey && memoryCache.has(cacheKey)) {
      memoryCache.delete(cacheKey);
    }
    await execute();
  }, [cacheKey, execute]);

  useEffect(() => {
    const handleOnline = () => {
      if (offline && url) refetch();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [offline, url, refetch]);

  return { data, loading, error, offline, refetch };
}
