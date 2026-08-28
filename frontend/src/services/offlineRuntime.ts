const PENDING_ACTIONS_KEY = 'kokansey_pending_actions_v1';
const API_CACHE_KEY = 'kokansey_api_cache_v1';

interface BannerState {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface OfflineState {
  online: boolean;
  pendingCount: number;
  banner: BannerState | null;
}

export interface PendingAction {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  body?: unknown;
}

type Listener = (state: OfflineState) => void;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function normalizeUrl(url = ''): string {
  const value = String(url || '').trim();
  if (!value) return '/api';
  return value.startsWith('/api') ? value : `/api${value}`;
}

function getAuthHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = window.localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {}
  return headers;
}

async function syncAction(action: PendingAction) {
  if (!action || typeof action !== 'object') {
    throw new Error('Action de synchronisation invalide');
  }

  const options: RequestInit = {
    method: action.method,
    headers: getAuthHeaders(),
  };
  if (action.body && action.method !== 'GET' && action.method !== 'HEAD') {
    options.body = JSON.stringify(action.body);
  }

  const response = await fetch(action.url, options);
  if (!response.ok) {
    let message = 'Synchronisation impossible';
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {}
    throw new Error(message);
  }
}

export interface OfflineRuntimeApi {
  subscribe(listener: Listener): () => void;
  closeBanner(): void;
  refreshPendingCount(): Promise<number>;
  enqueuePendingAction(action: Omit<PendingAction, 'id' | 'timestamp'>): Promise<{ success: boolean; pendingCount: number }>;
  saveApiCache(url: string, data: unknown): Promise<{ data: unknown; updatedAt: string }>;
  loadApiCache(url: string): Promise<{ data: unknown; updatedAt: string }>;
  syncPendingActions(): Promise<{ success: boolean; synced: number; pending: number }>;
}

export function initOfflineRuntime(): OfflineRuntimeApi | null {
  if (typeof window === 'undefined') return null;
  if (window.NOCPwa && typeof window.NOCPwa === 'object') return window.NOCPwa as OfflineRuntimeApi;

  const listeners = new Set<Listener>();
  const pendingList = readJson<PendingAction[]>(PENDING_ACTIONS_KEY, []);
  let state: OfflineState = {
    online: navigator.onLine,
    pendingCount: Array.isArray(pendingList) ? pendingList.length : 0,
    banner: null,
  };

  const emit = () => {
    listeners.forEach((listener) => {
      try {
        listener({ ...state });
      } catch {}
    });
  };

  const setState = (patch: Partial<OfflineState>) => {
    state = { ...state, ...(patch || {}) };
    emit();
  };

  const api: OfflineRuntimeApi = {
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      try {
        listener({ ...state });
      } catch {}
      return () => listeners.delete(listener);
    },

    closeBanner() {
      setState({ banner: null });
    },

    async refreshPendingCount() {
      const list = readJson<PendingAction[]>(PENDING_ACTIONS_KEY, []);
      const pendingCount = Array.isArray(list) ? list.length : 0;
      setState({ pendingCount });
      return pendingCount;
    },

    async enqueuePendingAction(action) {
      const list = readJson<PendingAction[]>(PENDING_ACTIONS_KEY, []);
      const next = Array.isArray(list) ? list : [];
      next.push({
        id: `pending_${Date.now()}_${Math.round(Math.random() * 100000)}`,
        timestamp: Date.now(),
        ...action,
      });
      writeJson(PENDING_ACTIONS_KEY, next);
      setState({
        pendingCount: next.length,
        banner: {
          type: 'error',
          message: `Mode hors-ligne : ${next.length} action(s) en attente de synchronisation.`,
        },
      });
      return { success: true, pendingCount: next.length };
    },

    async saveApiCache(url, data) {
      const key = normalizeUrl(url);
      const cache = readJson<Record<string, { data: unknown; updatedAt: string }>>(API_CACHE_KEY, {});
      const next = cache && typeof cache === 'object' ? cache : {};
      next[key] = { data, updatedAt: new Date().toISOString() };
      writeJson(API_CACHE_KEY, next);
      return next[key];
    },

    async loadApiCache(url) {
      const key = normalizeUrl(url);
      const cache = readJson<Record<string, { data: unknown; updatedAt: string }>>(API_CACHE_KEY, {});
      const item = cache?.[key];
      if (!item) throw new Error('Aucun cache disponible');
      return item;
    },

    async syncPendingActions() {
      if (!navigator.onLine) {
        setState({ online: false });
        throw new Error('Synchronisation impossible hors-ligne');
      }

      const list = readJson<PendingAction[]>(PENDING_ACTIONS_KEY, []);
      const queue = Array.isArray(list) ? list : [];
      if (!queue.length) {
        setState({ pendingCount: 0 });
        return { success: true, synced: 0, pending: 0 };
      }

      const remaining: PendingAction[] = [];
      let synced = 0;
      let lastError: Error | null = null;

      for (const action of queue) {
        try {
          await syncAction(action);
          synced += 1;
        } catch (error) {
          remaining.push(action);
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      writeJson(PENDING_ACTIONS_KEY, remaining);
      setState({
        pendingCount: remaining.length,
        banner: remaining.length
          ? {
              type: 'error',
              message: `${synced} action(s) synchronisée(s), ${remaining.length} restante(s). ${lastError?.message || ''}`.trim(),
            }
          : {
              type: 'success',
              message: `${synced} action(s) synchronisée(s) avec succès.`,
            },
      });

      return { success: remaining.length === 0, synced, pending: remaining.length };
    },
  };

  const handleOnline = () => {
    setState({ online: true });
    api.syncPendingActions().catch(() => {});
  };

  const handleOffline = () => {
    setState({ online: false });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  window.NOCPwa = api as unknown as typeof window.NOCPwa;
  emit();
  api.refreshPendingCount().catch(() => {});

  if (navigator.onLine) {
    api.syncPendingActions().catch(() => {});
  }

  return api;
}

declare global {
  interface Window {
    NOCPwa?: OfflineRuntimeApi;
  }
}
