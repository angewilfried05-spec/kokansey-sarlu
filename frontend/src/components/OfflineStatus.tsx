import { useEffect, useState } from 'react';
import { offlineStorage } from '../lib/offlineStorage';

export default function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(offlineStorage.getConnectionStatus());
      setPendingCount(offlineStorage.getPendingCount());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    setSyncResult(null);

    const result = await offlineStorage.syncPendingOperations();
    setSyncResult(result);
    setPendingCount(offlineStorage.getPendingCount());

    setSyncing(false);

    // Masquer le résultat après 3 secondes
    setTimeout(() => setSyncResult(null), 3000);
  };

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
      isOnline ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium">
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </span>
      </div>

      {pendingCount > 0 && (
        <div className="mt-2 text-sm text-gray-600">
          {pendingCount} opération(s) en attente
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          {syncing ? 'Synchronisation...' : 'Synchroniser'}
        </button>
      )}

      {syncResult && (
        <div className="mt-2 text-sm">
          <span className="text-green-600">{syncResult.success} synchronisée(s)</span>
          {syncResult.failed > 0 && (
            <span className="text-red-600 ml-2">{syncResult.failed} échouée(s)</span>
          )}
        </div>
      )}
    </div>
  );
}
