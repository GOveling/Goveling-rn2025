/**
 * Document Sync Service
 * Gestiona el cache offline de documentos encriptados
 */

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '~/lib/supabase';

// Storage Keys
const STORAGE_KEYS = {
  CACHE: 'travel_documents_cache_v1',
  METADATA: 'travel_documents_cache_meta_v1',
  QUEUE: 'travel_documents_sync_queue_v1',
  SETTINGS: 'travel_documents_sync_settings_v1',
} as const;

// Límites de cache
const SYNC_LIMITS = {
  MAX_CACHE_SIZE_MB: 100,
  MAX_CACHED_DOCUMENTS: 20, // Límite de documentos (LRU)
  MAX_QUEUE_SIZE: 50,
  RETRY_ATTEMPTS: 3,
  SYNC_INTERVAL_MS: 300000, // 5 minutos
  OLD_CACHE_DAYS: 30,
  CLEANUP_ON_STARTUP: true,
} as const;

// Performance monitoring
interface PerformanceMetrics {
  operation: string;
  durationMs: number;
  sizeBefore?: number;
  sizeAfter?: number;
  compressionRatio?: number;
}

const performanceMetrics: PerformanceMetrics[] = [];

// Tipos
interface CachedDocument {
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
}

interface CacheMetadata {
  totalDocuments: number;
  totalSizeBytes: number;
  lastSyncAt?: string;
  documents: Record<string, { cachedAt: string; sizeBytes: number; lastAccessedAt: string }>;
}

// Sync Queue Types
export enum SyncOperationType {
  UPLOAD_DOCUMENT = 'UPLOAD_DOCUMENT',
  DELETE_DOCUMENT = 'DELETE_DOCUMENT',
  UPDATE_DOCUMENT = 'UPDATE_DOCUMENT',
}

