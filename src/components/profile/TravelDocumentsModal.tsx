import React, { useState, useEffect } from 'react';

import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { WebView } from 'react-native-webview';

import AddDocumentModal, { type DocumentFormData } from '~/components/profile/AddDocumentModal';
import ChangePINModal from '~/components/profile/ChangePINModal';
import DocumentViewerModal from '~/components/profile/DocumentViewerModal';
import PinSetupInline from '~/components/profile/PinSetupInline';
import PinVerificationInline from '~/components/profile/PinVerificationInline';
import SecuritySettingsModal from '~/components/profile/SecuritySettingsModal';
import { useDocumentSync } from '~/hooks/useDocumentSync';
import { supabase } from '~/lib/supabase';
import { useTheme } from '~/lib/theme';
import { hasPinConfigured, encryptDocument, decryptDocument } from '~/services/documentEncryption';

interface TravelDocumentsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface Document {
  id: string;
  document_type: string;
  expiry_date: string;
  has_image: boolean;
  encrypted_data_primary: string;
  primary_iv?: string;
  primary_auth_tag?: string;
  created_at: string;
  status?: 'valid' | 'warning' | 'critical' | 'expired';
}

interface DecryptedData {
  documentNumber: string;
  issuingCountry: string;
  issueDate: string;
  notes: string;
  imageUrl?: string; // Signed URL (generated at load time)
  filePath?: string; // Original storage path
}

interface EncryptedDataResponse {
  encryptedWithPrimary: string;
  encryptedWithRecovery: string;
  primaryIv: string;
  recoveryIv: string;
  primaryAuthTag: string;
  recoveryAuthTag: string;
}

