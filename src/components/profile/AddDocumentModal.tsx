import React, { useState } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '~/lib/theme';
import { DocumentType } from '~/types/travelDocuments';

interface AddDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (documentData: DocumentFormData) => Promise<void>;
}

export interface DocumentFormData {
  type: DocumentType;
  documentNumber: string;
  issuingCountry: string;
  issueDate: Date;
  expiryDate: Date;
  imageUri: string;
  fileType: 'image' | 'pdf';
  notes?: string;
}

const DOCUMENT_TYPES: Array<{ value: DocumentType; label: string; icon: string }> = [
  { value: DocumentType.PASSPORT, label: 'Pasaporte', icon: 'airplane' },
  { value: DocumentType.VISA, label: 'Visa', icon: 'document-text' },
  { value: DocumentType.ID_CARD, label: 'Cédula de Identidad', icon: 'card' },
  { value: DocumentType.DRIVER_LICENSE, label: 'Licencia de Conducir', icon: 'car' },
  { value: DocumentType.VACCINATION, label: 'Certificado de Vacuna', icon: 'medical' },
  { value: DocumentType.INSURANCE, label: 'Seguro de Viaje', icon: 'shield-checkmark' },
  { value: DocumentType.OTHER, label: 'Otro', icon: 'document' },
];

