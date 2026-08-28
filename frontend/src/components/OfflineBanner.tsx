import { useEffect, useState } from 'react';
import { Wifi, WifiOff, X, RefreshCw } from 'lucide-react';
import type { OfflineRuntimeApi } from '../services/offlineRuntime';

interface BannerState {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface OfflineState {
  online: boolean;
  pendingCount: number;
  banner: BannerState | null;
}

export default function OfflineBanner() {
  const [state, setState] = useState<OfflineState>({
    online: navigator.onLine,
    pendingCount: 0,
    banner: null,
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const pwa = (window as unknown as { NOCPwa?: OfflineRuntimeApi }).NOCPwa;
    if (!pwa) return;
    return pwa.subscribe((next) => setState(next));
  }, []);

  const handleClose = () => {
    const pwa = (window as unknown as { NOCPwa?: OfflineRuntimeApi }).NOCPwa;
    pwa?.closeBanner();
  };

  const handleSync = async () => {
    const pwa = (window as unknown as { NOCPwa?: OfflineRuntimeApi }).NOCPwa;
    if (!pwa || !navigator.onLine) return;
    setSyncing(true);
    try {
      await pwa.syncPendingActions();
    } finally {
      setSyncing(false);
    }
  };

  if (!state.banner && state.online) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] px-4 py-3 flex items-center justify-between gap-4 text-xs font-black uppercase tracking-widest shadow-lg transition-colors ${
        state.online
          ? state.banner?.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-blue-600 text-white'
          : 'bg-red-600 text-white'
      }`}
      role="alert"
    >
      <div className="flex items-center gap-3">
        {state.online ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span>
          {state.banner?.message ||
            (state.online ? 'Connexion rétablie' : 'Mode hors-ligne')}
        </span>
        {state.pendingCount > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded">
            {state.pendingCount} action(s) en attente
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {state.pendingCount > 0 && navigator.onLine && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            Synchroniser
          </button>
        )}
        {state.banner && (
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
