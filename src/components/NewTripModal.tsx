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
  KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '~/lib/supabase';

interface NewTripModalProps {
  visible: boolean;
  onClose: () => void;
  onTripCreated: () => void;
}

interface TripData {
  title: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: string;
  accommodation: string;
  transport: string;
  isDateUncertain: boolean;
}

const { width, height } = Dimensions.get('window');

const accommodationTypes = [
  { label: 'Hotel', value: 'hotel', icon: '🏨' },
  { label: 'Cabaña', value: 'cabin', icon: '🏘️' },
  { label: 'Resort', value: 'resort', icon: '🏖️' },
  { label: 'Hostal', value: 'hostel', icon: '🏠' },
  { label: 'Apartamento', value: 'apartment', icon: '🏢' },
  { label: 'Camping', value: 'camping', icon: '⛺' },
  { label: 'Casa Rural', value: 'rural_house', icon: '🏡' },
  { label: 'Otro', value: 'other', icon: '🏨' }
];

const transportTypes = [
  { label: 'Auto', value: 'car', icon: '🚗' },
  { label: 'Avión', value: 'plane', icon: '✈️' },
  { label: 'Tren', value: 'train', icon: '🚂' },
  { label: 'Bus', value: 'bus', icon: '🚌' },
  { label: 'Metro', value: 'metro', icon: '🚇' },
  { label: 'Barco', value: 'boat', icon: '⛵' },
  { label: 'Bicicleta', value: 'bike', icon: '🚲' },
  { label: 'A pie', value: 'walking', icon: '🚶' },
  { label: 'Otro', value: 'other', icon: '🚗' }
];

