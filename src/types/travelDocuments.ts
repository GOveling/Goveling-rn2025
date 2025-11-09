// src/types/travelDocuments.ts
// Types para el sistema de Travel Documents con encriptación E2EE

/**
 * Tipos de documentos de viaje soportados
 */
export enum DocumentType {
  PASSPORT = 'passport',
  VISA = 'visa',
  INSURANCE = 'insurance',
  TICKET = 'ticket',
  VACCINATION = 'vaccination',
  ID_CARD = 'id_card',
  DRIVER_LICENSE = 'driver_license',
  OTHER = 'other',
}

/**
 * Estados de sincronización entre modos online/offline
 */
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'offline_only';

/**
 * Estados de expiración de documentos
 */
export type ExpirationStatus = 'valid' | 'warning' | 'critical' | 'expired';

/**
 * Modos de almacenamiento
 */
export type StorageMode = 'online' | 'offline';

/**
 * Metadatos del documento (información sin encriptar)
 */
export interface DocumentMetadata {
  id: string;
  userId: string;
  documentType: DocumentType;
  hasAttachment: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;
  expiryDate?: Date; // Extraído para cálculo rápido sin desencriptar
  syncStatus: SyncStatus;
  storageMode: StorageMode;
}

/**
 * Datos encriptados del documento
 */
export interface EncryptedDocumentData {
  encryptedMetadata: string; // JSON encriptado con: documentNumber, issuingCountry, notes
  iv: string; // Vector de inicialización
  encryptedFilePath?: string; // Ruta al archivo encriptado en storage
}

/**
 * Datos desencriptados del documento (solo visibles después de autenticar)
 */
export interface DecryptedDocumentData {
  documentNumber: string;
  issuingCountry: string;
  issueDate?: Date;
  expiryDate?: Date;
  notes?: string;
}

/**
 * Estructura completa de un documento (metadata + datos encriptados)
 */
export interface TravelDocument extends DocumentMetadata {
  encrypted: EncryptedDocumentData;
}

/**
 * Documento desencriptado completo (para visualización)
 */
export interface DecryptedTravelDocument extends DocumentMetadata, DecryptedDocumentData {
  fileBase64?: string; // Archivo desencriptado en Base64
}

/**
 * Datos de encriptación (para envelope encryption)
 */
export interface EncryptionEnvelope {
  encryptedData: string; // Datos encriptados
  encryptedKeyPrimary: string; // Clave del documento encriptada con PIN
  encryptedKeyRecovery: string; // Clave del documento encriptada con clave de recuperación
  iv: string;
  documentId: string;
}

/**
 * Configuración de seguridad del usuario
 */
export interface SecurityConfig {
  hasPIN: boolean;
  hasBiometry: boolean;
  biometryType?: 'fingerprint' | 'face' | 'iris';
  pinLastUpdated?: Date;
  recoveryEmailConfigured: boolean;
}

/**
 * Código de recuperación
 */
export interface RecoveryCode {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

/**
 * Información de expiración calculada
 */
export interface ExpirationInfo {
  status: ExpirationStatus;
  daysUntilExpiry: number;
  message: string;
  color: string; // Color del badge
}

/**
 * Estadísticas de documentos
 */
export interface DocumentStats {
  total: number;
  byType: Record<DocumentType, number>;
  expired: number;
  expiringSoon: number; // < 30 días
  valid: number;
  lastUpdated: Date;
}

/**
 * Resultado de operación de encriptación
 */
export interface EncryptionResult {
  success: boolean;
  encryptedData?: string;
  iv?: string;
  error?: string;
}

/**
 * Resultado de operación de desencriptación
 */
export interface DecryptionResult {
  success: boolean;
  decryptedData?: string;
  error?: string;
}

/**
 * Request para añadir un nuevo documento
 */
export interface AddDocumentRequest {
  documentType: DocumentType;
  documentNumber: string;
  issuingCountry: string;
  issueDate?: Date;
  expiryDate?: Date;
  notes?: string;
  fileBase64?: string; // Archivo en Base64 (máximo 5MB)
}

/**
 * Request para actualizar un documento
 */
export interface UpdateDocumentRequest {
  documentId: string;
  documentNumber?: string;
  issuingCountry?: string;
  issueDate?: Date;
  expiryDate?: Date;
  notes?: string;
  fileBase64?: string;
}

/**
 * Elemento de la cola de sincronización
 */
export interface SyncQueueItem {
  documentId: string;
  operation: 'create' | 'update' | 'delete';
  data: AddDocumentRequest | UpdateDocumentRequest;
  timestamp: Date;
  retryCount: number;
}

/**
 * Configuración de la cola de sincronización
 */
export interface SyncQueue {
  items: SyncQueueItem[];
  lastSyncAttempt?: Date;
  isPaused: boolean;
}

/**
 * Response de funciones serverless
 */
export interface ServerFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Labels de tipos de documentos (para UI)
 */
export const DocumentTypeLabels: Record<DocumentType, string> = {
  [DocumentType.PASSPORT]: 'Pasaporte',
  [DocumentType.VISA]: 'Visa',
  [DocumentType.INSURANCE]: 'Seguro de Viaje',
  [DocumentType.TICKET]: 'Boleto',
  [DocumentType.VACCINATION]: 'Certificado de Vacunación',
  [DocumentType.ID_CARD]: 'Documento de Identidad',
  [DocumentType.DRIVER_LICENSE]: 'Licencia de Conducir',
  [DocumentType.OTHER]: 'Otro',
};

/**
 * Iconos de tipos de documentos (Ionicons)
 */
export const DocumentTypeIcons: Record<DocumentType, string> = {
  [DocumentType.PASSPORT]: 'airplane',
  [DocumentType.VISA]: 'document-text',
  [DocumentType.INSURANCE]: 'shield-checkmark',
  [DocumentType.TICKET]: 'ticket',
  [DocumentType.VACCINATION]: 'medical',
  [DocumentType.ID_CARD]: 'card',
  [DocumentType.DRIVER_LICENSE]: 'car',
  [DocumentType.OTHER]: 'document',
};

/**
 * Colores de tipos de documentos
 */
export const DocumentTypeColors: Record<DocumentType, string> = {
  [DocumentType.PASSPORT]: '#4F8EF7',
  [DocumentType.VISA]: '#9B59B6',
  [DocumentType.INSURANCE]: '#2ECC71',
  [DocumentType.TICKET]: '#F39C12',
  [DocumentType.VACCINATION]: '#E74C3C',
  [DocumentType.ID_CARD]: '#3498DB',
  [DocumentType.DRIVER_LICENSE]: '#1ABC9C',
  [DocumentType.OTHER]: '#95A5A6',
};