export default function TravelDocumentsModal({ visible, onClose }: TravelDocumentsModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [hasPin, setHasPin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // NEW: Track authentication state
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [pendingDocumentData, setPendingDocumentData] = useState<DocumentFormData | null>(null);
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // Offline Sync Hook
  const {
    cachedDocuments,
    cacheSizeMB,
    downloadForOffline,
    removeFromCache,
    isDocumentAvailableOffline,
    refreshCacheStatus,
    isConnected,
    isSyncing,
    queueStatus,
    lastSyncAt,
  } = useDocumentSync();

  // Estado de descarga por documento
  const [downloadingDocs, setDownloadingDocs] = useState<Set<string>>(new Set());

  // Helper: formatear tiempo relativo para last sync
  const getRelativeTime = (date: Date | null): string => {
    if (!date) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Get userId when modal opens
  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    if (visible) {
      getUserId();
    }
  }, [visible]);

  // Reset authentication when modal opens/closes
  useEffect(() => {
    if (visible) {
      console.log('🔐 TravelDocumentsModal: Modal opened, checking PIN status...');
      checkPinStatus();
      // Don't load documents yet - wait for authentication
      setIsAuthenticated(false); // Reset auth state each time modal opens
    } else {
      console.log('🔐 TravelDocumentsModal: Modal closed, clearing auth state');
      // Clear authentication when modal closes
      setIsAuthenticated(false);
      setDocuments([]);
    }
  }, [visible]);

  // Handle authentication flow
  useEffect(() => {
    if (!visible) return;

    console.log('🔐 Authentication Flow Check:', { hasPin, isAuthenticated });

    if (!hasPin) {
      // No PIN configured yet - show setup
      console.log('🔐 No PIN configured - showing setup');
      setShowPinSetup(true);
      setShowPinVerification(false);
    } else if (hasPin && !isAuthenticated) {
      // PIN configured but not authenticated - show verification
      console.log('🔐 Has PIN but not authenticated - showing verification');
      setShowPinVerification(true);
      setShowPinSetup(false);
    } else if (hasPin && isAuthenticated) {
      // Authenticated - load documents
      console.log('🔐 Authenticated - loading documents');
      loadDocuments();
    }
  }, [visible, hasPin, isAuthenticated]);

  const checkPinStatus = async () => {
    console.log('🔐 Checking PIN status...');
    const pinConfigured = await hasPinConfigured();
    console.log('🔐 PIN configured:', pinConfigured);
    setHasPin(pinConfigured);
  };

  // Helper to detect if document uses real encryption
  const isRealEncryption = (doc: Document): boolean => {
    // Check that all required encryption fields exist AND have valid values (not empty strings)
    const hasValidPrimaryIv = doc.primary_iv && doc.primary_iv.trim().length > 0;
    const hasValidPrimaryAuthTag = doc.primary_auth_tag && doc.primary_auth_tag.trim().length > 0;
    const hasValidEncryptedData =
      doc.encrypted_data_primary && doc.encrypted_data_primary.trim().length > 0;

    const isValid = !!(hasValidPrimaryIv && hasValidPrimaryAuthTag && hasValidEncryptedData);

    console.log('🔍 isRealEncryption check:', {
      documentId: doc.id?.substring(0, 8),
      hasValidPrimaryIv,
      hasValidPrimaryAuthTag,
      hasValidEncryptedData,
      isValid,
    });

    return isValid;
  };

  const loadDocuments = async (pin?: string) => {
    try {
      setLoading(true);

      // Check connectivity first
      if (!isConnected) {
        console.warn('⚠️ Cannot load documents - offline mode');
        setDocuments([]);
        return;
      }

      let user;
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        user = authUser;
      } catch (error) {
        console.warn('⚠️ Cannot verify user (network error) - skipping document load');
        setDocuments([]);
        return;
      }

      if (!user) {
        setDocuments([]);
        return;
      }

      let data;
      try {
        const result = await supabase
          .from('travel_documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (result.error) {
          console.error('Error loading documents:', result.error);
          return;
        }

        data = result.data;
      } catch (error) {
        console.warn('⚠️ Cannot load documents (network error)');
        setDocuments([]);
        return;
      }

      // Generate signed URLs for each document
      const documentsWithUrls = await Promise.all(
        (data || []).map(async (doc) => {
          try {
            let decryptedData;

            // Check if document uses real encryption
            if (isRealEncryption(doc)) {
              console.log('🔐 Document uses real encryption, decrypting...');

              // For now, we'll skip decryption if no PIN provided
              // Documents will be decrypted on-demand when viewing
              if (!pin) {
                console.log('⚠️ No PIN provided, skipping decryption for list view');
                return doc; // Return encrypted document as-is
              }

              // Decrypt with PIN
              const decryptResult = await decryptDocument(
                doc.id,
                doc.encrypted_data_primary,
                doc.primary_iv!,
                doc.primary_auth_tag!,
                pin
              );

              if (!decryptResult.success) {
                console.error('❌ Failed to decrypt document:', decryptResult.error);
                return doc; // Return encrypted document as-is
              }

              decryptedData = decryptResult.data;
            } else {
              // Legacy document with JSON.stringify
              console.log('📜 Legacy document format, using JSON.parse');
              decryptedData = JSON.parse(doc.encrypted_data_primary);
            }
            console.log('🔍 Decrypted data:', decryptedData);

            // Handle old documents with imageUrl (extract filePath from URL)
            if (decryptedData.imageUrl && !decryptedData.filePath) {
              console.log('⚠️ Old document format detected, extracting filePath from imageUrl');
              const urlParts = decryptedData.imageUrl.split('/travel-documents/');
              if (urlParts.length > 1) {
                decryptedData.filePath = urlParts[1];
                console.log('� Extracted filePath:', decryptedData.filePath);
              }
            }

            // Generate signed URL if we have filePath
            if (decryptedData.filePath) {
              console.log('🔗 Generating signed URL for:', decryptedData.filePath);

              try {
                const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                  .from('travel-documents')
                  .createSignedUrl(decryptedData.filePath, 3600);

                if (signedUrlError) {
                  console.error('❌ Signed URL error:', JSON.stringify(signedUrlError));

                  // Fallback: try public URL
                  const { data: publicUrlData } = supabase.storage
                    .from('travel-documents')
                    .getPublicUrl(decryptedData.filePath);

                  console.log('🔓 Using public URL fallback:', publicUrlData.publicUrl);

                  doc.encrypted_data_primary = JSON.stringify({
                    ...decryptedData,
                    imageUrl: publicUrlData.publicUrl,
                    filePath: decryptedData.filePath,
                  });
                } else if (signedUrlData) {
                  console.log('✅ Signed URL generated successfully');
                  doc.encrypted_data_primary = JSON.stringify({
                    ...decryptedData,
                    imageUrl: signedUrlData.signedUrl,
                    filePath: decryptedData.filePath,
                  });
                }
              } catch (urlError) {
                // Network error generating signed URL
                console.warn('⚠️ Cannot generate signed URL (network error) - skipping');
              }
            } else {
              console.log('⚠️ No filePath found, keeping original imageUrl');
            }
          } catch (e) {
            console.error('❌ Error processing document:', e);
          }
          return doc;
        })
      );

      setDocuments(documentsWithUrls);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPin = () => {
    setShowPinSetup(true);
  };

  const handlePinSetupSuccess = () => {
    setShowPinSetup(false);
    setHasPin(true);
    setIsAuthenticated(true); // Automatically authenticated after setup
  };

  const handleAddDocument = () => {
    if (!hasPin) {
      handleSetupPin();
      return;
    }
    setShowAddDocument(true);
  };

  const handleSaveDocument = async (documentData: DocumentFormData) => {
    try {
      console.log('📄 Document data ready, asking for PIN verification...');

      // Store document data and show PIN verification
      setPendingDocumentData(documentData);
      setShowAddDocument(false);
      setShowPinVerification(true);
    } catch (error) {
      console.error('Error preparing document:', error);
      Alert.alert('Error', 'No se pudo preparar el documento. Intenta de nuevo.');
    }
  };

  const handlePinVerified = async (pin: string) => {
    // Check if this is for viewing documents or saving a document
    if (!pendingDocumentData) {
      // PIN verified for viewing documents
      console.log('[PIN] Verified, granting access to documents...');
      setVerifiedPin(pin);
      setShowPinVerification(false);
      setIsAuthenticated(true);
      // loadDocuments will be called by useEffect when isAuthenticated becomes true
      return;
    }

    // PIN verified for saving a document
    try {
      console.log('[SAVE] PIN verified, saving document with encryption...');
      setVerifiedPin(pin);
      setShowPinVerification(false);
      setSaving(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. Upload file (image or PDF) to Storage
      console.log('[STORAGE] Uploading file...');
      const fileBase64 = await FileSystem.readAsStringAsync(pendingDocumentData.imageUri, {
        encoding: 'base64',
      });

      // Determine file extension and content type based on file type
      const fileExtension = pendingDocumentData.fileType === 'pdf' ? 'pdf' : 'jpg';
      const contentType = pendingDocumentData.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';
      const fileName = `${user.id}/${Date.now()}.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('travel-documents')
        .upload(fileName, decode(fileBase64), {
          contentType,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('[STORAGE] Upload error:', uploadError);
        throw uploadError;
      }

      console.log('[STORAGE] File uploaded:', uploadData.path);

      // 2. Encrypt document data with Edge Function
      console.log('[ENCRYPT] Encrypting document data...');
      const documentId = `doc-${Date.now()}`; // Temporary ID for encryption

      const encryptionResult = await encryptDocument({
        documentId,
        title: `${pendingDocumentData.type}-${Date.now()}`,
        documentType: pendingDocumentData.type,
        documentNumber: pendingDocumentData.documentNumber,
        issuingCountry: pendingDocumentData.issuingCountry,
        issuingDate: pendingDocumentData.issueDate.toISOString(),
        expiryDate: pendingDocumentData.expiryDate.toISOString(),
        notes: pendingDocumentData.notes || '',
        imageUri: uploadData.path, // Store the storage path
        pin,
      });

      if (!encryptionResult.success || !encryptionResult.encryptedData) {
        console.error('[ENCRYPT] Encryption failed:', encryptionResult.error);
        throw new Error(encryptionResult.error || 'Encryption failed');
      }

      const encryptedData = encryptionResult.encryptedData as EncryptedDataResponse;
      console.log('[ENCRYPT] Document encrypted successfully');

      // 3. Save encrypted data to database
      console.log('[DB] Saving encrypted document...');
      const { error: dbError } = await supabase.from('travel_documents').insert({
        user_id: user.id,
        document_type: pendingDocumentData.type,
        expiry_date: pendingDocumentData.expiryDate.toISOString(),
        has_image: true,
        encrypted_data_primary: encryptedData.encryptedWithPrimary,
        primary_iv: encryptedData.primaryIv,
        primary_auth_tag: encryptedData.primaryAuthTag,
        encrypted_data_recovery: encryptedData.encryptedWithRecovery,
        recovery_iv: encryptedData.recoveryIv,
        recovery_auth_tag: encryptedData.recoveryAuthTag,
      });

      if (dbError) {
        console.error('[DB] Database error:', dbError);
        throw dbError;
      }

      setSaving(false);
      console.log('[SUCCESS] Document saved with encryption!');

      // Reload documents list
      await loadDocuments();

      Alert.alert('Documento Guardado', 'El documento se ha guardado correctamente.', [
        {
          text: 'OK',
          onPress: () => {
            setPendingDocumentData(null);
          },
        },
      ]);
    } catch (error) {
      setSaving(false);
      console.error('[ERROR] Saving document:', error);
      Alert.alert('Error', 'No se pudo guardar el documento. Intenta de nuevo.');
    }
  };

  const handlePinVerificationCancel = () => {
    setShowPinVerification(false);
    setPendingDocumentData(null);
    setShowAddDocument(true); // Volver al formulario
  };

  const getDocumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'passport':
        return 'airplane';
      case 'visa':
        return 'document-text';
      case 'id_card':
        return 'card';
      case 'driver_license':
        return 'car';
      case 'vaccination':
        return 'medical';
      case 'insurance':
        return 'shield-checkmark';
      case 'ticket':
        return 'ticket';
      default:
        return 'document';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'passport':
        return 'Pasaporte';
      case 'visa':
        return 'Visa';
      case 'id_card':
        return 'Cédula de Identidad';
      case 'driver_license':
        return 'Licencia de Conducir';
      case 'vaccination':
        return 'Certificado de Vacuna';
      case 'insurance':
        return 'Seguro de Viaje';
      case 'ticket':
        return 'Boleto/Ticket';
      default:
        return 'Otro';
    }
  };

  const getFileType = (doc: Document): 'image' | 'pdf' | null => {
    try {
      const data = JSON.parse(doc.encrypted_data_primary) as DecryptedData;
      if (data.imageUrl) {
        return data.imageUrl.endsWith('.pdf') ? 'pdf' : 'image';
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleDocumentPress = async (doc: Document) => {
    try {
      let documentToView = doc;

      // If document uses real encryption, decrypt it first
      if (isRealEncryption(doc) && verifiedPin) {
        console.log('🔐 Decrypting document for viewing...');
        console.log('🔍 Document encryption fields:', {
          hasEncryptedData: !!doc.encrypted_data_primary,
          hasPrimaryIv: !!doc.primary_iv,
          hasPrimaryAuthTag: !!doc.primary_auth_tag,
          primaryIvValue: doc.primary_iv,
          primaryAuthTagValue: doc.primary_auth_tag,
          encryptedDataPreview: doc.encrypted_data_primary?.substring(0, 50),
        });

        const decryptResult = await decryptDocument(
          doc.id,
          doc.encrypted_data_primary,
          doc.primary_iv!,
          doc.primary_auth_tag!,
          verifiedPin
        );

        if (decryptResult.success && decryptResult.data) {
          console.log('✅ Document decrypted successfully');
          console.log('🔍 Decrypted data:', decryptResult.data);

          // Cast to expected type
          const data = decryptResult.data as {
            documentNumber?: string;
            issuingCountry?: string;
            issuingDate?: string;
            notes?: string;
            imageUri?: string;
          };

          // Map decrypted data to the format expected by DocumentViewerModal
          const mappedData = {
            documentNumber: data.documentNumber,
            issuingCountry: data.issuingCountry,
            issueDate: data.issuingDate,
            notes: data.notes,
            imageUrl: data.imageUri, // Map imageUri to imageUrl
            filePath: data.imageUri, // Use same value for filePath
          };

          console.log('🔍 Mapped data:', mappedData);

          // Create a temporary decrypted version for viewing
          documentToView = {
            ...doc,
            encrypted_data_primary: JSON.stringify(mappedData),
          };
        } else {
          console.error('❌ Failed to decrypt document:', decryptResult.error);
          Alert.alert('Error', 'No se pudo desencriptar el documento');
          return;
        }
      }

      setSelectedDocument(documentToView);
      setShowDocumentViewer(true);
    } catch (error) {
      console.error('Error preparing document for viewing:', error);
      Alert.alert('Error', 'No se pudo cargar el documento');
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;

    try {
      setLoading(true);

      // 1. Delete from database
      const { error: dbError } = await supabase
        .from('travel_documents')
        .delete()
        .eq('id', selectedDocument.id);

      if (dbError) {
        console.error('Database delete error:', dbError);
        throw dbError;
      }

      // 2. Delete file from storage
      try {
        const data = JSON.parse(selectedDocument.encrypted_data_primary) as DecryptedData;
        if (data.filePath) {
          // Use stored filePath for deletion
          await supabase.storage.from('travel-documents').remove([data.filePath]);
        }
      } catch (storageError) {
        console.warn('Storage cleanup error (non-critical):', storageError);
      }

      // 3. Reload documents list
      await loadDocuments();

      setShowDocumentViewer(false);
      setSelectedDocument(null);

      Alert.alert('✅ Eliminado', 'El documento se ha eliminado correctamente.');
    } catch (error) {
      console.error('Error deleting document:', error);
      Alert.alert('❌ Error', 'No se pudo eliminar el documento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocumentFromList = async (doc: Document) => {
    Alert.alert(
      'Eliminar Documento',
      '¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // 1. Delete from database
              const { error: dbError } = await supabase
                .from('travel_documents')
                .delete()
                .eq('id', doc.id);

              if (dbError) {
                console.error('Database delete error:', dbError);
                throw dbError;
              }

              // 2. Try to delete file from storage (best effort)
              try {
                // Try to parse encrypted data to get filePath
                const data = JSON.parse(doc.encrypted_data_primary) as DecryptedData;
                if (data.filePath) {
                  await supabase.storage.from('travel-documents').remove([data.filePath]);
                }
              } catch (storageError) {
                console.warn('Storage cleanup error (non-critical):', storageError);
              }

              // 3. Reload documents list
              await loadDocuments();

              Alert.alert('✅ Eliminado', 'El documento se ha eliminado correctamente.');
            } catch (error) {
              console.error('Error deleting document from list:', error);
              Alert.alert('❌ Error', 'No se pudo eliminar el documento.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenPDF = (url: string) => {
    console.log('📱 TravelDocumentsModal: Opening PDF in separate modal');
    console.log('📱 PDF URL:', url.substring(0, 100));
    setPdfUrl(url);
    setShowPdfViewer(true);
  };

  // ====== OFFLINE CACHE FUNCTIONS ======

  /**
   * Descargar documento para acceso offline
   */
  const handleDownloadForOffline = async (doc: Document) => {
    try {
      console.log('📥 Downloading document for offline:', doc.id);

      // Mostrar indicador de descarga
      setDownloadingDocs((prev) => new Set(prev).add(doc.id));

      // Verificar que tengamos los datos encriptados
      if (!doc.encrypted_data_primary || !doc.primary_iv || !doc.primary_auth_tag) {
        Alert.alert('Error', 'No se pueden descargar documentos sin datos encriptados.');
        return;
      }

      // Descargar y cachear
      const success = await downloadForOffline(
        doc.id,
        doc.encrypted_data_primary,
        doc.primary_iv,
        doc.primary_auth_tag,
        {
          documentType: doc.document_type,
          expiryDate: doc.expiry_date,
        }
      );

      if (success) {
        Alert.alert(
          '✅ Disponible Offline',
          'El documento se ha descargado y está disponible sin conexión.'
        );
        await refreshCacheStatus();
      } else {
        Alert.alert(
          '❌ Error',
          'No se pudo descargar el documento. Verifica el espacio disponible.'
        );
      }
    } catch (error) {
      console.error('Error downloading for offline:', error);
      Alert.alert('❌ Error', 'No se pudo descargar el documento.');
    } finally {
      // Remover indicador de descarga
      setDownloadingDocs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };

  /**
   * Eliminar documento del cache offline
   */
  const handleRemoveFromOffline = async (doc: Document) => {
    Alert.alert(
      'Eliminar Cache Offline',
      '¿Deseas eliminar este documento del almacenamiento offline? Seguirá disponible en línea.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Removing from offline cache:', doc.id);

              const success = await removeFromCache(doc.id);

              if (success) {
                Alert.alert('✅ Eliminado', 'El documento se ha eliminado del cache offline.');
                await refreshCacheStatus();
              } else {
                Alert.alert('❌ Error', 'No se pudo eliminar del cache offline.');
              }
            } catch (error) {
              console.error('Error removing from offline:', error);
              Alert.alert('❌ Error', 'No se pudo eliminar del cache.');
            }
          },
        },
      ]
    );
  };

  /**
   * Mostrar menú de opciones offline para un documento
   */
  const handleOfflineOptions = (doc: Document) => {
    const isOffline = isDocumentAvailableOffline(doc.id);

    const options: any[] = [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
    ];

    if (isOffline) {
      options.unshift({
        text: '🗑️ Eliminar de Offline',
        style: 'destructive',
        onPress: () => handleRemoveFromOffline(doc),
      });
    } else {
      options.unshift({
        text: '📥 Descargar para Offline',
        onPress: () => handleDownloadForOffline(doc),
      });
    }

    Alert.alert(
      'Opciones Offline',
      'Gestiona el almacenamiento offline de este documento:',
      options
    );
  };

  console.log('🎨 TravelDocumentsModal Render State:', {
    visible,
    hasPin,
    isAuthenticated,
    loading,
    documentsCount: documents.length,
    showPinSetup,
    showPinVerification,
  });

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('profile.menu.travel_documents')}
              </Text>

              {/* Network & Sync Status */}
              <View style={styles.statusRow}>
                {/* Connection indicator */}
                <View style={styles.connectionIndicator}>
                  <Ionicons
                    name={isConnected ? 'wifi' : 'wifi-outline'}
                    size={10}
                    color={isConnected ? '#10B981' : '#EF4444'}
                  />
                  <Text
                    style={[styles.connectionText, { color: isConnected ? '#10B981' : '#EF4444' }]}
                  >
                    {isConnected ? 'Online' : 'Offline'}
                  </Text>
                </View>

                {/* Sync indicator */}
                {isSyncing && (
                  <View style={styles.syncIndicator}>
                    <Text style={styles.syncText}>⏳ Syncing...</Text>
                  </View>
                )}

                {/* Queue indicator */}
                {queueStatus.pendingItems > 0 && (
                  <View style={styles.queueIndicator}>
                    <Ionicons name="cloud-upload-outline" size={10} color="#F59E0B" />
                    <Text style={styles.queueText}>{queueStatus.pendingItems} pending</Text>
                  </View>
                )}

                {/* Cache indicator */}
                {cachedDocuments.size > 0 && (
                  <Text style={[styles.cacheIndicator, { color: theme.colors.textMuted }]}>
                    {cachedDocuments.size} offline • {cacheSizeMB.toFixed(1)} MB
                  </Text>
                )}

                {/* Last sync indicator */}
                {lastSyncAt && isConnected && (
                  <Text style={[styles.lastSyncText, { color: theme.colors.textMuted }]}>
                    Last sync: {getRelativeTime(lastSyncAt)}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => setShowSecuritySettings(true)}
                style={styles.settingsButton}
              >
                <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddDocument} style={styles.addButton}>
                <Ionicons name="add" size={28} color="#2196F3" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          {showPinSetup ? (
            /* Show PIN setup inline - no nested modal */
            <PinSetupInline
              onSuccess={handlePinSetupSuccess}
              onCancel={() => setShowPinSetup(false)}
            />
          ) : showPinVerification ? (
            /* Show PIN verification inline - no nested modal */
            <PinVerificationInline
              onSuccess={handlePinVerified}
              onCancel={handlePinVerificationCancel}
              title="Verificar PIN"
              message="Ingresa tu PIN para acceder a tus documentos"
            />
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {!isAuthenticated && hasPin ? (
                /* Locked State - Waiting for PIN verification */
                <View style={styles.lockedState}>
                  <View style={styles.lockedIconContainer}>
                    <Ionicons name="lock-closed" size={80} color={theme.colors.textMuted} />
                  </View>
                  <Text style={[styles.lockedTitle, { color: theme.colors.text }]}>
                    Documentos Protegidos
                  </Text>
                  <Text style={[styles.lockedSubtitle, { color: theme.colors.textMuted }]}>
                    Ingresa tu PIN para acceder a tus documentos de viaje
                  </Text>
                  <View style={styles.securityBadge}>
                    <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                    <Text style={[styles.securityBadgeText, { color: theme.colors.textMuted }]}>
                      Protegido con encriptación AES-256
                    </Text>
                  </View>
                </View>
              ) : loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
                    Cargando documentos...
                  </Text>
                </View>
              ) : documents.length === 0 ? (
                /* Empty State */
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons
                      name="document-text-outline"
                      size={80}
                      color={theme.colors.textMuted}
                    />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                    No hay documentos guardados
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
                    Guarda tus pasaportes, visas y otros documentos de viaje de forma segura
                  </Text>

                  {/* Security Info */}
                  <View style={styles.securityCard}>
                    <View style={styles.securityIconRow}>
                      <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
                      <Text style={[styles.securityTitle, { color: theme.colors.text }]}>
                        Seguridad de nivel militar
                      </Text>
                    </View>
                    <View style={styles.securityFeature}>
                      <Ionicons name="lock-closed" size={16} color={theme.colors.textMuted} />
                      <Text style={[styles.securityText, { color: theme.colors.textMuted }]}>
                        Encriptación AES-256-GCM
                      </Text>
                    </View>
                    <View style={styles.securityFeature}>
                      <Ionicons name="finger-print" size={16} color={theme.colors.textMuted} />
                      <Text style={[styles.securityText, { color: theme.colors.textMuted }]}>
                        Autenticación biométrica
                      </Text>
                    </View>
                    <View style={styles.securityFeature}>
                      <Ionicons name="key" size={16} color={theme.colors.textMuted} />
                      <Text style={[styles.securityText, { color: theme.colors.textMuted }]}>
                        Recuperación por email
                      </Text>
                    </View>
                  </View>

                  {/* Add First Document Button */}
                  <TouchableOpacity
                    style={styles.addFirstButton}
                    onPress={handleAddDocument}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.addFirstButtonText}>Agregar mi primer documento</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Documents List */
                <View style={styles.documentsList}>
                  {documents.map((doc) => {
                    const fileType = getFileType(doc);
                    return (
                      <View
                        key={doc.id}
                        style={[styles.documentCard, { backgroundColor: theme.colors.card }]}
                      >
                        <TouchableOpacity
                          style={styles.documentCardContent}
                          activeOpacity={0.7}
                          onPress={() => handleDocumentPress(doc)}
                        >
                          <View style={styles.documentIcon}>
                            <Ionicons
                              name={getDocumentIcon(doc.document_type)}
                              size={32}
                              color="#2196F3"
                            />
                          </View>
                          <View style={styles.documentInfo}>
                            <View style={styles.documentTitleRow}>
                              <Text style={[styles.documentType, { color: theme.colors.text }]}>
                                {getDocumentTypeLabel(doc.document_type)}
                              </Text>
                              {fileType === 'pdf' && (
                                <View style={styles.pdfBadge}>
                                  <Ionicons name="document-text" size={12} color="#FFFFFF" />
                                  <Text style={styles.pdfBadgeText}>PDF</Text>
                                </View>
                              )}
                              {/* Offline Badge */}
                              {isDocumentAvailableOffline(doc.id) && (
                                <View style={styles.offlineBadge}>
                                  <Ionicons name="cloud-offline" size={12} color="#10B981" />
                                  <Text style={styles.offlineBadgeText}>Offline</Text>
                                </View>
                              )}
                            </View>
                            <Text
                              style={[styles.documentExpiry, { color: theme.colors.textMuted }]}
                            >
                              Vence: {new Date(doc.expiry_date).toLocaleDateString('es-ES')}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={24}
                            color={theme.colors.textMuted}
                          />
                        </TouchableOpacity>
                        {/* Offline button */}
                        <TouchableOpacity
                          style={styles.offlineButton}
                          onPress={() => handleOfflineOptions(doc)}
                          activeOpacity={0.7}
                        >
                          {downloadingDocs.has(doc.id) ? (
                            <Text style={styles.offlineButtonIcon}>⏳</Text>
                          ) : isDocumentAvailableOffline(doc.id) ? (
                            <Ionicons name="cloud-done" size={20} color="#10B981" />
                          ) : (
                            <Ionicons name="cloud-download-outline" size={20} color="#2196F3" />
                          )}
                        </TouchableOpacity>

                        {/* Delete button */}
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteDocumentFromList(doc)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}

          {/* Add Document Modal */}
          <AddDocumentModal
            visible={showAddDocument}
            onClose={() => setShowAddDocument(false)}
            onSave={handleSaveDocument}
          />

          {/* Document Viewer Modal - Hidden when PDF viewer is open */}
          <DocumentViewerModal
            visible={showDocumentViewer && !showPdfViewer}
            onClose={() => {
              setShowDocumentViewer(false);
              setSelectedDocument(null);
            }}
            document={selectedDocument}
            onDelete={handleDeleteDocument}
            onOpenPDF={handleOpenPDF}
          />

          {/* Security Settings Modal */}
          <SecuritySettingsModal
            visible={showSecuritySettings}
            onClose={() => setShowSecuritySettings(false)}
            onChangePIN={() => {
              setShowSecuritySettings(false);
              setShowChangePIN(true);
            }}
          />

          {/* Change PIN Modal */}
          <ChangePINModal
            visible={showChangePIN}
            onClose={() => setShowChangePIN(false)}
            onSuccess={async () => {
              setShowChangePIN(false);
              Alert.alert(
                '✅ Éxito',
                'Tu PIN ha sido cambiado correctamente y todos tus documentos han sido re-encriptados.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Reload documents with new PIN
                      loadDocuments();
                    },
                  },
                ]
              );
            }}
            userId={userId}
          />

          {/* PDF Viewer Modal - Completely Separate */}
          {showPdfViewer && pdfUrl && (
            <Modal
              visible={true}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => {
                console.log('🔴 PDF Modal closing');
                setShowPdfViewer(false);
                setPdfUrl(null);
              }}
            >
              <View style={styles.pdfModalContainer}>
                <View style={[styles.pdfModalHeader, { backgroundColor: theme.colors.card }]}>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('🔴 Close PDF button pressed');
                      setShowPdfViewer(false);
                      setPdfUrl(null);
                    }}
                    style={styles.pdfCloseButton}
                  >
                    <Ionicons name="close" size={28} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.pdfModalTitle, { color: theme.colors.text }]}>
                    Documento PDF
                  </Text>
                  <View style={styles.spacer} />
                </View>
                <View style={styles.pdfWebView}>
                  <WebView
                    source={{ uri: pdfUrl }}
                    style={styles.pdfWebView}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsInlineMediaPlayback={true}
                    onLoadStart={(e) => {
                      console.log('📄 PDF loading started');
                      console.log('📄 URL:', e.nativeEvent.url);
                    }}
                    onLoad={(e) => {
                      console.log('✅ PDF loaded successfully');
                      console.log('✅ Title:', e.nativeEvent.title);
                    }}
                    onError={(syntheticEvent) => {
                      const { nativeEvent } = syntheticEvent;
                      console.error('❌ WebView error:', nativeEvent);
                      Alert.alert('Error', 'No se pudo cargar el PDF');
                    }}
                    onHttpError={(syntheticEvent) => {
                      const { nativeEvent } = syntheticEvent;
                      console.error(
                        '❌ HTTP error:',
                        nativeEvent.statusCode,
                        nativeEvent.description
                      );
                    }}
                    renderLoading={() => (
                      <View style={styles.pdfLoadingContainer}>
                        <Text style={[styles.pdfLoadingText, { color: theme.colors.text }]}>
                          Cargando PDF...
                        </Text>
                      </View>
                    )}
                  />
                </View>
              </View>
            </Modal>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    padding: 4,
  },
  settingsButton: {
    padding: 4,
  },
  addButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '600',
  },
  queueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  queueText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '600',
  },
  cacheIndicator: {
    fontSize: 11,
    marginTop: 0,
    textAlign: 'center',
  },
  lastSyncText: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  securityCard: {
    width: '100%',
    backgroundColor: 'rgba(76, 175, 80, 0.08)' as const,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  securityIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    marginLeft: 8,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3' as const,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#2196F3' as const,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addFirstButtonText: {
    color: '#FFFFFF' as const,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  lockedState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  lockedIconContainer: {
    marginBottom: 24,
    opacity: 0.6,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)' as const,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 8,
  },
  securityBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  documentsList: {
    padding: 16,
  },
  documentCard: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  documentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingRight: 96, // Extra padding for offline (36px) + delete (36px) buttons + spacing (16px) + margin (8px)
    flex: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)' as const,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineButton: {
    position: 'absolute',
    top: 8,
    right: 52, // 8px (margin) + 36px (delete button) + 8px (spacing)
    backgroundColor: 'rgba(33, 150, 243, 0.1)' as const,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineButtonIcon: {
    fontSize: 16,
  },
  documentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(33, 150, 243, 0.1)' as const,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentExpiry: {
    fontSize: 14,
  },
  documentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000' as const,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  pdfBadgeText: {
    color: '#FFFFFF' as const,
    fontSize: 10,
    fontWeight: '600',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)' as const,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: '#10B981' as const,
  },
  offlineBadgeText: {
    color: '#10B981' as const,
    fontSize: 10,
    fontWeight: '600',
  },
  pdfModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF' as const,
  },
  pdfModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0' as const,
  },
  pdfCloseButton: {
    padding: 4,
  },
  pdfModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  pdfWebView: {
    flex: 1,
  },
  pdfLoadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F5F5F5' as const,
  },
  pdfLoadingText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  spacer: {
    width: 28,
  },
});