export default function NewTripModal({ visible, onClose, onTripCreated }: NewTripModalProps) {
  const [tripData, setTripData] = useState<TripData>({
    title: '',
    description: '',
    startDate: null,
    endDate: null,
    budget: '',
    accommodation: '',
    transport: '',
    isDateUncertain: false
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showAccommodationPicker, setShowAccommodationPicker] = useState(false);
  const [showTransportPicker, setShowTransportPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setTripData({
      title: '',
      description: '',
      startDate: null,
      endDate: null,
      budget: '',
      accommodation: '',
      transport: '',
      isDateUncertain: false
    });
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    setShowAccommodationPicker(false);
    setShowTransportPicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    console.log('Start date change event:', event?.type, selectedDate);
    
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    
    if (event.type === 'dismissed' || event.type === 'neutralButtonPressed') {
      console.log('Start date picker dismissed');
      setShowStartDatePicker(false);
      return;
    }

    if (selectedDate && event.type === 'set') {
      console.log('Setting start date:', selectedDate);
      setTripData(prev => ({ ...prev, startDate: selectedDate }));
      // En iOS, el modal se cierra manualmente con los botones Done/Cancel
      if (Platform.OS === 'android') {
        setShowStartDatePicker(false);
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    console.log('End date change event:', event?.type, selectedDate);
    
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    
    if (event.type === 'dismissed' || event.type === 'neutralButtonPressed') {
      console.log('End date picker dismissed');
      setShowEndDatePicker(false);
      return;
    }

    if (selectedDate && event.type === 'set') {
      console.log('Setting end date:', selectedDate);
      setTripData(prev => ({ ...prev, endDate: selectedDate }));
      // En iOS, el modal se cierra manualmente con los botones Done/Cancel
      if (Platform.OS === 'android') {
        setShowEndDatePicker(false);
      }
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getAccommodationLabel = (value: string) => {
    const type = accommodationTypes.find(t => t.value === value);
    return type ? `${type.icon} ${type.label}` : '';
  };

  const getTransportLabel = (value: string) => {
    const type = transportTypes.find(t => t.value === value);
    return type ? `${type.icon} ${type.label}` : '';
  };

  const handleCreateTrip = async () => {
    if (!tripData.title.trim()) {
      Alert.alert('Error', 'El nombre del viaje es obligatorio');
      return;
    }

    if (!tripData.isDateUncertain && (!tripData.startDate || !tripData.endDate)) {
      Alert.alert('Error', 'Por favor selecciona las fechas del viaje o marca "Aún no estoy seguro"');
      return;
    }

    if (tripData.startDate && tripData.endDate && tripData.startDate > tripData.endDate) {
      Alert.alert('Error', 'La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }

    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        Alert.alert('Error', 'Debes estar autenticado para crear un viaje');
        return;
      }

      // Crear el viaje en Supabase
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.user.id,
          owner_id: user.user.id,
          title: tripData.title.trim(),
          description: tripData.description.trim() || null,
          start_date: tripData.isDateUncertain ? new Date() : tripData.startDate,
          end_date: tripData.isDateUncertain ? new Date() : tripData.endDate,
          budget: tripData.budget ? parseFloat(tripData.budget) : null,
          accommodation_preference: tripData.accommodation || null,
          transport_preference: tripData.transport || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating trip:', error);
        Alert.alert('Error', 'No se pudo crear el viaje. Intenta de nuevo.');
        return;
      }

      // Si tenemos datos adicionales, podríamos crear una tabla trip_details o similar
      // Por ahora, el viaje se crea con los campos básicos

      Alert.alert(
        'Éxito', 
        'Viaje creado exitosamente',
        [{ text: 'OK', onPress: () => {
          onTripCreated();
          handleClose();
        }}]
      );

    } catch (error) {
      console.error('Error creating trip:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

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
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nombre del Viaje */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Nombre del Viaje <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={tripData.title}
              onChangeText={(text) => setTripData(prev => ({ ...prev, title: text }))}
              placeholder="Ej: Aventura en Chile"
              placeholderTextColor="#999"
              maxLength={100}
            />
          </View>

          {/* Descripción */}
          <View style={styles.section}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={tripData.description}
              onChangeText={(text) => setTripData(prev => ({ ...prev, description: text }))}
              placeholder="Describe tu viaje..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {/* Fechas del Viaje */}
          <View style={styles.section}>
            <Text style={styles.label}>Fechas del Viaje</Text>
            
            {/* Botón "Aún no estoy seguro" */}
            <TouchableOpacity
              style={[styles.uncertainButton, tripData.isDateUncertain && styles.uncertainButtonActive]}
              onPress={() => setTripData(prev => ({ 
                ...prev, 
                isDateUncertain: !prev.isDateUncertain,
                startDate: null,
                endDate: null
              }))}
            >
              <Ionicons 
                name={tripData.isDateUncertain ? "checkmark-circle" : "help-circle-outline"} 
                size={20} 
                color={tripData.isDateUncertain ? "#007AFF" : "#666"} 
              />
              <Text style={[styles.uncertainButtonText, tripData.isDateUncertain && styles.uncertainButtonTextActive]}>
                Aún no estoy seguro
              </Text>
            </TouchableOpacity>

            {!tripData.isDateUncertain && (
              <View style={styles.dateContainer}>
                {/* Fecha de inicio */}
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    console.log('Start date button pressed');
                    setShowStartDatePicker(true);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                  <Text style={[styles.dateButtonText, !tripData.startDate && { color: '#999' }]}>
                    {tripData.startDate ? formatDate(tripData.startDate) : 'Seleccionar fecha de inicio'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#007AFF" />
                </TouchableOpacity>

                {/* Fecha de fin */}
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    console.log('End date button pressed');
                    setShowEndDatePicker(true);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                  <Text style={[styles.dateButtonText, !tripData.endDate && { color: '#999' }]}>
                    {tripData.endDate ? formatDate(tripData.endDate) : 'Seleccionar fecha de fin'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#007AFF" />
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
              onChangeText={(text) => {
                // Solo permitir números y punto decimal
                const cleanText = text.replace(/[^0-9.]/g, '');
                setTripData(prev => ({ ...prev, budget: cleanText }));
              }}
              placeholder="Ej: 150000"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          {/* Preferencias de Alojamiento */}
          <View style={styles.section}>
            <Text style={styles.label}>Preferencias de Alojamiento</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowAccommodationPicker(true)}
            >
              <Text style={[styles.pickerButtonText, tripData.accommodation && styles.pickerButtonTextSelected]}>
                {tripData.accommodation ? getAccommodationLabel(tripData.accommodation) : 'Seleccionar tipo de alojamiento'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Preferencias de Transporte */}
          <View style={styles.section}>
            <Text style={styles.label}>Preferencias de Transporte</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTransportPicker(true)}
            >
              <Text style={[styles.pickerButtonText, tripData.transport && styles.pickerButtonTextSelected]}>
                {tripData.transport ? getTransportLabel(tripData.transport) : 'Seleccionar tipo de transporte'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Botón Crear Viaje */}
          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateTrip}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#CCC', '#999'] : ['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Creando...' : 'Crear Viaje'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 50 }} />
        </ScrollView>

        {/* Date Pickers para iOS */}
        {showStartDatePicker && Platform.OS === 'ios' && (
          <Modal
            visible={showStartDatePicker}
            animationType="slide"
            presentationStyle="formSheet"
            transparent={false}
          >
            <View style={styles.iosDatePickerContainer}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('Start date picker cancelled');
                    setShowStartDatePicker(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.datePickerCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Fecha de Inicio</Text>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('Start date picker done');
                    setShowStartDatePicker(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.datePickerDone}>Listo</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContent}>
                <DateTimePicker
                  value={tripData.startDate || new Date()}
                  mode="date"
                  display="inline"
                  onChange={handleStartDateChange}
                  minimumDate={new Date()}
                  maximumDate={new Date(new Date().getFullYear() + 10, 11, 31)}
                  locale="es-ES"
                  style={styles.iosDatePicker}
                  textColor="#FFFFFF"
                  accentColor="#64B5F6"
                />
              </View>
            </View>
          </Modal>
        )}

        {showStartDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={tripData.startDate || new Date()}
            mode="date"
            display="default"
            onChange={handleStartDateChange}
            minimumDate={new Date()}
            maximumDate={new Date(new Date().getFullYear() + 10, 11, 31)}
          />
        )}

        {showEndDatePicker && Platform.OS === 'ios' && (
          <Modal
            visible={showEndDatePicker}
            animationType="slide"
            presentationStyle="formSheet"
            transparent={false}
          >
            <View style={styles.iosDatePickerContainer}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('End date picker cancelled');
                    setShowEndDatePicker(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.datePickerCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Fecha de Fin</Text>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('End date picker done');
                    setShowEndDatePicker(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.datePickerDone}>Listo</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContent}>
                <DateTimePicker
                  value={tripData.endDate || tripData.startDate || new Date()}
                  mode="date"
                  display="inline"
                  onChange={handleEndDateChange}
                  minimumDate={tripData.startDate || new Date()}
                  maximumDate={new Date(new Date().getFullYear() + 10, 11, 31)}
                  locale="es-ES"
                  style={styles.iosDatePicker}
                  textColor="#FFFFFF"
                  accentColor="#64B5F6"
                />
              </View>
            </View>
          </Modal>
        )}

        {showEndDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={tripData.endDate || tripData.startDate || new Date()}
            mode="date"
            display="default"
            onChange={handleEndDateChange}
            minimumDate={tripData.startDate || new Date()}
            maximumDate={new Date(new Date().getFullYear() + 10, 11, 31)}
          />
        )}

        {/* Accommodation Picker Modal */}
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
              <View style={{ width: 60 }} />
            </View>
            <ScrollView style={styles.pickerContent}>
              {accommodationTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.pickerOption, tripData.accommodation === type.value && styles.pickerOptionSelected]}
                  onPress={() => {
                    setTripData(prev => ({ ...prev, accommodation: type.value }));
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

        {/* Transport Picker Modal */}
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
              <View style={{ width: 60 }} />
            </View>
            <ScrollView style={styles.pickerContent}>
              {transportTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.pickerOption, tripData.transport === type.value && styles.pickerOptionSelected]}
                  onPress={() => {
                    setTripData(prev => ({ ...prev, transport: type.value }));
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1A1A1A',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  uncertainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  uncertainButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  uncertainButtonText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  uncertainButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1A1A1A',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#999',
  },
  pickerButtonTextSelected: {
    color: '#1A1A1A',
  },
  createButton: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  pickerModal: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  pickerContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  pickerOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  pickerOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  // Estilos para DatePicker en iOS
  iosDatePickerContainer: {
    flex: 1,
    backgroundColor: '#1a237e', // Azul marino oscuro
    justifyContent: 'space-between', // Distribuir espacio uniformemente
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Reducir padding superior
    paddingBottom: 15, // Reducir padding inferior
    backgroundColor: '#1a237e', // Azul marino oscuro
    borderBottomWidth: 0.5,
    borderBottomColor: '#3949ab', // Azul más claro para el borde
  },
  datePickerContent: {
    flex: 1,
    backgroundColor: '#1a237e', // Azul marino oscuro
    justifyContent: 'center', // Centrar el calendario verticalmente
    alignItems: 'center', // Centrar horizontalmente
    paddingVertical: 10, // Reducir padding vertical
    paddingHorizontal: 0, // Eliminar padding horizontal para máximo ancho
  },
  datePickerCancel: {
    fontSize: 17,
    color: '#ffffff', // Blanco para contraste
  },
  datePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff', // Blanco para contraste
  },
  datePickerDone: {
    fontSize: 17,
    color: '#ffffff', // Blanco para contraste
    fontWeight: '600',
  },
  iosDatePicker: {
    backgroundColor: '#1a237e', // Azul marino oscuro
    width: '95%', // Usar casi todo el ancho disponible
    maxWidth: 400, // Límite máximo para pantallas grandes
    alignSelf: 'center', // Centrar el calendario
    transform: [{ scaleX: 1.1 }, { scaleY: 1.05 }], // Escalar para mejor uso del espacio
  },
});
