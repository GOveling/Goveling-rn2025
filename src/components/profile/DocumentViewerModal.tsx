import React, { useState } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '~/lib/theme';

import ImageViewerCompat from './ImageViewerCompat';

interface DocumentViewerModalProps {
  visible: boolean;
  onClose: () => void;
  document: {
    id: string;
    document_type: string;
    expiry_date: string;
    encrypted_data_primary: string;
  } | null;
  onDelete?: () => void;
  onOpenPDF?: (pdfUrl: string) => void; // Callback to parent to handle PDF viewing
}

interface DecryptedData {
  documentNumber: string;
  issuingCountry: string;
  issueDate: string;
  notes: string;
  imageUrl?: string; // Signed URL (generated at load time)
  filePath?: string; // Original storage path (kept for reference)
}

export default function DocumentViewerModal({
  visible,
  onClose,
  document,
  onDelete,
  onOpenPDF,
}: DocumentViewerModalProps) {
  const theme = useTheme();
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  // Parse decrypted data (temporary - will use real decryption in Phase 4.3)
  // useMemo must be called unconditionally, before any early returns
  const decryptedData: DecryptedData | null = React.useMemo(() => {
    if (!document) return null;
    try {
      return JSON.parse(document.encrypted_data_primary);
    } catch {
      return null;
    }
  }, [document]);

  // Check if it's a PDF by looking at the filePath (not the signed URL which has query params)
  const isPDF =
    decryptedData?.filePath?.toLowerCase().endsWith('.pdf') ||
    decryptedData?.imageUrl?.toLowerCase().includes('.pdf');

  // Reset viewers only when main modal closes (but not when PDF viewer is open)
  React.useEffect(() => {
    if (!visible) {
      // Only reset if we're not showing the PDF viewer
      // PDF viewer is a separate full-screen modal, so we want to keep it open
      setIsImageViewerVisible(false);
      // Note: Don't reset isPDFViewerVisible here - it's controlled by the PDF modal itself
    }
  }, [visible]);

  // Debug: Log document data on mount
  React.useEffect(() => {
    if (visible && decryptedData) {
      console.log('🔍 DocumentViewerModal - Document data:');
      console.log('  - imageUrl:', decryptedData.imageUrl);
      console.log('  - filePath:', decryptedData.filePath);
      console.log('  - isPDF:', isPDF);
      console.log('  - document type:', document?.document_type);
    }
  }, [visible, decryptedData, isPDF, document]);

  if (!document || !decryptedData) {
    return null;
  }

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

  const handleOpenPDF = () => {
    console.log('🔵 handleOpenPDF called');
    console.log('🔵 imageUrl:', decryptedData.imageUrl);
    console.log('🔵 filePath:', decryptedData.filePath);
    console.log('🔵 isPDF:', isPDF);

    if (!decryptedData.imageUrl) {
      console.log('❌ No imageUrl available');
      Alert.alert('Error', 'URL del archivo no disponible');
      return;
    }

    console.log('✅ Notifying parent to open PDF viewer');
    // Don't close this modal - just hide it temporarily while PDF is shown
    // The parent will handle showing the PDF modal on top
    if (onOpenPDF) {
      onOpenPDF(decryptedData.imageUrl);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '⚠️ Eliminar Documento',
      '¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete();
              onClose();
            }
          },
        },
      ]
    );
  };

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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {getDocumentTypeLabel(document.document_type)}
            </Text>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Document Image/PDF */}
            <View style={styles.section}>
              {isPDF ? (
                <TouchableOpacity
                  style={[styles.pdfContainer, { backgroundColor: theme.colors.card }]}
                  onPress={handleOpenPDF}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text" size={80} color="#FF0000" />
                  <Text style={[styles.pdfLabel, { color: theme.colors.text }]}>Documento PDF</Text>
                  <View style={styles.openButton}>
                    <Ionicons name="open-outline" size={20} color="#2196F3" />
                    <Text style={styles.openButtonText}>Abrir PDF con Zoom</Text>
                  </View>
                </TouchableOpacity>
              ) : decryptedData.imageUrl ? (
                <TouchableOpacity activeOpacity={0.9} onPress={() => setIsImageViewerVisible(true)}>
                  <Image source={{ uri: decryptedData.imageUrl }} style={styles.documentImage} />
                  <View style={styles.zoomHint}>
                    <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.zoomHintText}>Toca para ampliar</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.documentImage,
                    styles.imagePlaceholder,
                    { backgroundColor: theme.colors.card },
                  ]}
                >
                  <Ionicons name="image-outline" size={60} color={theme.colors.textMuted} />
                  <Text style={[styles.placeholderText, { color: theme.colors.textMuted }]}>
                    Cargando imagen...
                  </Text>
                </View>
              )}
            </View>

            {/* Document Details */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Detalles del Documento
              </Text>

              {/* Document Number */}
              <View style={[styles.detailCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.detailRow}>
                  <Ionicons name="key-outline" size={20} color={theme.colors.textMuted} />
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>
                      Número de Documento
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {decryptedData.documentNumber}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Issuing Country */}
              <View style={[styles.detailCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.detailRow}>
                  <Ionicons name="globe-outline" size={20} color={theme.colors.textMuted} />
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>
                      País Emisor
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {decryptedData.issuingCountry}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Issue Date */}
              <View style={[styles.detailCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.textMuted} />
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>
                      Fecha de Emisión
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {new Date(decryptedData.issueDate).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expiry Date */}
              <View style={[styles.detailCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.textMuted} />
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>
                      Fecha de Vencimiento
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {new Date(document.expiry_date).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Notes */}
              {decryptedData.notes && (
                <View style={[styles.detailCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={theme.colors.textMuted}
                    />
                    <View style={styles.detailInfo}>
                      <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>
                        Notas
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                        {decryptedData.notes}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Security Info */}
            <View style={styles.securityInfo}>
              <View style={styles.securityRow}>
                <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                <Text style={[styles.securityText, { color: theme.colors.textMuted }]}>
                  Este documento está encriptado de forma segura
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Image Viewer with Zoom - Cross-platform */}
        {!isPDF && decryptedData.imageUrl && (
          <ImageViewerCompat
            images={[{ uri: decryptedData.imageUrl }]}
            imageIndex={0}
            visible={isImageViewerVisible}
            onRequestClose={() => setIsImageViewerVisible(false)}
          />
        )}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  deleteButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  documentImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  pdfContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 12,
    gap: 12,
  },
  pdfLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(33, 150, 243, 0.1)' as const,
    borderRadius: 8,
    marginTop: 8,
  },
  openButtonText: {
    color: '#2196F3' as const,
    fontSize: 14,
    fontWeight: '600',
  },
  detailCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  securityInfo: {
    padding: 20,
    paddingTop: 0,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  zoomHint: {
    position: 'absolute' as const,
    bottom: 12,
    right: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  zoomHintText: {
    color: '#FFFFFF' as const,
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
