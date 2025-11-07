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

import { supabase } from '~/lib/supabase';
import { useTheme } from '~/lib/theme';
import { triggerGlobalTripRefresh } from '~/lib/tripRefresh';
import { tripsApi } from '~/store/api/tripsApi';
import { useAppDispatch } from '~/store/hooks';

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
  const theme = useTheme();
  const dispatch = useAppDispatch();
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

        // Also invalidate RTK Query cache for immediate updates
        console.log('🔄 EditTripModal: Invalidating RTK Query cache');
        dispatch(
          tripsApi.util.invalidateTags([
            'TripBreakdown',
            'Trips',
            { type: 'TripDetails', id: trip.id },
          ])
        );
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
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Editar Viaje</Text>
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
              <Text style={[styles.label, { color: theme.colors.text }]}>Título del Viaje</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Ej: Viaje a París"
                placeholderTextColor={theme.colors.textMuted}
                value={tripData.title}
                onChangeText={(text) => setTripData((prev) => ({ ...prev, title: text }))}
                maxLength={100}
              />
            </View>

            {/* Descripción */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Descripción (Opcional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Describe tu viaje..."
                placeholderTextColor={theme.colors.textMuted}
                value={tripData.description}
                onChangeText={(text) => setTripData((prev) => ({ ...prev, description: text }))}
                multiline={true}
                numberOfLines={4}
                maxLength={500}
              />
            </View>

            {/* Fechas */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Fechas del Viaje</Text>

              {/* Opción "Sin fechas" */}
              <TouchableOpacity
                style={[
                  styles.checkboxContainer,
                  tripData.hasNoDates && styles.checkboxSelected,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                onPress={() => setTripData((prev) => ({ ...prev, hasNoDates: !prev.hasNoDates }))}
              >
                <View
                  style={[
                    styles.checkbox,
                    tripData.hasNoDates && styles.checkboxChecked,
                    { borderColor: theme.colors.border },
                  ]}
                >
                  {tripData.hasNoDates && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={[styles.checkboxText, { color: theme.colors.text }]}>
                  Aún no he decidido las fechas
                </Text>
              </TouchableOpacity>

              {!tripData.hasNoDates && (
                <View style={styles.dateContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dateButton,
                      styles.dateButtonStart,
                      { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                    ]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textMuted} />
                    <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                      {formatDate(tripData.startDate)}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.dateSeparator}>
                    <Ionicons name="arrow-forward" size={20} color={theme.colors.textMuted} />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.dateButton,
                      styles.dateButtonEnd,
                      { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                    ]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textMuted} />
                    <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                      {formatDate(tripData.endDate)}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Presupuesto */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Presupuesto (Opcional)
              </Text>
              <View
                style={[
                  styles.budgetContainer,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.currencySymbol, { color: theme.colors.textMuted }]}>$</Text>
                <TextInput
                  style={[styles.budgetInput, { color: theme.colors.text }]}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
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
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Tipo de Alojamiento Preferido
              </Text>
              <TouchableOpacity
                style={[
                  styles.picker,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                onPress={() => setShowAccommodationPicker(true)}
              >
                <Text style={[styles.pickerText, { color: theme.colors.text }]}>
                  {getAccommodationLabel(tripData.accommodation)}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Transporte */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Tipo de Transporte Preferido
              </Text>
              <TouchableOpacity
                style={[
                  styles.picker,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                onPress={() => setShowTransportPicker(true)}
              >
                <Text style={[styles.pickerText, { color: theme.colors.text }]}>
                  {getTransportLabel(tripData.transport)}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ height: 50 }} />
          </ScrollView>

          {/* Botón Eliminar Viaje */}
          <View
            style={[
              styles.deleteSection,
              { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteTrip}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={styles.deleteButtonText}>Eliminar Viaje</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Start Date Picker Modal */}
        <Modal
          visible={showStartDatePicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowStartDatePicker(false)}
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
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Text style={[styles.pickerCancel, { color: theme.colors.textMuted }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>
                  Fecha de Inicio
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowStartDatePicker(false);
                  }}
                >
                  <Text style={[styles.pickerDone, { color: '#4F8EF7' }]}>Listo</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={tripData.startDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTripData((prev) => ({ ...prev, startDate: selectedDate }));
                    }
                  }}
                  minimumDate={new Date()}
                  textColor={theme.colors.text}
                  style={styles.datePickerSpinner}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* End Date Picker Modal */}
        <Modal
          visible={showEndDatePicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEndDatePicker(false)}
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
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Text style={[styles.pickerCancel, { color: theme.colors.textMuted }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>
                  Fecha de Término
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowEndDatePicker(false);
                  }}
                >
                  <Text style={[styles.pickerDone, { color: '#4F8EF7' }]}>Listo</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={tripData.endDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTripData((prev) => ({ ...prev, endDate: selectedDate }));
                    }
                  }}
                  minimumDate={tripData.startDate || new Date()}
                  textColor={theme.colors.text}
                  style={styles.datePickerSpinner}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Accommodation Picker */}
        <Modal
          visible={showAccommodationPicker}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={[styles.pickerModal, { backgroundColor: theme.colors.background }]}>
            <View
              style={[
                styles.pickerHeader,
                { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
              ]}
            >
              <TouchableOpacity onPress={() => setShowAccommodationPicker(false)}>
                <Text style={[styles.pickerCancel, { color: theme.colors.textMuted }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>
                Tipo de Alojamiento
              </Text>
              <TouchableOpacity onPress={() => setShowAccommodationPicker(false)}>
                <Text style={[styles.pickerDone, { color: '#DE3D00' }]}>Listo</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {accommodationTypes.map((accommodation) => (
                <TouchableOpacity
                  key={accommodation.value}
                  style={[
                    styles.pickerItem,
                    { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
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
                  <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>
                    {accommodation.label}
                  </Text>
                  {tripData.accommodation.includes(accommodation.value) && (
                    <Ionicons name="checkmark" size={20} color="#DE3D00" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {/* Transport Picker */}
        <Modal visible={showTransportPicker} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.pickerModal, { backgroundColor: theme.colors.background }]}>
            <View
              style={[
                styles.pickerHeader,
                { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
              ]}
            >
              <TouchableOpacity onPress={() => setShowTransportPicker(false)}>
                <Text style={[styles.pickerCancel, { color: theme.colors.textMuted }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>
                Tipo de Transporte
              </Text>
              <TouchableOpacity onPress={() => setShowTransportPicker(false)}>
                <Text style={[styles.pickerDone, { color: '#DE3D00' }]}>Listo</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {transportTypes.map((transport) => (
                <TouchableOpacity
                  key={transport.value}
                  style={[
                    styles.pickerItem,
                    { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
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
                  <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>
                    {transport.label}
                  </Text>
                  {tripData.transport.includes(transport.value) && (
                    <Ionicons name="checkmark" size={20} color="#DE3D00" />
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
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  budgetInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  cancelButton: {
    padding: 8,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginRight: 12,
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: '#4F8EF7',
    borderColor: '#4F8EF7',
  },
  checkboxContainer: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  checkboxSelected: {
    backgroundColor: '#F0E6FF',
    borderColor: '#4F8EF7',
  },
  checkboxText: {
    fontSize: 16,
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  dateButton: {
    alignItems: 'center',
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
    fontSize: 16,
    marginLeft: 8,
  },
  dateContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dateSeparator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteSection: {
    borderTopWidth: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  picker: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerCancel: {
    fontSize: 16,
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  pickerItem: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 16,
  },
  pickerItemIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  pickerItemSelected: {
    backgroundColor: '#F0E6FF',
  },
  pickerItemText: {
    flex: 1,
    fontSize: 16,
  },
  pickerList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pickerModal: {
    flex: 1,
  },
  pickerText: {
    fontSize: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4F8EF7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999999',
  },
  section: {
    marginBottom: 24,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  datePickerOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  datePickerModalContent: {
    borderRadius: 16,
    maxWidth: 500,
    overflow: 'hidden',
    width: '100%',
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
  datePickerContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingBottom: 10,
  },
  datePickerSpinner: {
    width: '100%',
  },
});
