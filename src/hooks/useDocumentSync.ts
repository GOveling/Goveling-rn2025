/**
 * Custom Hook: useDocumentSync
 * Facilita el uso del servicio de sync en componentes
 */

import { useState, useEffect, useCallback } from 'react';

import {
  cacheDocument,
  getCachedDocument,
  removeCachedDocument,
  listCachedDocuments,
  getCacheSize,
  getCacheStats,
  clearAllCache,
  checkConnectivity,
  setupConnectivityListener,
  autoSyncOnReconnect,
  processSyncQueue,
  getSyncQueueStatus,
  clearCompletedQueueItems,
  getCacheMetadata,
  getPerformanceStats,
  initializeCacheService,
  type SyncQueueStatus,
} from '~/services/documentSync';

interface UseDocumentSyncReturn {
  // Estado
  cachedDocuments: Set<string>;
  cacheSize: number;
  cacheSizeMB: number;
  isLoading: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  queueStatus: SyncQueueStatus;
  lastSyncAt: Date | null;

  // Acciones
  downloadForOffline: (
    documentId: string,
    encryptedData: string,
    iv: string,
    authTag: string,
    metadata: { documentType: string; expiryDate: string },
    imageStoragePath?: string
  ) => Promise<boolean>;
  removeFromCache: (documentId: string) => Promise<boolean>;
  isDocumentAvailableOffline: (documentId: string) => boolean;
  refreshCacheStatus: () => Promise<void>;
  refreshConnectivity: () => Promise<void>;
  clearCache: () => Promise<boolean>;
  getCachedDocumentData: (documentId: string) => Promise<{
    documentId: string;
    encryptedData: string;
    iv: string;
    authTag: string;
    metadata: {
      documentType: string;
      expiryDate: string;
      cachedAt: string;
      lastAccessedAt: string;
      sizeBytes: number;
    };
  } | null>;
  getPerformanceStats: () => {
    totalOperations: number;
    averageDuration: number;
    averageCompressionRatio: number;
  };

  // Estadísticas
  stats: {
    totalDocuments: number;
    totalSizeMB: number;
    oldestCachedDate: Date | null;
    newestCachedDate: Date | null;
  };
}

