// Service de stockage hors-ligne pour synchronisation mobile

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

class OfflineStorage {
  private readonly STORAGE_KEY = 'kokansey_offline_queue';
  private readonly DATA_KEY = 'kokansey_offline_data';
  private queue: OfflineOperation[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.loadQueue();
    this.setupNetworkListeners();
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      this.queue = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur chargement file hors-ligne:', error);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Erreur sauvegarde file hors-ligne:', error);
    }
  }

  private setupNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.syncPendingOperations();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });

      this.isOnline = navigator.onLine;
    }
  }

  // Ajouter une opération à la file hors-ligne
  addOperation(type: OfflineOperation['type'], endpoint: string, data: any): string {
    const operation: OfflineOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      endpoint,
      data,
      timestamp: Date.now(),
      synced: false
    };

    this.queue.push(operation);
    this.saveQueue();

    if (this.isOnline) {
      this.syncOperation(operation);
    }

    return operation.id;
  }

  // Synchroniser une opération spécifique
  private async syncOperation(operation: OfflineOperation): Promise<boolean> {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      let response;
      const url = `${API_BASE_URL}${operation.endpoint}`;

      switch (operation.type) {
        case 'create':
          response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(operation.data)
          });
          break;
        case 'update':
          response = await fetch(`${url}/${operation.data.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(operation.data)
          });
          break;
        case 'delete':
          response = await fetch(`${url}/${operation.data.id}`, {
            method: 'DELETE',
            headers
          });
          break;
      }

      if (response.ok) {
        this.markAsSynced(operation.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur synchronisation opération:', error);
      return false;
    }
  }

  // Marquer une opération comme synchronisée
  private markAsSynced(operationId: string) {
    const index = this.queue.findIndex(op => op.id === operationId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
    }
  }

  // Synchroniser toutes les opérations en attente
  async syncPendingOperations(): Promise<{ success: number; failed: number }> {
    if (!this.isOnline) {
      return { success: 0, failed: 0 };
    }

    const pendingOps = this.queue.filter(op => !op.synced);
    let success = 0;
    let failed = 0;

    for (const operation of pendingOps) {
      const result = await this.syncOperation(operation);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  // Obtenir le nombre d'opérations en attente
  getPendingCount(): number {
    return this.queue.filter(op => !op.synced).length;
  }

  // Vider la file d'attente
  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }

  // Obtenir le statut de connexion
  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  // Stocker des données localement pour accès hors-ligne
  storeData(key: string, data: any) {
    try {
      const stored = localStorage.getItem(this.DATA_KEY) || '{}';
      const parsed = JSON.parse(stored);
      parsed[key] = data;
      localStorage.setItem(this.DATA_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.error('Erreur stockage données:', error);
    }
  }

  // Récupérer des données stockées localement
  getData(key: string): any {
    try {
      const stored = localStorage.getItem(this.DATA_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed[key] || null;
    } catch (error) {
      console.error('Erreur récupération données:', error);
      return null;
    }
  }

  // Nettoyer les anciennes données
  cleanupOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000) {
    const now = Date.now();
    this.queue = this.queue.filter(op => now - op.timestamp < maxAge);
    this.saveQueue();
  }
}

export const offlineStorage = new OfflineStorage();