export enum SyncQueueItemStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface SyncQueueItem {
  id: string;
  operationType: SyncOperationType;
  payload: {
    documentId?: string;
    encryptedData?: string;
    iv?: string;
    authTag?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
  status: SyncQueueItemStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastAttemptAt?: string;
  completedAt?: string;
  error?: string;
}

export interface SyncQueueStatus {
  totalItems: number;
  pendingItems: number;
  processingItems: number;
  failedItems: number;
  completedItems: number;
  oldestPendingDate: Date | null;
}

// ====== OPTIMIZATION HELPERS ======

/**
 * Comprimir datos usando encoding optimizado
 */
function compressData(data: string): string {
  try {
    // Simple optimization: remove whitespace from base64
    return data.replace(/\s/g, '');
  } catch (error) {
    console.warn('⚠️ Compression failed, using original data:', error);
    return data;
  }
}

/**
 * Descomprimir datos
 */
function decompressData(data: string): string {
  // En este caso, no hay compresión real, solo retornamos el dato
  return data;
}

/**
 * Track performance metrics
 */
function trackPerformance(metric: PerformanceMetrics): void {
  performanceMetrics.push(metric);

  // Mantener solo los últimos 50 metrics
  if (performanceMetrics.length > 50) {
    performanceMetrics.shift();
  }

  // Log si hay compression ratio significativo
  if (metric.compressionRatio && metric.compressionRatio > 1.1) {
    console.log(
      `📊 ${metric.operation}: ${metric.durationMs}ms, compression: ${metric.compressionRatio.toFixed(2)}x`
    );
  }
}

/**
 * Get performance stats
 */
export function getPerformanceStats(): {
  totalOperations: number;
  averageDuration: number;
  averageCompressionRatio: number;
} {
  if (performanceMetrics.length === 0) {
    return { totalOperations: 0, averageDuration: 0, averageCompressionRatio: 1 };
  }

  const totalDuration = performanceMetrics.reduce((sum, m) => sum + m.durationMs, 0);
  const compressionMetrics = performanceMetrics.filter((m) => m.compressionRatio);
  const totalCompression = compressionMetrics.reduce(
    (sum, m) => sum + (m.compressionRatio || 1),
    0
  );

  return {
    totalOperations: performanceMetrics.length,
    averageDuration: totalDuration / performanceMetrics.length,
    averageCompressionRatio:
      compressionMetrics.length > 0 ? totalCompression / compressionMetrics.length : 1,
  };
}

/**
 * Helper: Comprimir y guardar imagen localmente
 * Optimiza la imagen manteniendo calidad visual al hacer zoom
 */
async function downloadAndCompressImage(
  imageUrl: string,
  documentId: string
): Promise<{ success: boolean; localPath?: string; sizeMB?: number; error?: string }> {
  const startTime = Date.now();

  try {
    console.log('[IMAGE-CACHE] Downloading image for offline:', imageUrl);

    // 1. Crear directorio si no existe
    const cacheDir = `${FileSystem.documentDirectory}goveling_docs/`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      console.log('[IMAGE-CACHE] Created cache directory:', cacheDir);
    }

    // 2. Descargar imagen temporal
    const tempPath = `${FileSystem.cacheDirectory}temp_${documentId}.jpg`;
    const downloadResult = await FileSystem.downloadAsync(imageUrl, tempPath);

    if (downloadResult.status !== 200) {
      console.error('[IMAGE-CACHE] Failed to download image:', downloadResult.status);
      return { success: false, error: `HTTP ${downloadResult.status}` };
    }

    const fileInfo = await FileSystem.getInfoAsync(tempPath);
    const originalSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
    console.log(`[IMAGE-CACHE] Downloaded: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

    // 3. Comprimir imagen con calidad óptima
    // JPEG quality 85 = sweet spot entre tamaño y calidad
    // Redimensionar si es muy grande (max 2048px mantiene calidad en zoom)
    const compressed = await manipulateAsync(
      tempPath,
      [
        {
          resize: {
            width: 2048, // Máximo ancho - mantiene aspect ratio
          },
        },
      ],
      {
        compress: 0.85, // 85% quality - óptimo para fotos
        format: SaveFormat.JPEG,
      }
    );

    // 4. Mover a ubicación permanente
    const finalPath = `${cacheDir}${documentId}_image.jpg`;
    await FileSystem.moveAsync({
      from: compressed.uri,
      to: finalPath,
    });

    // 5. Limpiar archivo temporal
    try {
      await FileSystem.deleteAsync(tempPath, { idempotent: true });
    } catch (cleanupError) {
      console.warn('[IMAGE-CACHE] Could not delete temp file:', cleanupError);
    }

    const finalFileInfo = await FileSystem.getInfoAsync(finalPath);
    const finalSize = finalFileInfo.exists && 'size' in finalFileInfo ? finalFileInfo.size : 0;
    const compressionRatio = originalSize / finalSize;
    const duration = Date.now() - startTime;

    console.log(
      `[IMAGE-CACHE] SUCCESS: Image compressed ${(originalSize / 1024 / 1024).toFixed(2)}MB -> ${(finalSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(2)}x) in ${duration}ms`
    );

    return {
      success: true,
      localPath: finalPath,
      sizeMB: finalSize / 1024 / 1024,
    };
  } catch (error) {
    console.error('[IMAGE-CACHE] Error compressing image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper: Obtener URL firmada de imagen desde Supabase Storage
 */
async function getImageSignedUrl(storagePath: string): Promise<string | null> {
  try {
    // El storagePath viene como "user_id/document_id/filename.jpg"
    const { data, error } = await supabase.storage
      .from('travel-documents')
      .createSignedUrl(storagePath, 60 * 60); // 1 hora de validez

    if (error) {
      console.error('[IMAGE-CACHE] Error getting signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('[IMAGE-CACHE] Error in getImageSignedUrl:', error);
    return null;
  }
}

/**
 * 1.1 Descargar y cachear documento encriptado (con optimizaciones)
 * Ahora incluye descarga y compresión optimizada de imágenes
 */
export async function cacheDocument(
  documentId: string,
  encryptedData: string,
  iv: string,
  authTag: string,
  metadata: {
    documentType: string;
    expiryDate: string;
  },
  imageStoragePath?: string // Opcional: path de la imagen en Supabase Storage
): Promise<boolean> {
  const startTime = Date.now();

  try {
    console.log('💾 Caching document:', documentId);

    // Calcular tamaño original
    const originalSize = new Blob([encryptedData, iv, authTag]).size;

    // Comprimir datos
    const compressedData = compressData(encryptedData);
    const compressedSize = new Blob([compressedData, iv, authTag]).size;
    const compressionRatio = originalSize / compressedSize;

    // Track compression
    if (compressionRatio > 1.05) {
      console.log(
        `🗜️ Compressed document: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${compressionRatio.toFixed(2)}x)`
      );
    }

    // Verificar límite de cache
    const currentSize = await getCacheSize();
    const maxSizeBytes = SYNC_LIMITS.MAX_CACHE_SIZE_MB * 1024 * 1024;

    if (currentSize + compressedSize > maxSizeBytes) {
      console.warn('⚠️ Cache limit exceeded, cleaning old cache...');
      await cleanupOldCache(7); // Limpiar cache >7 días

      // Re-verificar
      const newSize = await getCacheSize();
      if (newSize + compressedSize > maxSizeBytes) {
        console.error('❌ Cache still full after cleanup');
        return false;
      }
    }

    // Verificar límite de documentos (LRU)
    const cacheStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHE);
    const cache: Record<string, CachedDocument> = cacheStr ? JSON.parse(cacheStr) : {};
    const cachedIds = Object.keys(cache);

    if (cachedIds.length >= SYNC_LIMITS.MAX_CACHED_DOCUMENTS && !cache[documentId]) {
      console.warn(
        `⚠️ Max documents reached (${SYNC_LIMITS.MAX_CACHED_DOCUMENTS}), removing LRU...`
      );

      // Encontrar documento menos usado recientemente
      const lruDoc = cachedIds.reduce((oldest, id) => {
        const oldestDate = new Date(cache[oldest].metadata.lastAccessedAt);
        const currentDate = new Date(cache[id].metadata.lastAccessedAt);
        return currentDate < oldestDate ? id : oldest;
      }, cachedIds[0]);

      console.log(`🗑️ Removing LRU document: ${lruDoc}`);
      delete cache[lruDoc];
    }

    // Agregar/actualizar documento con datos comprimidos
    const now = new Date().toISOString();
    cache[documentId] = {
      documentId,
      encryptedData: compressedData,
      iv,
      authTag,
      metadata: {
        ...metadata,
        cachedAt: cache[documentId]?.metadata.cachedAt || now,
        lastAccessedAt: now,
        sizeBytes: compressedSize,
      },
    };

    // Guardar cache
    await AsyncStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));

    // Actualizar metadata
    await updateCacheMetadata();

    // Si hay imagen, descargarla y comprimirla
    let imageCompressed = false;
    let imageSizeMB = 0;

    if (imageStoragePath) {
      console.log('[CACHE] Downloading and compressing image...');

      // Obtener URL firmada
      const signedUrl = await getImageSignedUrl(imageStoragePath);

      if (signedUrl) {
        const imageResult = await downloadAndCompressImage(signedUrl, documentId);

        if (imageResult.success) {
          imageCompressed = true;
          imageSizeMB = imageResult.sizeMB || 0;
          console.log(`[CACHE] Image cached: ${imageSizeMB.toFixed(2)}MB`);
        } else {
          console.warn(`[CACHE] Could not cache image: ${imageResult.error}`);
        }
      } else {
        console.warn('[CACHE] Could not get signed URL for image');
      }
    }

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance({
      operation: 'cacheDocument',
      durationMs: duration,
      sizeBefore: originalSize,
      sizeAfter: compressedSize,
      compressionRatio,
    });

    console.log(
      `[CACHE] SUCCESS: Document cached ${documentId} (${duration}ms)${imageCompressed ? ` + image (${imageSizeMB.toFixed(2)}MB)` : ''}`
    );
    return true;
  } catch (error) {
    console.error('[CACHE] Error caching document:', error);
    return false;
  }
}

/**
 * 1.2 Obtener documento desde cache
 */
export async function getCachedDocument(documentId: string): Promise<CachedDocument | null> {
  const startTime = Date.now();
  try {
    console.log('📂 Getting cached document:', documentId);

    const cacheStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHE);
    if (!cacheStr) {
      console.log('⚠️ Cache is empty');
      return null;
    }

    const cache: Record<string, CachedDocument> = JSON.parse(cacheStr);
    const document = cache[documentId];

    if (!document) {
      console.log('⚠️ Document not found in cache:', documentId);
      return null;
    }

    // Descomprimir datos
    const decompressedData = decompressData(document.encryptedData);

    // Actualizar lastAccessedAt
    document.metadata.lastAccessedAt = new Date().toISOString();
    cache[documentId] = document;
    await AsyncStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance({
      operation: 'getCachedDocument',
      durationMs: duration,
      sizeBefore: 0,
      sizeAfter: document.metadata.sizeBytes,
      compressionRatio: 1,
    });

    console.log(`✅ Document retrieved from cache: ${documentId} (${duration}ms)`);

    // Retornar con datos descomprimidos
    return {
      ...document,
      encryptedData: decompressedData,
    };
  } catch (error) {
    console.error('❌ Error getting cached document:', error);
    return null;
  }
}

/**
 * 1.3 Eliminar documento del cache
 */
export async function removeCachedDocument(documentId: string): Promise<boolean> {
  try {
    console.log('🗑️ Removing cached document:', documentId);

    const cacheStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHE);
    if (!cacheStr) {
      console.log('⚠️ Cache is empty');
      return true;
    }

    const cache: Record<string, CachedDocument> = JSON.parse(cacheStr);

    if (!cache[documentId]) {
      console.log('⚠️ Document not found in cache:', documentId);
      return true;
    }

    delete cache[documentId];
    await AsyncStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));

    // Eliminar imagen asociada si existe
    try {
      const imagePath = `${FileSystem.documentDirectory}goveling_docs/${documentId}_image.jpg`;
      const imageInfo = await FileSystem.getInfoAsync(imagePath);

      if (imageInfo.exists) {
        await FileSystem.deleteAsync(imagePath);
        console.log('[CACHE] Image file deleted:', imagePath);
      }
    } catch (imageError) {
      console.warn('[CACHE] Could not delete image file:', imageError);
    }

    // Actualizar metadata
    await updateCacheMetadata();

    console.log('[CACHE] Document removed from cache:', documentId);
    return true;
  } catch (error) {
    console.error('[CACHE] Error removing cached document:', error);
    return false;
  }
}

/**
 * 1.4 Listar todos los documentos en cache
 */
export async function listCachedDocuments(): Promise<string[]> {
  try {
    console.log('📋 Listing cached documents');

    const cacheStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHE);
    if (!cacheStr) {
      console.log('⚠️ Cache is empty');
      return [];
    }

    const cache: Record<string, CachedDocument> = JSON.parse(cacheStr);
    const documentIds = Object.keys(cache);

    console.log(`✅ Found ${documentIds.length} cached documents`);
    return documentIds;
  } catch (error) {
    console.error('❌ Error listing cached documents:', error);
    return [];
  }
}

/**
 * 1.4.1 Sincronizar cache con documentos online
 * Elimina del cache local los documentos que ya no existen en la DB online
 * Se ejecuta cuando el usuario presiona "Descargar" estando online
 */
export async function syncCacheWithOnlineDocuments(onlineDocumentIds: string[]): Promise<{
  removed: string[];
  kept: string[];
}> {
  try {
    console.log('🔄 [SYNC] Starting cache sync with online documents...');
    console.log('🔄 [SYNC] Online document IDs:', onlineDocumentIds);

    const cachedIds = await listCachedDocuments();
    console.log('🔄 [SYNC] Cached document IDs:', cachedIds);

    const removed: string[] = [];
    const kept: string[] = [];

    // Identificar documentos huérfanos (en cache pero no online)
    for (const cachedId of cachedIds) {
      if (!onlineDocumentIds.includes(cachedId)) {
        // Documento ya no existe online, eliminar del cache
        console.log(`🗑️ [SYNC] Removing orphaned document from cache: ${cachedId}`);
        const success = await removeCachedDocument(cachedId);
        if (success) {
          removed.push(cachedId);
          console.log(`✅ [SYNC] Removed: ${cachedId}`);
        } else {
          console.error(`❌ [SYNC] Failed to remove: ${cachedId}`);
        }
      } else {
        kept.push(cachedId);
      }
    }

    console.log(`✅ [SYNC] Sync complete: ${removed.length} removed, ${kept.length} kept`);
    return { removed, kept };
  } catch (error) {
    console.error('❌ [SYNC] Error syncing cache:', error);
    return { removed: [], kept: [] };
  }
}

/**
 * 1.5 Obtener tamaño del cache
 */
export async function getCacheSize(): Promise<number> {
  try {
    const metadataStr = await AsyncStorage.getItem(STORAGE_KEYS.METADATA);
    if (!metadataStr) {
      return 0;
    }

    const metadata: CacheMetadata = JSON.parse(metadataStr);
    return metadata.totalSizeBytes || 0;
  } catch (error) {
    console.error('❌ Error getting cache size:', error);
    return 0;
  }
}

/**
 * 1.6 Limpiar todo el cache
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    console.log('🧹 Clearing all cache');

    await AsyncStorage.removeItem(STORAGE_KEYS.CACHE);
    await AsyncStorage.removeItem(STORAGE_KEYS.METADATA);

    console.log('✅ All cache cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return false;
  }
}

/**
 * 1.7 Verificar si documento está en cache
 */
export async function isDocumentCached(documentId: string): Promise<boolean> {
  try {
    const cacheStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHE);
    if (!cacheStr) {
      return false;
    }

    const cache: Record<string, CachedDocument> = JSON.parse(cacheStr);
    return !!cache[documentId];
  } catch (error) {
    console.error('❌ Error checking document cache:', error);
    return false;
  }
}

/**
 * Helper: Actualizar metadata del cache
 */
async function updateCacheMetadata(): Promise<void> {
  try {
    const cacheStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHE);
    if (!cacheStr) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.METADATA,
        JSON.stringify({
          totalDocuments: 0,
          totalSizeBytes: 0,
          documents: {},
        })
      );
      return;
    }

    const cache: Record<string, CachedDocument> = JSON.parse(cacheStr);
    const documentIds = Object.keys(cache);

    let totalSize = 0;
    const documents: Record<
      string,
      { cachedAt: string; lastAccessedAt: string; sizeBytes: number }
    > = {};

    for (const docId of documentIds) {
      const doc = cache[docId];
      totalSize += doc.metadata.sizeBytes;
      documents[docId] = {
        cachedAt: doc.metadata.cachedAt,
        lastAccessedAt: doc.metadata.lastAccessedAt,
        sizeBytes: doc.metadata.sizeBytes,
      };
    }

    const metadata: CacheMetadata = {
      totalDocuments: documentIds.length,
      totalSizeBytes: totalSize,
      lastSyncAt: new Date().toISOString(),
      documents,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
    console.log('📊 Cache metadata updated:', {
      totalDocuments: metadata.totalDocuments,
      totalSizeBytes: metadata.totalSizeBytes,
      totalSizeMB: (metadata.totalSizeBytes / (1024 * 1024)).toFixed(2),
    });
  } catch (error) {
    console.error('❌ Error updating cache metadata:', error);
  }
}

/**
 * Helper: Limpiar cache antiguo
 */
export async function cleanupOldCache(daysThreshold: number = 30): Promise<void> {
  try {
    console.log(`🧹 Cleaning cache older than ${daysThreshold} days`);

    const cacheStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHE);
    if (!cacheStr) {
      return;
    }

    const cache: Record<string, CachedDocument> = JSON.parse(cacheStr);
    const now = new Date();
    const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;

    let removedCount = 0;

    for (const docId of Object.keys(cache)) {
      const doc = cache[docId];
      const lastAccessed = new Date(doc.metadata.lastAccessedAt);
      const ageMs = now.getTime() - lastAccessed.getTime();

      if (ageMs > thresholdMs) {
        console.log(
          `  🗑️ Removing old document: ${docId} (${Math.floor(ageMs / (24 * 60 * 60 * 1000))} days old)`
        );
        delete cache[docId];
        removedCount++;
      }
    }

    if (removedCount > 0) {
      await AsyncStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
      await updateCacheMetadata();
      console.log(`✅ Removed ${removedCount} old documents from cache`);
    } else {
      console.log('✅ No old documents to remove');
    }
  } catch (error) {
    console.error('❌ Error cleaning old cache:', error);
  }
}

/**
 * Initialize cache service (run on app startup)
 * - Auto cleanup old documents
 * - Verify cache integrity
 */
export async function initializeCacheService(): Promise<void> {
  try {
    console.log('🚀 Initializing cache service...');

    // Auto-cleanup documentos antiguos (>30 días)
    if (SYNC_LIMITS.CLEANUP_ON_STARTUP) {
      await cleanupOldCache(SYNC_LIMITS.OLD_CACHE_DAYS);
    }

    // Verificar integridad del cache
    const stats = await getCacheStats();
    console.log(
      `✅ Cache initialized: ${stats.totalDocuments} documents, ${stats.totalSizeMB.toFixed(2)}MB`
    );
  } catch (error) {
    console.error('❌ Error initializing cache service:', error);
  }
}

/**
 * Obtener estadísticas del cache
 */
export async function getCacheStats(): Promise<{
  totalDocuments: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  oldestCachedDate: Date | null;
  newestCachedDate: Date | null;
  documents: Array<{
    documentId: string;
    cachedAt: Date;
    lastAccessedAt: Date;
    sizeBytes: number;
    sizeMB: number;
  }>;
}> {
  try {
    const cacheStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHE);
    if (!cacheStr) {
      return {
        totalDocuments: 0,
        totalSizeBytes: 0,
        totalSizeMB: 0,
        oldestCachedDate: null,
        newestCachedDate: null,
        documents: [],
      };
    }

    const cache: Record<string, CachedDocument> = JSON.parse(cacheStr);
    const documentIds = Object.keys(cache);

    let totalSize = 0;
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;
    const documents: Array<{
      documentId: string;
      cachedAt: Date;
      lastAccessedAt: Date;
      sizeBytes: number;
      sizeMB: number;
    }> = [];

    for (const docId of documentIds) {
      const doc = cache[docId];
      const cachedAt = new Date(doc.metadata.cachedAt);
      const lastAccessedAt = new Date(doc.metadata.lastAccessedAt);

      totalSize += doc.metadata.sizeBytes;

      if (!oldestDate || cachedAt < oldestDate) {
        oldestDate = cachedAt;
      }
      if (!newestDate || cachedAt > newestDate) {
        newestDate = cachedAt;
      }

      documents.push({
        documentId: docId,
        cachedAt,
        lastAccessedAt,
        sizeBytes: doc.metadata.sizeBytes,
        sizeMB: doc.metadata.sizeBytes / (1024 * 1024),
      });
    }

    return {
      totalDocuments: documentIds.length,
      totalSizeBytes: totalSize,
      totalSizeMB: totalSize / (1024 * 1024),
      oldestCachedDate: oldestDate,
      newestCachedDate: newestDate,
      documents,
    };
  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    return {
      totalDocuments: 0,
      totalSizeBytes: 0,
      totalSizeMB: 0,
      oldestCachedDate: null,
      newestCachedDate: null,
      documents: [],
    };
  }
}

// ====== CONNECTIVITY & AUTO-SYNC ======

/**
 * Verificar estado de conectividad actual
 */
export async function checkConnectivity(): Promise<{
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}> {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type,
    };
  } catch (error) {
    console.error('❌ Error checking connectivity:', error);
    return {
      isConnected: false,
      isInternetReachable: false,
      type: 'unknown',
    };
  }
}

/**
 * Configurar listener para cambios de conectividad
 * Con debounce para evitar múltiples triggers
 * Retorna función de cleanup
 */
export function setupConnectivityListener(
  onConnect: () => void,
  onDisconnect: () => void
): () => void {
  console.log('📡 Setting up connectivity listener');

  let debounceTimer: NodeJS.Timeout | null = null;
  let lastConnectionState = true;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const isConnected = state.isConnected && state.isInternetReachable;

    // Clear any pending debounce
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce: esperar 500ms antes de procesar el cambio
    debounceTimer = setTimeout(() => {
      // Solo triggear si el estado cambió
      if (isConnected !== lastConnectionState) {
        lastConnectionState = isConnected;

        if (isConnected) {
          console.log('✅ Network connected:', state.type);
          onConnect();
        } else {
          console.log('📵 Network disconnected');
          onDisconnect();
        }
      }
    }, 500);
  });

  // Retornar función de cleanup
  return () => {
    console.log('🔌 Cleaning up connectivity listener');
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    unsubscribe();
  };
}

/**
 * Intentar auto-sync al reconectar con retry logic
 * (Por ahora solo actualiza metadata, más adelante puede subir cambios pendientes)
 */
export async function autoSyncOnReconnect(): Promise<{
  success: boolean;
  message: string;
}> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 segundo

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Auto-sync triggered on reconnect (attempt ${attempt}/${maxRetries})`);