export function useDocumentSync(): UseDocumentSyncReturn {
  const [cachedDocuments, setCachedDocuments] = useState<Set<string>>(new Set());
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [queueStatus, setQueueStatus] = useState<SyncQueueStatus>({
    totalItems: 0,
    pendingItems: 0,
    processingItems: 0,
    failedItems: 0,
    completedItems: 0,
    oldestPendingDate: null,
  });
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [stats, setStats] = useState<{
    totalDocuments: number;
    totalSizeMB: number;
    oldestCachedDate: Date | null;
    newestCachedDate: Date | null;
  }>({
    totalDocuments: 0,
    totalSizeMB: 0,
    oldestCachedDate: null,
    newestCachedDate: null,
  });

  // Refrescar estado de la cola
  const refreshQueueStatus = useCallback(async () => {
    try {
      const status = await getSyncQueueStatus();
      setQueueStatus(status);
    } catch (error) {
      console.error('❌ Error refreshing queue status:', error);
    }
  }, []);

  // Cargar estado inicial del cache
  const refreshCacheStatus = useCallback(async () => {
    try {
      setIsLoading(true);

      const [documentIds, size, cacheStats, metadata] = await Promise.all([
        listCachedDocuments(),
        getCacheSize(),
        getCacheStats(),
        getCacheMetadata(),
      ]);

      setCachedDocuments(new Set(documentIds));
      setCacheSize(size);
      setStats({
        totalDocuments: cacheStats.totalDocuments,
        totalSizeMB: cacheStats.totalSizeMB,
        oldestCachedDate: cacheStats.oldestCachedDate,
        newestCachedDate: cacheStats.newestCachedDate,
      });

      // Actualizar lastSyncAt si existe
      if (metadata.lastSyncAt) {
        setLastSyncAt(new Date(metadata.lastSyncAt));
      }

      // También refrescar estado de la cola
      await refreshQueueStatus();
    } catch (error) {
      console.error('❌ Error refreshing cache status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refreshQueueStatus]);

  // Cargar estado inicial + inicializar cache service
  useEffect(() => {
    const initialize = async () => {
      // Inicializar servicio de cache (auto-cleanup)
      await initializeCacheService();

      // Cargar estado inicial
      await refreshCacheStatus();
    };

    initialize();
  }, [refreshCacheStatus]);

  // Verificar conectividad inicial
  useEffect(() => {
    checkConnectivity().then((state) => {
      setIsConnected(state.isConnected && state.isInternetReachable);
    });
  }, []);

  // Setup connectivity listener
  useEffect(() => {
    const cleanup = setupConnectivityListener(
      async () => {
        // On connect
        console.log('✅ Network connected - updating sync state');
        setIsConnected(true);
        setIsSyncing(true);

        // Intentar auto-sync con retry automático
        try {
          // 1. Auto-sync metadata
          const result = await autoSyncOnReconnect();
          if (result.success) {
            console.log('✅ Auto-sync completed:', result.message);
          } else {
            console.warn('⚠️ Auto-sync skipped:', result.message);
          }

          // 2. Procesar cola de sincronización
          console.log('🔄 Processing sync queue...');
          const queueResult = await processSyncQueue();
          console.log(
            `✅ Queue processed: ${queueResult.processed} succeeded, ${queueResult.failed} failed`
          );

          // 3. Limpiar items completados
          if (queueResult.processed > 0) {
            await clearCompletedQueueItems();
          }

          // 4. Refrescar estado del cache y queue
          await refreshCacheStatus();
        } catch (error) {
          // Silenciar errores de red temporales - no afecta funcionalidad offline
          console.warn('⚠️ Auto-sync error (non-critical):', error);
        } finally {
          setIsSyncing(false);
        }
      },
      () => {
        // On disconnect
        console.log('📵 Network disconnected');
        setIsConnected(false);
      }
    );

    // Cleanup on unmount
    return cleanup;
  }, [refreshCacheStatus]);

  // Descargar documento para offline (con imagen comprimida)
  const downloadForOffline = useCallback(
    async (
      documentId: string,
      encryptedData: string,
      iv: string,
      authTag: string,
      metadata: { documentType: string; expiryDate: string },
      imageStoragePath?: string
    ): Promise<boolean> => {
      try {
        console.log('[OFFLINE-SYNC] Downloading document for offline:', documentId);

        const success = await cacheDocument(
          documentId,
          encryptedData,
          iv,
          authTag,
          metadata,
          imageStoragePath
        );

        if (success) {
          // Actualizar estado local
          setCachedDocuments((prev) => new Set(prev).add(documentId));
          await refreshCacheStatus();
        }

        return success;
      } catch (error) {
        console.error('❌ Error downloading for offline:', error);
        return false;
      }
    },
    [refreshCacheStatus]
  );

  // Eliminar del cache
  const removeFromCache = useCallback(
    async (documentId: string): Promise<boolean> => {
      try {
        console.log('[CACHE-REMOVE] Removing from cache:', documentId);

        const success = await removeCachedDocument(documentId);

        if (success) {
          // Actualizar estado local
          setCachedDocuments((prev) => {
            const newSet = new Set(prev);
            newSet.delete(documentId);
            return newSet;
          });
          await refreshCacheStatus();
        }

        return success;
      } catch (error) {
        console.error('❌ Error removing from cache:', error);
        return false;
      }
    },
    [refreshCacheStatus]
  );

  // Verificar si documento está disponible offline
  const isDocumentAvailableOffline = useCallback(
    (documentId: string): boolean => {
      return cachedDocuments.has(documentId);
    },
    [cachedDocuments]
  );

  // Obtener datos del documento en cache
  const getCachedDocumentData = useCallback(async (documentId: string) => {
    try {
      const doc = await getCachedDocument(documentId);
      return doc;
    } catch (error) {
      console.error('❌ Error getting cached document:', error);
      return null;
    }
  }, []);

  // Limpiar todo el cache
  const clearCache = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🧹 Clearing all cache');

      const success = await clearAllCache();

      if (success) {
        setCachedDocuments(new Set());
        setCacheSize(0);
        setStats({
          totalDocuments: 0,
          totalSizeMB: 0,
          oldestCachedDate: null,
          newestCachedDate: null,
        });
      }

      return success;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return false;
    }
  }, []);

  // Verificar estado de conectividad (útil para forzar actualización)
  const refreshConnectivity = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 Refreshing connectivity status...');
      console.log('🔍 [DEBUG] About to call checkConnectivity()...');

      // Force a fresh fetch from NetInfo
      const state = await checkConnectivity();

      console.log('🔍 [DEBUG] Raw NetInfo state:', JSON.stringify(state, null, 2));

      const connected = state.isConnected && state.isInternetReachable;

      console.log('📡 Connectivity status refreshed:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        finalConnected: connected,
      });

      // iOS Simulator workaround: if type is 'none' but we might have connectivity
      // Check if this is a simulator issue
      if (state.type === 'none' && !connected) {
        console.warn('⚠️ NetInfo reports "none" - might be iOS Simulator issue');
        console.warn('⚠️ Try testing on a real device or check simulator network settings');
      }

      // Update state immediately
      setIsConnected(connected);

      console.log('✅ Connectivity state updated to:', connected);
    } catch (error) {
      console.error('❌ Error refreshing connectivity:', error);
      setIsConnected(false);
    }
  }, []);

  return {
    // Estado
    cachedDocuments,
    cacheSize,
    cacheSizeMB: cacheSize / (1024 * 1024),
    isLoading,
    isConnected,
    isSyncing,
    queueStatus,
    lastSyncAt,

    // Acciones
    downloadForOffline,
    removeFromCache,
    isDocumentAvailableOffline,
    refreshCacheStatus,
    refreshConnectivity,
    clearCache,
    getCachedDocumentData,
    getPerformanceStats,

    // Estadísticas
    stats,
  };
}
