import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Platform,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  ViewStyle,
  TextStyle,
  ImageStyle
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '~/lib/supabase';

interface NewTripModalProps {
  visible: boolean;
  onClose: () => void;
  onTripCreated: (tripId: string) => void;
}

interface TripData {
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  isDateUncertain: boolean;
  budget: string;
  accommodation: string;
  transport: string;
}

const ACCOMMODATION_TYPES = [
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'hostel', label: 'Hostel', icon: '🏠' },
  { value: 'apartment', label: 'Apartamento', icon: '🏢' },
  { value: 'camping', label: 'Camping', icon: '⛺' },
  { value: 'other', label: 'Otro', icon: '🎯' },
];

const TRANSPORT_TYPES = [
  { value: 'car', label: 'Auto', icon: '🚗' },
  { value: 'plane', label: 'Avión', icon: '✈️' },
  { value: 'bus', label: 'Autobús', icon: '🚌' },
  { value: 'train', label: 'Tren', icon: '🚊' },
  { value: 'other', label: 'Otro', icon: '🎯' },
];

export default function NewTripModal({ visible, onClose, onTripCreated }: NewTripModalProps) {
  const [tripData, setTripData] = useState<TripData>({
    name: '',
    description: '',
    startDate: null,
    endDate: null,
    isDateUncertain: false,
    budget: '',
    accommodation: '',
    transport: '',
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showAccommodationPicker, setShowAccommodationPicker] = useState(false);
  const [showTransportPicker, setShowTransportPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const descriptionInputRef = React.useRef<TextInput>(null);

  const handleClose = () => {
    setTripData({
      name: '',
      description: '',
      startDate: null,
      endDate: null,
      isDateUncertain: false,
      budget: '',
      accommodation: '',
      transport: '',
    });
    onClose();
  };

  const validateForm = () => {
    if (!tripData.name.trim()) {
      Alert.alert('Error', 'El nombre del viaje es obligatorio');
      return false;
    }
    return true;
  };

  const handleCreateTrip = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para crear un viaje');
        return;
      }

      const tripToCreate = {
        name: tripData.name.trim(),
        description: tripData.description.trim() || null,
        start_date: tripData.startDate?.toISOString() || null,
        end_date: tripData.endDate?.toISOString() || null,
        is_date_uncertain: tripData.isDateUncertain,
        budget: tripData.budget ? parseFloat(tripData.budget) : null,
        accommodation_preference: tripData.accommodation || null,
        transport_preference: tripData.transport || null,
        user_id: user.id,
        status: 'planning',
        privacy: 'private',
      };

      const { data, error } = await supabase
        .from('trips')
        .insert([tripToCreate])
        .select('id')
        .single();

      if (error) throw error;

      onTripCreated(data.id);
      handleClose();
    } catch (error) {
      console.error('Error creating trip:', error);
      Alert.alert('Error', 'No se pudo crear el viaje. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const selectedAccommodation = ACCOMMODATION_TYPES.find(type => type.value === tripData.accommodation);
  const selectedTransport = TRANSPORT_TYPES.find(type => type.value === tripData.transport);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuevo Viaje</Text>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Nombre del viaje */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Nombre del Viaje <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Vacaciones en el sur"
              value={tripData.name}
              onChangeText={text => setTripData({ ...tripData, name: text })}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => descriptionInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          {/* Descripción */}
          <View style={styles.section}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Agrega una breve descripción (opcional)"
              value={tripData.description}
              onChangeText={text => setTripData({ ...tripData, description: text })}
              multiline
              numberOfLines={4}
              ref={descriptionInputRef}
            />
          </View>

          {/* Fechas del viaje */}
          <View style={styles.section}>
            <Text style={styles.label}>Fechas del Viaje</Text>

            <TouchableOpacity
              style={[styles.uncertainButton, tripData.isDateUncertain && styles.uncertainButtonActive]}
              onPress={() => setTripData({ ...tripData, isDateUncertain: !tripData.isDateUncertain })}
            >
              <Ionicons
                name={tripData.isDateUncertain ? "checkmark-circle" : "ellipse-outline"}
                size={20}
                color={tripData.isDateUncertain ? "#007AFF" : "#999"}
              />
              <Text style={[styles.uncertainButtonText, tripData.isDateUncertain && styles.uncertainButtonTextActive]}>
                No estoy seguro de las fechas
              </Text>
            </TouchableOpacity>

            {!tripData.isDateUncertain && (
              <View style={styles.dateContainer}>
                <TouchableOpacity
                  onPress={() => setShowStartDatePicker(true)}
                  style={styles.dateButton}
                >
                  <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                  <Text style={[styles.dateButtonText, !tripData.startDate && { color: '#999' }]}>
                    {tripData.startDate ? formatDate(tripData.startDate) : 'Fecha inicio'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowEndDatePicker(true)}
                  style={styles.dateButton}
                >
                  <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                  <Text style={[styles.dateButtonText, !tripData.endDate && { color: '#999' }]}>
                    {tripData.endDate ? formatDate(tripData.endDate) : 'Fecha fin'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Presupuesto */}
          <View style={styles.section}>
            <Text style={styles.label}>Presupuesto (opcional)</Text>
            <TextInput
              style={styles.textInput}
              value={tripData.budget}
              onChangeText={text => setTripData({ ...tripData, budget: text })}
              placeholder="Ej: 500000"
              keyboardType="numeric"
            />
          </View>

          {/* Alojamiento */}
          <View style={styles.section}>
            <Text style={styles.label}>Preferencias de Alojamiento</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowAccommodationPicker(true)}
            >
              <Text style={[styles.pickerButtonText, tripData.accommodation && styles.pickerButtonTextSelected]}>
                {selectedAccommodation ? `${selectedAccommodation.icon} ${selectedAccommodation.label}` : 'Seleccionar tipo'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Transporte */}
          <View style={styles.section}>
            <Text style={styles.label}>Preferencias de Transporte</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTransportPicker(true)}
            >
              <Text style={[styles.pickerButtonText, tripData.transport && styles.pickerButtonTextSelected]}>
                {selectedTransport ? `${selectedTransport.icon} ${selectedTransport.label}` : 'Seleccionar tipo'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Botón crear */}
          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateTrip}
            disabled={loading}
          >
            <LinearGradient
              colors={['#007AFF', '#5856D6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Creando...' : 'Crear Viaje'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Date Pickers para iOS */}
        {Platform.OS === 'ios' && showStartDatePicker && (
          <Modal animationType="slide" transparent={false}>
            <View style={styles.iosDatePickerContainer}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Fecha de Inicio</Text>
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Listo</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContent}>
                <DateTimePicker
                  value={tripData.startDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTripData({ ...tripData, startDate: selectedDate });
                    }
                  }}
                  style={styles.iosDatePicker}
                />
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === 'ios' && showEndDatePicker && (
          <Modal animationType="slide" transparent={false}>
            <View style={styles.iosDatePickerContainer}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Fecha de Fin</Text>
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Listo</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContent}>
                <DateTimePicker
                  value={tripData.endDate || tripData.startDate || new Date()}
                  mode="date"
                  display="spinner"
                  minimumDate={tripData.startDate || undefined}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTripData({ ...tripData, endDate: selectedDate });
                    }
                  }}
                  style={styles.iosDatePicker}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Date Pickers para Android */}
        {Platform.OS === 'android' && showStartDatePicker && (
          <DateTimePicker
            value={tripData.startDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setTripData({ ...tripData, startDate: selectedDate });
              }
            }}
          />
        )}

        {Platform.OS === 'android' && showEndDatePicker && (
          <DateTimePicker
            value={tripData.endDate || tripData.startDate || new Date()}
            mode="date"
            display="default"
            minimumDate={tripData.startDate || undefined}
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                setTripData({ ...tripData, endDate: selectedDate });
              }
            }}
          />
        )}

        {/* Picker de Alojamiento */}
        <Modal
          visible={showAccommodationPicker}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowAccommodationPicker(false)}>
                <Text style={styles.pickerCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Tipo de Alojamiento</Text>
              <View />
            </View>
            <ScrollView style={styles.pickerContent}>
              {ACCOMMODATION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.pickerOption, tripData.accommodation === type.value && styles.pickerOptionSelected]}
                  onPress={() => {
                    setTripData({ ...tripData, accommodation: type.value });
                    setShowAccommodationPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionIcon}>{type.icon}</Text>
                  <Text style={[styles.pickerOptionText, tripData.accommodation === type.value && styles.pickerOptionTextSelected]}>
                    {type.label}
                  </Text>
                  {tripData.accommodation === type.value && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {/* Picker de Transporte */}
        <Modal
          visible={showTransportPicker}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowTransportPicker(false)}>
                <Text style={styles.pickerCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Tipo de Transporte</Text>
              <View />
            </View>
            <ScrollView style={styles.pickerContent}>
              {TRANSPORT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.pickerOption, tripData.transport === type.value && styles.pickerOptionSelected]}
                  onPress={() => {
                    setTripData({ ...tripData, transport: type.value });
                    setShowTransportPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionIcon}>{type.icon}</Text>
                  <Text style={[styles.pickerOptionText, tripData.transport === type.value && styles.pickerOptionTextSelected]}>
                    {type.label}
                  </Text>
                  {tripData.transport === type.value && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styleObj = {
  container: { flex: 1, backgroundColor: '#F8F9FA' } as ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' } as ViewStyle,
  closeButton: { padding: 4 } as ViewStyle,
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' } as TextStyle,
  content: { flex: 1, paddingHorizontal: 20 } as ViewStyle,
  section: { marginTop: 24 } as ViewStyle,
  label: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 } as TextStyle,
  required: { color: '#FF3B30' } as TextStyle,
  textInput: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', color: '#1A1A1A' } as TextStyle,
  textArea: { height: 80, textAlignVertical: 'top' } as TextStyle,
  uncertainButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 } as ViewStyle,
  uncertainButtonActive: { borderColor: '#007AFF', backgroundColor: '#F0F8FF' } as ViewStyle,
  uncertainButtonText: { fontSize: 16, color: '#666', marginLeft: 8 } as TextStyle,
  uncertainButtonTextActive: { color: '#007AFF', fontWeight: '600' } as TextStyle,
  dateContainer: { flexDirection: 'row', gap: 12 } as ViewStyle,
  dateButton: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', minHeight: 56, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 } as ViewStyle,
  dateButtonText: { fontSize: 16, color: '#1A1A1A', marginLeft: 8, flex: 1, fontWeight: '500' } as TextStyle,
  pickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' } as ViewStyle,
  pickerButtonText: { fontSize: 16, color: '#999' } as TextStyle,
  pickerButtonTextSelected: { color: '#1A1A1A' } as TextStyle,
  createButton: { marginTop: 32, borderRadius: 16, overflow: 'hidden' } as ViewStyle,
  createButtonDisabled: { opacity: 0.6 } as ViewStyle,
  createButtonGradient: { padding: 18, alignItems: 'center' } as ViewStyle,
  createButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' } as TextStyle,
  pickerModal: { flex: 1, backgroundColor: '#F8F9FA' } as ViewStyle,
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' } as ViewStyle,
  pickerCancel: { fontSize: 16, color: '#007AFF' } as TextStyle,
  pickerTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' } as TextStyle,
  pickerContent: { flex: 1, paddingHorizontal: 20 } as ViewStyle,
  pickerOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB' } as ViewStyle,
  pickerOptionSelected: { borderColor: '#007AFF', backgroundColor: '#F0F8FF' } as ViewStyle,
  pickerOptionIcon: { fontSize: 20, marginRight: 12 } as TextStyle,
  pickerOptionText: { flex: 1, fontSize: 16, color: '#1A1A1A' } as TextStyle,
  pickerOptionTextSelected: { color: '#007AFF', fontWeight: '600' } as TextStyle,
  iosDatePickerContainer: { flex: 1, backgroundColor: '#1a237e', justifyContent: 'space-between' } as ViewStyle,
  iosDatePickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 15, backgroundColor: '#1a237e', borderBottomWidth: 0.5, borderBottomColor: '#3949ab' } as ViewStyle,
  datePickerContent: { flex: 1, backgroundColor: '#1a237e', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 0 } as ViewStyle,
  datePickerCancel: { fontSize: 17, color: '#ffffff' } as TextStyle,
  datePickerTitle: { fontSize: 17, fontWeight: '600', color: '#ffffff' } as TextStyle,
  datePickerDone: { fontSize: 17, color: '#ffffff', fontWeight: '600' } as TextStyle,
  iosDatePicker: { backgroundColor: '#1a237e', width: '95%', maxWidth: 400, alignSelf: 'center', transform: [{ scaleX: 1.1 }, { scaleY: 1.05 }] } as ViewStyle,
};

const styles = StyleSheet.create(styleObj);