export default function AddDocumentModal({ visible, onClose, onSave }: AddDocumentModalProps) {
  const theme = useTheme();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const notesInputRef = React.useRef<TextInput>(null);

  // Form state
  const [selectedType, setSelectedType] = useState<DocumentType>(DocumentType.PASSPORT);
  const [documentNumber, setDocumentNumber] = useState('');
  const [issuingCountry, setIssuingCountry] = useState('');
  const [issueDate, setIssueDate] = useState(new Date());
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 año
  );
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image'); // Tipo de archivo
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Date picker state
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);

  const handleClose = () => {
    // Reset form
    setSelectedType(DocumentType.PASSPORT);
    setDocumentNumber('');
    setIssuingCountry('');
    setIssueDate(new Date());
    setExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
    setImageUri(null);
    setNotes('');
    onClose();
  };

  const handlePickImage = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu galería para seleccionar una imagen del documento.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as ImagePicker.MediaTypeOptions,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Compress image
        const compressedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1200 } }], // Max width 1200px
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        setImageUri(compressedImage.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request camera permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu cámara para tomar una foto del documento.'
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Compress image
        const compressedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        setImageUri(compressedImage.uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handlePickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setFileType('pdf');
      }
    } catch (error) {
      console.error('Error picking PDF:', error);
      Alert.alert('Error', 'No se pudo seleccionar el PDF');
    }
  };

  const handleImageOptions = () => {
    Alert.alert('Seleccionar documento', 'Elige cómo quieres agregar el documento:', [
      { text: 'Tomar foto', onPress: handleTakePhoto },
      { text: 'Imagen desde galería', onPress: handlePickImage },
      { text: 'PDF desde archivos', onPress: handlePickPDF },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const validateForm = (): boolean => {
    if (!documentNumber.trim()) {
      Alert.alert('Campo requerido', 'Debes ingresar el número de documento');
      return false;
    }

    if (!issuingCountry.trim()) {
      Alert.alert('Campo requerido', 'Debes ingresar el país emisor');
      return false;
    }

    if (!imageUri) {
      Alert.alert('Imagen requerida', 'Debes agregar una foto del documento');
      return false;
    }

    if (expiryDate <= issueDate) {
      Alert.alert('Fechas inválidas', 'La fecha de expiración debe ser posterior a la emisión');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const documentData: DocumentFormData = {
        type: selectedType,
        documentNumber: documentNumber.trim(),
        issuingCountry: issuingCountry.trim(),
        issueDate,
        expiryDate,
        imageUri: imageUri!,
        fileType,
        notes: notes.trim() || undefined,
      };

      await onSave(documentData);
      handleClose();
    } catch (error) {
      console.error('Error saving document:', error);
      Alert.alert('Error', 'No se pudo guardar el documento. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleNotesFocus = () => {
    // Measure the notes input position and scroll to it with extra offset for keyboard
    setTimeout(() => {
      notesInputRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y, width, height) => {
          // Scroll to the input position with extra space for the keyboard
          // Add 200px extra to ensure it's well above the keyboard
          scrollViewRef.current?.scrollTo({
            y: y + height + 200,
            animated: true,
          });
        },
        () => {
          // Fallback: just scroll to the end if measurement fails
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      );
    }, 300); // Increased timeout to let keyboard animation complete
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Agregar Documento</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={styles.saveButton}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#2196F3" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Document Type Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Tipo de Documento
            </Text>
            <View style={styles.typeGrid}>
              {DOCUMENT_TYPES.map((docType) => (
                <TouchableOpacity
                  key={docType.value}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: selectedType === docType.value ? '#2196F3' : theme.colors.border,
                      borderWidth: selectedType === docType.value ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedType(docType.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={docType.icon as any}
                    size={24}
                    color={selectedType === docType.value ? '#2196F3' : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      {
                        color: selectedType === docType.value ? '#2196F3' : theme.colors.textMuted,
                      },
                    ]}
                  >
                    {docType.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Document Number */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Número de Documento *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={documentNumber}
              onChangeText={setDocumentNumber}
              placeholder="Ej: AB123456"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="characters"
            />
          </View>

          {/* Issuing Country */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>País Emisor *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={issuingCountry}
              onChangeText={setIssuingCountry}
              placeholder="Ej: Chile, Argentina, España"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          {/* Issue Date */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Fecha de Emisión
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setShowIssueDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#2196F3" />
              <Text style={[styles.dateText, { color: theme.colors.text }]}>
                {formatDate(issueDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Expiry Date */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Fecha de Expiración
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setShowExpiryDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#2196F3" />
              <Text style={[styles.dateText, { color: theme.colors.text }]}>
                {formatDate(expiryDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Document Image/PDF */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Documento (Imagen o PDF) *
            </Text>
            <TouchableOpacity
              style={[
                styles.imagePickerButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={handleImageOptions}
            >
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  {fileType === 'pdf' ? (
                    <View style={styles.pdfPreview}>
                      <Ionicons name="document-text" size={60} color="#FF0000" />
                      <Text style={[styles.pdfLabel, { color: theme.colors.text }]}>
                        PDF adjunto
                      </Text>
                    </View>
                  ) : (
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  )}
                  <TouchableOpacity style={styles.changeImageButton} onPress={handleImageOptions}>
                    <Ionicons name="pencil" size={16} color="#FFFFFF" />
                    <Text style={styles.changeImageText}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePickerContent}>
                  <Ionicons name="camera" size={40} color={theme.colors.textMuted} />
                  <Text style={[styles.imagePickerText, { color: theme.colors.text }]}>
                    Agregar documento
                  </Text>
                  <Text style={[styles.imagePickerSubtext, { color: theme.colors.textMuted }]}>
                    Foto, imagen o PDF del documento
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Notes (Optional) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Notas (Opcional)
            </Text>
            <TextInput
              ref={notesInputRef}
              style={[
                styles.input,
                styles.notesInput,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              onFocus={handleNotesFocus}
              placeholder="Agrega notas adicionales sobre este documento..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Issue Date Picker Modal */}
      <Modal
        visible={showIssueDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIssueDatePicker(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View
            style={[styles.datePickerModalContent, { backgroundColor: theme.colors.background }]}
          >
            <View
              style={[
                styles.datePickerHeader,
                { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
              ]}
            >
              <TouchableOpacity onPress={() => setShowIssueDatePicker(false)}>
                <Text style={[styles.pickerCancel, { color: theme.colors.textMuted }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>
                Fecha de Emisión
              </Text>
              <TouchableOpacity onPress={() => setShowIssueDatePicker(false)}>
                <Text style={[styles.pickerDone, { color: '#2196F3' }]}>Listo</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={issueDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setIssueDate(selectedDate);
                  }
                }}
                maximumDate={new Date()}
                textColor={theme.colors.text}
                style={styles.datePickerSpinner}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Expiry Date Picker Modal */}
      <Modal
        visible={showExpiryDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExpiryDatePicker(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View
            style={[styles.datePickerModalContent, { backgroundColor: theme.colors.background }]}
          >
            <View
              style={[
                styles.datePickerHeader,
                { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
              ]}
            >
              <TouchableOpacity onPress={() => setShowExpiryDatePicker(false)}>
                <Text style={[styles.pickerCancel, { color: theme.colors.textMuted }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>
                Fecha de Expiración
              </Text>
              <TouchableOpacity onPress={() => setShowExpiryDatePicker(false)}>
                <Text style={[styles.pickerDone, { color: '#2196F3' }]}>Listo</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setExpiryDate(selectedDate);
                  }
                }}
                minimumDate={issueDate}
                textColor={theme.colors.text}
                style={styles.datePickerSpinner}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomSpacer: {
    height: 40,
  },
  changeImageButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.9)' as const,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  changeImageText: {
    color: '#FFFFFF' as const,
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    width: 40,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  datePickerContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 10,
    paddingTop: 0,
  },
  datePickerHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  datePickerModalContent: {
    borderRadius: 16,
    maxWidth: 500,
    overflow: 'hidden',
    width: '100%',
  },
  datePickerOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)' as const,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  datePickerSpinner: {
    width: '100%',
  },
  dateButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateText: {
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  imagePickerButton: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 200,
    overflow: 'hidden',
  },
  imagePickerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  imagePickerSubtext: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  imagePreview: {
    borderRadius: 12,
    height: '100%',
    width: '100%',
  },
  imagePreviewContainer: {
    height: 300,
    position: 'relative',
    width: '100%',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notesInput: {
    height: 100,
    paddingTop: 14,
  },
  pickerCancel: {
    color: '#6B7280' as const,
    fontSize: 16,
  },
  pickerDone: {
    color: '#2196F3' as const,
    fontSize: 16,
    fontWeight: '600',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    alignItems: 'center',
    minWidth: 60,
  },
  saveButtonText: {
    color: '#2196F3' as const,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  typeCard: {
    alignItems: 'center',
    borderRadius: 12,
    gap: 8,
    padding: 16,
    width: '48%',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  pdfPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 200,
    gap: 8,
  },
  pdfLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});
