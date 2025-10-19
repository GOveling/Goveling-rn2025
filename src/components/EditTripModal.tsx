import React, { useState, useEffect } from 'react';

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
} from 'react-native';

// import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { COLORS } from '~/constants/colors';
import { supabase } from '~/lib/supabase';
import { triggerGlobalTripRefresh } from '~/lib/tripRefresh';

// Helper function to format date as YYYY-MM-DD in local timezone
const formatDateForStorage = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to parse date as local time instead of UTC
const parseLocalDate = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T00:00:00');
  }
  return new Date(dateString);
};

interface TripData {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  user_id: string;
  owner_id?: string;
  budget?: number;
  accommodation_preference?: string;
  transport_preference?: string;
  has_defined_dates?: boolean;
  timezone?: string;
  created_at: string;
  updated_at?: string;
}

interface EditTripModalProps {
  visible: boolean;
  onClose: () => void;
  trip: TripData;
  onTripUpdated: (updatedTrip: TripData) => void;
}

interface EditableTripData {
  title: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: string;
  accommodation: string[];
  transport: string[];
  isDateUncertain: boolean;
  hasNoDates: boolean;
}

// const { width, height } = Dimensions.get('window');

const accommodationTypes = [
  { label: 'Hotel', value: 'hotel', icon: '🏨' },
  { label: 'Cabaña', value: 'cabin', icon: '🏘️' },
  { label: 'Resort', value: 'resort', icon: '🏖️' },
  { label: 'Hostal', value: 'hostel', icon: '🏠' },
  { label: 'Apartamento', value: 'apartment', icon: '🏢' },
  { label: 'Camping', value: 'camping', icon: '⛺' },
  { label: 'Casa Rural', value: 'rural_house', icon: '🏡' },
  { label: 'Otro', value: 'other', icon: '🏨' },
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
  { label: 'Otro', value: 'other', icon: '🚗' },
];