      // Verificar conectividad
      const connectivity = await checkConnectivity();
      if (!connectivity.isConnected || !connectivity.isInternetReachable) {
        console.warn('⚠️ No network connection available, skipping sync');
        return {
          success: false,
          message: 'No network connection available',
        };
      }

      // Esperar un poco antes del primer intento para que la red se estabilice
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Actualizar metadata del cache
      await updateCacheMetadata();

      // Guardar timestamp del último sync
      await AsyncStorage.setItem(
        STORAGE_KEYS.METADATA,
        JSON.stringify({
          ...(await getCacheMetadata()),
          lastSyncAt: new Date().toISOString(),
        })
      );

      console.log('✅ Auto-sync completed successfully');
      return {
        success: true,
        message: 'Cache synchronized successfully',
      };
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (isLastAttempt) {
        console.error('❌ Auto-sync failed after all retries:', errorMessage);
        return {
          success: false,
          message: errorMessage,
        };
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(
        `⚠️ Auto-sync attempt ${attempt} failed: ${errorMessage}. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    success: false,
    message: 'Max retries exceeded',
  };
}

/**
 * Helper: Obtener metadata del cache (incluye lastSyncAt)
 */
export async function getCacheMetadata(): Promise<CacheMetadata> {
  try {
    const metadataStr = await AsyncStorage.getItem(STORAGE_KEYS.METADATA);
    if (!metadataStr) {
      return {
        totalDocuments: 0,
        totalSizeBytes: 0,
        documents: {},
      };
    }
    return JSON.parse(metadataStr);
  } catch (error) {
    console.error('❌ Error getting cache metadata:', error);
    return {
      totalDocuments: 0,
      totalSizeBytes: 0,
      documents: {},
    };
  }
}

// ====== SYNC QUEUE MANAGEMENT ======

/**
 * Agregar operación a la cola de sincronización
 */
export async function addToSyncQueue(
  operationType: SyncOperationType,
  payload: SyncQueueItem['payload']
): Promise<string> {
  try {
    const queueItem: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      operationType,
      payload,
      status: SyncQueueItemStatus.PENDING,
      retryCount: 0,
      maxRetries: SYNC_LIMITS.RETRY_ATTEMPTS,
      createdAt: new Date().toISOString(),
    };

    console.log('📝 Adding to sync queue:', queueItem.id, operationType);

    // Obtener cola actual
    const queueStr = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE);
    const queue: SyncQueueItem[] = queueStr ? JSON.parse(queueStr) : [];

    // Verificar límite de cola
    if (queue.length >= SYNC_LIMITS.MAX_QUEUE_SIZE) {
      console.warn('⚠️ Sync queue full, removing oldest completed items');
      const filtered = queue
        .filter((item) => item.status !== SyncQueueItemStatus.COMPLETED)
        .slice(-SYNC_LIMITS.MAX_QUEUE_SIZE + 1);
      queue.splice(0, queue.length, ...filtered);
    }

    // Agregar nuevo item
    queue.push(queueItem);

    // Guardar cola
    await AsyncStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));

    console.log(`✅ Added to sync queue. Total items: ${queue.length}`);
    return queueItem.id;
  } catch (error) {
    console.error('❌ Error adding to sync queue:', error);
    throw error;
  }
}

/**
 * Procesar cola de sincronización
 */
export async function processSyncQueue(): Promise<{
  processed: number;
  failed: number;
  skipped: number;
}> {
  try {
    console.log('🔄 Processing sync queue...');

    // Verificar conectividad
    const connectivity = await checkConnectivity();
    if (!connectivity.isConnected || !connectivity.isInternetReachable) {
      console.warn('⚠️ No network connection, skipping queue processing');
      return { processed: 0, failed: 0, skipped: 0 };
    }

    // Obtener cola
    const queueStr = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE);
    if (!queueStr) {
      console.log('✅ Sync queue is empty');
      return { processed: 0, failed: 0, skipped: 0 };
    }

    const queue: SyncQueueItem[] = JSON.parse(queueStr);
    const pendingItems = queue.filter(
      (item) =>
        item.status === SyncQueueItemStatus.PENDING ||
        (item.status === SyncQueueItemStatus.FAILED && item.retryCount < item.maxRetries)
    );

    if (pendingItems.length === 0) {
      console.log('✅ No pending items in sync queue');
      return { processed: 0, failed: 0, skipped: 0 };
    }

    console.log(`📋 Found ${pendingItems.length} pending items to process`);

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    // Procesar cada item
    for (const item of pendingItems) {
      try {
        console.log(`⚙️ Processing queue item: ${item.id} (${item.operationType})`);

        // Marcar como procesando
        item.status = SyncQueueItemStatus.PROCESSING;
        item.lastAttemptAt = new Date().toISOString();
        item.retryCount++;

        // Aquí iría la lógica específica para cada tipo de operación
        // Por ahora, solo simulamos éxito
        // TODO: Implementar lógica real de upload/delete/update

        switch (item.operationType) {
          case SyncOperationType.UPLOAD_DOCUMENT:
            console.log('📤 Would upload document:', item.payload.documentId);
            // TODO: Llamar a función real de upload
            break;

          case SyncOperationType.DELETE_DOCUMENT:
            console.log('🗑️ Would delete document:', item.payload.documentId);
            // TODO: Llamar a función real de delete
            break;

          case SyncOperationType.UPDATE_DOCUMENT:
            console.log('✏️ Would update document:', item.payload.documentId);
            // TODO: Llamar a función real de update
            break;

          default:
            console.warn('⚠️ Unknown operation type:', item.operationType);
            skipped++;
            continue;
        }

        // Marcar como completado
        item.status = SyncQueueItemStatus.COMPLETED;
        item.completedAt = new Date().toISOString();
        processed++;

        console.log(`✅ Queue item processed: ${item.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing queue item ${item.id}:`, errorMessage);

        item.status = SyncQueueItemStatus.FAILED;
        item.error = errorMessage;
        failed++;

        // Si alcanzó max retries, marcar como fallido permanentemente
        if (item.retryCount >= item.maxRetries) {
          console.error(`❌ Queue item ${item.id} exceeded max retries`);
        }
      }
    }

    // Guardar cola actualizada
    await AsyncStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));

    console.log(
      `✅ Sync queue processing complete: ${processed} processed, ${failed} failed, ${skipped} skipped`
    );
    return { processed, failed, skipped };
  } catch (error) {
    console.error('❌ Error processing sync queue:', error);
    return { processed: 0, failed: 0, skipped: 0 };
  }
}

/**
 * Obtener estado de la cola
 */
export async function getSyncQueueStatus(): Promise<SyncQueueStatus> {
  try {
    const queueStr = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE);
    if (!queueStr) {
      return {
        totalItems: 0,
        pendingItems: 0,
        processingItems: 0,
        failedItems: 0,
        completedItems: 0,
        oldestPendingDate: null,
      };
    }

    const queue: SyncQueueItem[] = JSON.parse(queueStr);

    const pendingItems = queue.filter((item) => item.status === SyncQueueItemStatus.PENDING);
    const processingItems = queue.filter((item) => item.status === SyncQueueItemStatus.PROCESSING);
    const failedItems = queue.filter((item) => item.status === SyncQueueItemStatus.FAILED);
    const completedItems = queue.filter((item) => item.status === SyncQueueItemStatus.COMPLETED);

    // Encontrar item pendiente más antiguo
    const oldestPending = pendingItems.reduce<SyncQueueItem | null>((oldest, item) => {
      if (!oldest) return item;
      return new Date(item.createdAt) < new Date(oldest.createdAt) ? item : oldest;
    }, null);

    return {
      totalItems: queue.length,
      pendingItems: pendingItems.length,
      processingItems: processingItems.length,
      failedItems: failedItems.length,
      completedItems: completedItems.length,
      oldestPendingDate: oldestPending ? new Date(oldestPending.createdAt) : null,
    };
  } catch (error) {
    console.error('❌ Error getting sync queue status:', error);
    return {
      totalItems: 0,
      pendingItems: 0,
      processingItems: 0,
      failedItems: 0,
      completedItems: 0,
      oldestPendingDate: null,
    };
  }
}

/**
 * Limpiar items completados de la cola
 */
export async function clearCompletedQueueItems(): Promise<number> {
  try {
    const queueStr = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE);
    if (!queueStr) return 0;

    const queue: SyncQueueItem[] = JSON.parse(queueStr);
    const beforeCount = queue.length;

    // Mantener solo items no completados
    const filtered = queue.filter((item) => item.status !== SyncQueueItemStatus.COMPLETED);

    await AsyncStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(filtered));

    const removedCount = beforeCount - filtered.length;
    console.log(`🧹 Cleared ${removedCount} completed items from sync queue`);

    return removedCount;
  } catch (error) {
    console.error('❌ Error clearing completed queue items:', error);
    return 0;
  }
}

/**
 * Limpiar toda la cola (usar con cuidado)
 */
export async function clearAllSyncQueue(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.QUEUE);
    console.log('🧹 Cleared entire sync queue');
    return true;
  } catch (error) {
    console.error('❌ Error clearing sync queue:', error);
    return false;
  }
}