export default function EditTripModal({
  visible,
  onClose,
  trip,
  onTripUpdated,
}: EditTripModalProps) {
  const [tripData, setTripData] = useState<EditableTripData>({
    title: '',
    description: '',
    startDate: null,
    endDate: null,
    budget: '',
    accommodation: [],
    transport: [],
    isDateUncertain: false,
    hasNoDates: false,
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showAccommodationPicker, setShowAccommodationPicker] = useState(false);
  const [showTransportPicker, setShowTransportPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cargar datos del viaje cuando se abre el modal
  useEffect(() => {
    if (visible && trip) {
      // Convertir string separado por comas a array para múltiples selecciones
      const accommodationArray = trip.accommodation_preference
        ? trip.accommodation_preference.split(',').map((item) => item.trim())
        : [];
      const transportArray = trip.transport_preference
        ? trip.transport_preference.split(',').map((item) => item.trim())
        : [];

      setTripData({
        title: trip.title || '',
        description: trip.description || '',
        startDate: trip.start_date ? parseLocalDate(trip.start_date) : null,
        endDate: trip.end_date ? parseLocalDate(trip.end_date) : null,
        budget: trip.budget ? trip.budget.toString() : '',
        accommodation: accommodationArray,
        transport: transportArray,
        isDateUncertain: false,
        hasNoDates: !trip.start_date || !trip.end_date,
      });
    }
  }, [visible, trip]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    console.log('🎯 EditTripModal.handleSave: FUNCTION CALLED - ENTRY POINT');
    if (!tripData.title.trim()) {
      Alert.alert('Error', 'El título del viaje es obligatorio');
      return;
    }

    // Solo validar fechas si no está marcado como "sin fechas"
    if (!tripData.hasNoDates) {
      if (!tripData.startDate || !tripData.endDate) {
        Alert.alert(
          'Error',
          'Las fechas de inicio y fin son obligatorias, o marca la opción "Sin fechas"'
        );
        return;
      }

      if (tripData.startDate >= tripData.endDate) {
        Alert.alert('Error', 'La fecha de inicio debe ser anterior a la fecha de fin');
        return;
      }
    }

    setLoading(true);

    try {
      const updateData = {
        title: tripData.title.trim(),
        description: tripData.description.trim() || null,
        start_date: tripData.hasNoDates
          ? null
          : tripData.startDate
            ? formatDateForStorage(tripData.startDate)
            : null,
        end_date: tripData.hasNoDates
          ? null
          : tripData.endDate
            ? formatDateForStorage(tripData.endDate)
            : null,
        budget: tripData.budget ? parseFloat(tripData.budget) : null,
        accommodation_preference:
          tripData.accommodation.length > 0 ? tripData.accommodation.join(', ') : null,
        transport_preference: tripData.transport.length > 0 ? tripData.transport.join(', ') : null,
        has_defined_dates: !tripData.hasNoDates,
        updated_at: new Date().toISOString(),
      };

      // 1) Try SECURITY DEFINER RPC to allow owners and editors under RLS
      let data: unknown | null = null;
      let rpcError: unknown | null = null;

      console.log('📝 EditTripModal.handleSave: Preparing update data:', {
        tripId: trip.id,
        title: updateData.title,
        startDate: updateData.start_date,
        endDate: updateData.end_date,
        budget: updateData.budget,
      });

      try {
        console.log('🔄 EditTripModal.handleSave: Calling update_trip_details RPC...');
        const { data: rpcData, error: rpcErr } = await supabase.rpc('update_trip_details', {
          p_trip_id: trip.id,
          p_title: updateData.title,
          p_description: updateData.description,
          p_start_date: updateData.start_date,
          p_end_date: updateData.end_date,
          p_budget: updateData.budget,
          p_accommodation: updateData.accommodation_preference,
          p_transport: updateData.transport_preference,
        });
        rpcError = rpcErr;

        if (rpcErr) {
          console.error('❌ EditTripModal.handleSave: RPC error:', {
            code: (rpcErr as unknown as { code?: string })?.code,
            message: (rpcErr as unknown as { message?: string })?.message,
            details: rpcErr,
          });
        }

        if (!rpcErr && rpcData) {
          console.log('✅ EditTripModal.handleSave: RPC succeeded, data:', rpcData);
          data = rpcData;
        } else {
          console.warn('⚠️  EditTripModal.handleSave: RPC returned no data:', { rpcData, rpcErr });
        }
      } catch (e) {
        console.error('❌ EditTripModal.handleSave: RPC exception:', e);
        rpcError = e;
      }

      // 2) Fallback to direct update if RPC not available (older DBs)
      if (!data) {
        console.log('🔄 EditTripModal.handleSave: Falling back to direct update...');
        const { data: directData, error: directError } = await supabase
          .from('trips')
          .update(updateData)
          .eq('id', trip.id)
          .select()
          .single();

        if (directError) {
          console.error('❌ EditTripModal.handleSave: Direct update error:', {
            rpcError: rpcError ? JSON.stringify(rpcError) : 'none',
            directError: JSON.stringify(directError),
          });
          Alert.alert('Error', 'No se pudo actualizar el viaje. Inténtalo de nuevo.');
          return;
        }

        console.log('✅ EditTripModal.handleSave: Direct update succeeded');
        data = directData;
      }

      // 3) Call onTripUpdated immediately to sync parent component state
      if (data) {
        const tripData = data as TripData;
        console.log('📤 EditTripModal.handleSave: Calling onTripUpdated with data:', {
          id: tripData.id,
          title: tripData.title,
          start_date: tripData.start_date,
          end_date: tripData.end_date,
          budget: tripData.budget,
        });
        onTripUpdated(tripData);

        // Trigger global trip refresh for CurrentTripCard
        console.log('🔄 EditTripModal: Trip updated, triggering global refresh');
        triggerGlobalTripRefresh();
      }

      Alert.alert('¡Éxito!', 'El viaje ha sido actualizado correctamente', [
        {
          text: 'OK',
          onPress: () => {
            handleClose();
          },
        },
      ]);
    } catch (error) {
      console.error('Error updating trip:', error);
      Alert.alert('Error', 'Hubo un problema al actualizar el viaje');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async () => {
    Alert.alert(
      'Eliminar Viaje',
      '¿Estás seguro de que quieres eliminar este viaje? Esta acción es irreversible y eliminará todos los datos relacionados (lugares guardados, colaboradores, etc.).',
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

              // Estrategia de eliminación lógica: cambiar status a 'cancelled'
              const { error } = await supabase
                .from('trips')
                .update({
                  status: 'cancelled',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', trip.id);

              if (error) {
                console.error('Error deleting trip:', error);
                Alert.alert('Error', 'No se pudo eliminar el viaje. Inténtalo de nuevo.');
                return;
              }

              Alert.alert('Éxito', 'El viaje ha sido eliminado exitosamente.');
              onClose();

              // Opcional: Llamar callback para refrescar la lista de trips
              if (onTripUpdated) {
                onTripUpdated({ ...trip, status: 'cancelled' });
              }
            } catch (error) {
              console.error('Error deleting trip:', error);
              Alert.alert('Error', 'Ocurrió un error inesperado.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Seleccionar fecha';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getAccommodationLabel = (values: string[]) => {
    if (values.length === 0) return 'Seleccionar alojamiento';
    if (values.length === 1) {
      const accommodation = accommodationTypes.find((a) => a.value === values[0]);
      return accommodation
        ? `${accommodation.icon} ${accommodation.label}`
        : 'Seleccionar alojamiento';
    }
    return `${values.length} tipos de alojamiento seleccionados`;
  };

  const getTransportLabel = (values: string[]) => {
    if (values.length === 0) return 'Seleccionar transporte';
    if (values.length === 1) {
      const transport = transportTypes.find((t) => t.value === values[0]);
      return transport ? `${transport.icon} ${transport.label}` : 'Seleccionar transporte';
    }
    return `${values.length} tipos de transporte seleccionados`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Editar Viaje</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            >
              <Text style={[styles.saveButtonText, loading && styles.saveButtonTextDisabled]}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Título */}
            <View style={styles.section}>
              <Text style={styles.label}>Título del Viaje</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Viaje a París"
                value={tripData.title}
                onChangeText={(text) => setTripData((prev) => ({ ...prev, title: text }))}
                maxLength={100}
              />
            </View>

            {/* Descripción */}
            <View style={styles.section}>
              <Text style={styles.label}>Descripción (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe tu viaje..."
                value={tripData.description}
                onChangeText={(text) => setTripData((prev) => ({ ...prev, description: text }))}
                multiline={true}
                numberOfLines={4}
                maxLength={500}
              />
            </View>

            {/* Fechas */}
            <View style={styles.section}>
              <Text style={styles.label}>Fechas del Viaje</Text>

              {/* Opción "Sin fechas" */}
              <TouchableOpacity
                style={[styles.checkboxContainer, tripData.hasNoDates && styles.checkboxSelected]}
                onPress={() => setTripData((prev) => ({ ...prev, hasNoDates: !prev.hasNoDates }))}
              >
                <View style={[styles.checkbox, tripData.hasNoDates && styles.checkboxChecked]}>
                  {tripData.hasNoDates && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxText}>Aún no he decidido las fechas</Text>
              </TouchableOpacity>

              {!tripData.hasNoDates && (
                <View style={styles.dateContainer}>
                  <TouchableOpacity
                    style={[styles.dateButton, styles.dateButtonStart]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                    <Text style={styles.dateButtonText}>{formatDate(tripData.startDate)}</Text>
                  </TouchableOpacity>

                  <View style={styles.dateSeparator}>
                    <Ionicons name="arrow-forward" size={20} color="#666" />
                  </View>

                  <TouchableOpacity
                    style={[styles.dateButton, styles.dateButtonEnd]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                    <Text style={styles.dateButtonText}>{formatDate(tripData.endDate)}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Presupuesto */}
            <View style={styles.section}>
              <Text style={styles.label}>Presupuesto (Opcional)</Text>
              <View style={styles.budgetContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="0"
                  value={tripData.budget}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9.]/g, '');
                    setTripData((prev) => ({ ...prev, budget: numericText }));
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Alojamiento */}
            <View style={styles.section}>
              <Text style={styles.label}>Tipo de Alojamiento Preferido</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowAccommodationPicker(true)}
              >
                <Text style={styles.pickerText}>
                  {getAccommodationLabel(tripData.accommodation)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Transporte */}
            <View style={styles.section}>
              <Text style={styles.label}>Tipo de Transporte Preferido</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowTransportPicker(true)}>
                <Text style={styles.pickerText}>{getTransportLabel(tripData.transport)}</Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={{ height: 50 }} />
          </ScrollView>

          {/* Botón Eliminar Viaje */}
          <View style={styles.deleteSection}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteTrip}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={styles.deleteButtonText}>Eliminar Viaje</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={tripData.startDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setTripData((prev) => ({ ...prev, startDate: selectedDate }));
              }
            }}
            minimumDate={new Date()}
            // Mejorar contraste en iOS
            textColor={Platform.OS === 'ios' ? COLORS.utility.black : undefined}
            style={Platform.OS === 'ios' ? { backgroundColor: COLORS.utility.white } : undefined}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={tripData.endDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                setTripData((prev) => ({ ...prev, endDate: selectedDate }));
              }
            }}
            minimumDate={tripData.startDate || new Date()}
            // Mejorar contraste en iOS
            textColor={Platform.OS === 'ios' ? COLORS.utility.black : undefined}
            style={Platform.OS === 'ios' ? { backgroundColor: COLORS.utility.white } : undefined}
          />
        )}

        {/* Accommodation Picker */}
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
              <TouchableOpacity onPress={() => setShowAccommodationPicker(false)}>
                <Text style={styles.pickerDone}>Listo</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {accommodationTypes.map((accommodation) => (
                <TouchableOpacity
                  key={accommodation.value}
                  style={[
                    styles.pickerItem,
                    tripData.accommodation.includes(accommodation.value) &&
                      styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setTripData((prev) => ({
                      ...prev,
                      accommodation: prev.accommodation.includes(accommodation.value)
                        ? prev.accommodation.filter((item) => item !== accommodation.value)
                        : [...prev.accommodation, accommodation.value],
                    }));
                  }}
                >
                  <Text style={styles.pickerItemIcon}>{accommodation.icon}</Text>
                  <Text style={styles.pickerItemText}>{accommodation.label}</Text>
                  {tripData.accommodation.includes(accommodation.value) && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {/* Transport Picker */}
        <Modal visible={showTransportPicker} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowTransportPicker(false)}>
                <Text style={styles.pickerCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Tipo de Transporte</Text>
              <TouchableOpacity onPress={() => setShowTransportPicker(false)}>
                <Text style={styles.pickerDone}>Listo</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {transportTypes.map((transport) => (
                <TouchableOpacity
                  key={transport.value}
                  style={[
                    styles.pickerItem,
                    tripData.transport.includes(transport.value) && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setTripData((prev) => ({
                      ...prev,
                      transport: prev.transport.includes(transport.value)
                        ? prev.transport.filter((item) => item !== transport.value)
                        : [...prev.transport, transport.value],
                    }));
                  }}
                >
                  <Text style={styles.pickerItemIcon}>{transport.icon}</Text>
                  <Text style={styles.pickerItemText}>{transport.label}</Text>
                  {tripData.transport.includes(transport.value) && (
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
  budgetContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.utility.white,
    borderColor: COLORS.border.gray,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  budgetInput: {
    color: COLORS.text.mediumDarkGray,
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  cancelButton: {
    padding: 8,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: COLORS.utility.white,
    borderColor: COLORS.border.gray,
    borderRadius: 4,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginRight: 12,
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: COLORS.status.info,
    borderColor: COLORS.status.info,
  },
  checkboxContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.utility.white,
    borderColor: COLORS.border.gray,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  checkboxSelected: {
    backgroundColor: COLORS.background.purple.ultraLight,
    borderColor: COLORS.status.info,
  },
  checkboxText: {
    color: COLORS.text.mediumDarkGray,
    fontSize: 16,
    fontWeight: '500',
  },
  container: {
    backgroundColor: COLORS.utility.white,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currencySymbol: {
    color: COLORS.text.mediumDarkGray,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  dateButton: {
    alignItems: 'center',
    backgroundColor: COLORS.utility.white,
    borderColor: COLORS.border.gray,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateButtonEnd: {
    borderBottomRightRadius: 12,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
  },
  dateButtonStart: {
    borderBottomLeftRadius: 12,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
  },
  dateButtonText: {
    color: COLORS.text.mediumDarkGray,
    fontSize: 16,
    marginLeft: 8,
  },
  dateContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dateSeparator: {
    backgroundColor: COLORS.background.tertiary,
    borderBottomWidth: 1,
    borderColor: COLORS.border.gray,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: COLORS.status.errorLight,
    borderColor: COLORS.status.errorLight,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  deleteButtonText: {
    color: COLORS.status.errorDark,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteSection: {
    backgroundColor: COLORS.utility.white,
    borderTopColor: COLORS.border.dark,
    borderTopWidth: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: COLORS.border.dark,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerTitle: {
    color: COLORS.text.darkGray,
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.utility.white,
    borderColor: COLORS.border.gray,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    color: COLORS.text.mediumDarkGray,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  picker: {
    alignItems: 'center',
    backgroundColor: COLORS.utility.white,
    borderColor: COLORS.border.gray,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerCancel: {
    color: COLORS.text.tertiary,
    fontSize: 16,
  },
  pickerDone: {
    color: COLORS.status.info,
    fontSize: 16,
    fontWeight: '600',
  },
  pickerHeader: {
    alignItems: 'center',
    borderBottomColor: COLORS.border.dark,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  pickerItem: {
    alignItems: 'center',
    borderBottomColor: COLORS.background.gray,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 16,
  },
  pickerItemIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  pickerItemSelected: {
    backgroundColor: COLORS.background.purple.ultraLight,
  },
  pickerItemText: {
    color: COLORS.text.mediumDarkGray,
    flex: 1,
    fontSize: 16,
  },
  pickerList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pickerModal: {
    backgroundColor: COLORS.utility.white,
    flex: 1,
  },
  pickerText: {
    color: COLORS.text.mediumDarkGray,
    fontSize: 16,
  },
  pickerTitle: {
    color: COLORS.text.darkGray,
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.status.info,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.border.gray,
  },
  saveButtonText: {
    color: COLORS.utility.white,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: COLORS.text.lightGray,
  },
  section: {
    marginBottom: 24,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
