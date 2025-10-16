import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Platform,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '~/lib/supabase';
import { forwardGeocode } from '~/lib/geocoding';
import { useCountries } from '~/hooks/useCountries';
import { useCitiesByCountry } from '~/hooks/useCitiesByCountry';

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userEmail?: string | null;
  onSaved?: () => void;
}

interface FormData {
  full_name: string;
  birth_date: Date | null;
  country: string; // country_code
  city_state: string; // city name
  address: string; // free address text
  mobile_phone: string; // local number without prefix
  country_code: string; // phone prefix derived from country
}

const REQUIRED_ERROR = {
  full_name: 'El nombre completo es obligatorio',
  birth_date: 'La fecha de nacimiento es obligatoria',
};

const genderOptions = [
  { label: 'Masculino', value: 'masculine', icon: '👨' },
  { label: 'Femenino', value: 'feminine', icon: '👩' },
  { label: 'Prefiero no decirlo', value: 'prefer_not_to_say', icon: '🤐' },
];

export const PersonalInfoEditModal: React.FC<Props> = ({
  visible,
  onClose,
  userId,
  userEmail,
  onSaved,
}) => {
  console.log('🎯 PersonalInfoEditModal Component: Rendering with props:', {
    visible,
    userId,
    userEmail,
  });

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [gender, setGender] = useState<string>('');
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [countrySearchQuery, setCountrySearchQuery] = useState<string>('');
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');
  const [manualCityEntry, setManualCityEntry] = useState<string>('');
  const [displayedCitiesCount, setDisplayedCitiesCount] = useState(50); // Optimización de rendimiento

  const { countries, loading: countriesLoading } = useCountries();
  const {
    cities,
    loading: citiesLoading,
    error: citiesError,
    loadCitiesForCountry,
    clearResults,
    searchCities,
    hasApiData,
    supportsManualEntry,
  } = useCitiesByCountry();

  const [form, setForm] = useState<FormData>({
    full_name: '',
    birth_date: null,
    country: '',
    city_state: '',
    address: '',
    mobile_phone: '',
    country_code: '',
  });

  // Filtrado y paginación optimizada de ciudades
  const filteredAndPaginatedCities = useMemo(() => {
    if (!cities || cities.length === 0) return [];

    // Filtrar por búsqueda
    let filtered = cities;
    if (citySearchQuery.trim()) {
      const query = citySearchQuery.toLowerCase().trim();
      filtered = cities.filter((city) => city.city.toLowerCase().includes(query));
    }

    // Ordenar por población (ciudades más grandes primero) y luego alfabéticamente
    filtered.sort((a, b) => {
      if (b.population !== a.population) {
        return b.population - a.population;
      }
      return a.city.localeCompare(b.city, 'es', { sensitivity: 'base' });
    });

    // Limitar cantidad para renderizado
    return filtered.slice(0, displayedCitiesCount);
  }, [cities, citySearchQuery, displayedCitiesCount]);

  // Reset city search cuando cambia el país
  useEffect(() => {
    setCitySearchQuery('');
    setDisplayedCitiesCount(50);
  }, [form.country]);

  // Función para cargar más ciudades
  const loadMoreCities = () => {
    if (displayedCitiesCount < cities.length) {
      setDisplayedCitiesCount((prev) => Math.min(prev + 50, cities.length));
    }
  };

  // Componente optimizado para renderizar cada ciudad
  const CityItem = React.memo(
    ({ item, isSelected, onPress }: { item: any; isSelected: boolean; onPress: () => void }) => (
      <TouchableOpacity
        style={[styles.option, isSelected && styles.optionSelected]}
        onPress={onPress}
      >
        <Text style={styles.optionIcon}>🏙️</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
            {item.city}
          </Text>
          {item.population > 0 && (
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {item.population.toLocaleString('es-ES')} hab.
            </Text>
          )}
        </View>
        {isSelected && <Ionicons name="checkmark" size={18} color="#6366F1" />}
      </TouchableOpacity>
    )
  );

  useEffect(() => {
    if (visible && userId) {
      loadExisting();
    } else if (!visible) {
      // reset transient pickers state
      setShowCountryPicker(false);
      setShowCityPicker(false);
      setShowDatePicker(false);
      setShowGenderPicker(false);
      setCountrySearchQuery('');
      setCitySearchQuery('');
      setManualCityEntry('');
      setDisplayedCitiesCount(50);
    }
  }, [visible, userId]);

  useEffect(() => {
    console.log('📞 Country changed effect triggered:', form.country);
    if (form.country) {
      const c = countries.find((c) => c.country_code === form.country);
      console.log('📞 Found country data:', c);
      if (c) {
        const phoneCode = '+' + c.phone_code.replace(/^\++/, '');
        console.log('📞 Setting phone code:', phoneCode);
        if (phoneCode !== form.country_code) {
          setForm((prev) => ({ ...prev, country_code: phoneCode }));
        }
        console.log('📞 Loading cities for country:', form.country);
        loadCitiesForCountry(form.country);
      }
    } else {
      console.log('📞 No country selected, clearing results');
      clearResults();
      if (form.country_code) setForm((prev) => ({ ...prev, country_code: '', mobile_phone: '' }));
    }
  }, [form.country, countries]);

  // Filtrar países por búsqueda
  const filteredCountries = countries.filter(
    (country) =>
      country?.country_name?.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
      country?.country_code?.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  const loadExisting = async () => {
    console.log('📁 Loading existing profile data for user:', userId);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('💥 Error loading profile:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Profile data loaded:', data);

        setForm({
          full_name: data.full_name || '',
          birth_date: data.birth_date ? new Date(data.birth_date) : null,
          country: data.country || '',
          city_state: data.city_state || '',
          address: data.address || '',
          mobile_phone: data.mobile_phone || '',
          country_code: data.country_code || '',
        });

        setGender(data.gender || '');

        // Set address coordinates if available
        if (data.address_lat && data.address_lng) {
          setAddressCoords({
            lat: data.address_lat,
            lng: data.address_lng,
          });
        }

        // Load cities for the selected country
        if (data.country) {
          console.log('🏙️ Loading cities for country:', data.country);
          loadCitiesForCountry(data.country);
        }

        console.log('✅ Profile form populated successfully');
      } else {
        console.log('ℹ️ No existing profile found, starting with empty form');
      }
    } catch (e: any) {
      console.error('💥 Error in loadExisting:', e);

      // Handle specific errors gracefully
      if (e.code === 'PGRST116') {
        console.log('ℹ️ No profile found (404), this is normal for new users');
      } else if (e.message?.includes('permission denied')) {
        Alert.alert(
          'Error de Permisos',
          'No se puede acceder a la información del perfil. Por favor intenta cerrar sesión y volver a iniciar.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Error',
          'No se pudo cargar la información existente. Puedes continuar completando el formulario.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  };

  const update = (k: keyof FormData, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  // Validate if profile is complete for onboarding
  const isProfileComplete = () => {
    return !!(form.full_name.trim() && form.birth_date && (form.country || form.city_state.trim()));
  };

  // Get completion percentage for progress indicator
  const getCompletionPercentage = () => {
    const fields = [
      form.full_name.trim(),
      form.birth_date,
      form.country,
      form.city_state.trim(),
      form.address.trim(),
      form.mobile_phone.trim(),
      gender,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const save = async () => {
    if (!form.full_name.trim()) return Alert.alert('Error', REQUIRED_ERROR.full_name);
    if (!form.birth_date) return Alert.alert('Error', REQUIRED_ERROR.birth_date);

    setLoading(true);
    try {
      console.log('💾 Starting profile save process...');

      // Attempt geocode of address if provided
      let lat: number | undefined;
      let lng: number | undefined;
      if (form.address.trim()) {
        try {
          console.log('🗺️ Geocoding address:', form.address);
          const results = await forwardGeocode(
            `${form.address} ${form.city_state} ${form.country}`.trim(),
            1
          );
          if (results[0]) {
            lat = results[0].lat;
            lng = results[0].lng;
            setAddressCoords({ lat, lng });
            console.log('✅ Geocoding successful:', { lat, lng });
          }
        } catch (geocodeError) {
          console.warn('⚠️ Geocoding failed:', geocodeError);
        }
      }

      // Build comprehensive payload with all available data
      const profilePayload: any = {
        id: userId,
        email: userEmail,
        full_name: form.full_name.trim(),
        updated_at: new Date().toISOString(),
      };

      // Add personal information
      if (form.birth_date) {
        profilePayload.birth_date = form.birth_date.toISOString().split('T')[0];
      }
      if (gender) {
        profilePayload.gender = gender;
      }

      // Add location information
      if (form.country) {
        profilePayload.country = form.country;
      }
      if (form.city_state.trim()) {
        profilePayload.city_state = form.city_state.trim();
      }
      if (form.address.trim()) {
        profilePayload.address = form.address.trim();
      }
      if (lat !== undefined && lng !== undefined) {
        profilePayload.address_lat = lat;
        profilePayload.address_lng = lng;
      }

      // Add contact information
      if (form.mobile_phone.trim()) {
        profilePayload.mobile_phone = form.mobile_phone.trim();
      }
      if (form.country_code) {
        profilePayload.country_code = form.country_code;
      }

      // Mark onboarding as completed if this is the first time saving complete info
      if (form.full_name.trim() && form.birth_date && (form.country || form.city_state)) {
        profilePayload.onboarding_completed = true;
      }

      console.log('💾 Saving profile with payload:', profilePayload);

      const { data: savedData, error } = await supabase
        .from('profiles')
        .upsert(profilePayload)
        .select('*')
        .single();

      if (error) {
        console.error('💥 Save error details:', error);
        throw error;
      }

      console.log('✅ Profile saved successfully:', savedData);

      Alert.alert('Éxito', '¡Tu información personal se guardó correctamente!', [
        {
          text: 'Continuar',
          style: 'default',
          onPress: () => {
            onSaved?.();
            onClose();
          },
        },
      ]);
    } catch (e: any) {
      console.error('💥 Save error', e);

      // Enhanced error handling with user-friendly messages
      let errorMessage = 'No se pudo guardar la información';
      let shouldRetry = false;

      if (e.code === 'PGRST204') {
        errorMessage =
          'Hay un problema temporal con la base de datos. Tu información se guardó parcialmente.';
        shouldRetry = true;
      } else if (e.message?.includes('duplicate key')) {
        errorMessage = 'Ya existe un perfil con esta información.';
      } else if (
        e.message?.includes('permission denied') ||
        e.message?.includes('insufficient_privilege')
      ) {
        errorMessage = 'No tienes permisos para actualizar esta información.';
      } else if (e.message?.includes('network') || e.message?.includes('fetch')) {
        errorMessage = 'Problema de conexión. Verifica tu internet e intenta nuevamente.';
        shouldRetry = true;
      } else if (e.message) {
        errorMessage = e.message;
      }

      if (shouldRetry) {
        Alert.alert(
          'Información guardada parcialmente',
          `${errorMessage}\n\n¿Te gustaría continuar de todas formas?`,
          [
            { text: 'Reintentar', style: 'default', onPress: save },
            {
              text: 'Continuar',
              style: 'default',
              onPress: () => {
                onSaved?.();
                onClose();
              },
            },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Error al guardar', errorMessage, [
          { text: 'Reintentar', style: 'default', onPress: save },
          { text: 'Cancelar', style: 'cancel' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const age = form.birth_date
    ? new Date().getFullYear() -
      form.birth_date.getFullYear() -
      (new Date().getMonth() < form.birth_date.getMonth() ||
      (new Date().getMonth() === form.birth_date.getMonth() &&
        new Date().getDate() < form.birth_date.getDate())
        ? 1
        : 0)
    : null;

  const genderLabel = (val: string) => {
    const opt = genderOptions.find((o) => o.value === val);
    return opt ? `${opt.icon} ${opt.label}` : 'Seleccionar género';
  };

  if (!visible) {
    console.log('🎯 PersonalInfoEditModal: Not visible, returning null');
    return null;
  }

  console.log('🎯 PersonalInfoEditModal: Rendering modal - visible is true!');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={{
            paddingTop: Platform.OS === 'ios' ? 60 : 40,
            paddingHorizontal: 20,
            paddingBottom: 16,
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{ padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 16 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                Información Personal
              </Text>
              {initialLoaded && (
                <View style={{ marginTop: 4, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                    Progreso: {getCompletionPercentage()}%
                  </Text>
                  <View
                    style={{
                      width: 120,
                      height: 3,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderRadius: 2,
                      marginTop: 2,
                    }}
                  >
                    <View
                      style={{
                        width: `${getCompletionPercentage()}%`,
                        height: '100%',
                        backgroundColor: '#fff',
                        borderRadius: 2,
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={save}
              disabled={loading}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: isProfileComplete()
                  ? 'rgba(34,197,94,0.9)'
                  : 'rgba(255,255,255,0.2)',
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '600' }}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <ScrollView
          style={{ flex: 1, backgroundColor: '#F8F9FA' }}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        >
          {/* Progress Message */}
          {initialLoaded && !isProfileComplete() && (
            <View
              style={{
                backgroundColor: '#FEF3C7',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                borderLeftWidth: 4,
                borderLeftColor: '#F59E0B',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="information-circle" size={20} color="#F59E0B" />
                <Text style={{ marginLeft: 8, color: '#92400E', fontSize: 14, fontWeight: '600' }}>
                  Completa la información básica
                </Text>
              </View>
              <Text style={{ color: '#92400E', fontSize: 12, marginTop: 4 }}>
                Necesitamos tu nombre, fecha de nacimiento y ubicación para personalizar tu
                experiencia.
              </Text>
            </View>
          )}

          {/* Success Message */}
          {initialLoaded && isProfileComplete() && (
            <View
              style={{
                backgroundColor: '#D1FAE5',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                borderLeftWidth: 4,
                borderLeftColor: '#10B981',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={{ marginLeft: 8, color: '#065F46', fontSize: 14, fontWeight: '600' }}>
                  ¡Perfil completo!
                </Text>
              </View>
              <Text style={{ color: '#065F46', fontSize: 12, marginTop: 4 }}>
                Tu información básica está completa. Puedes agregar más detalles si lo deseas.
              </Text>
            </View>
          )}

          {/* Nombre Completo */}
          <Field label="Nombre Completo *">
            <TextInput
              value={form.full_name}
              onChangeText={(t) => update('full_name', t)}
              placeholder="Tu nombre completo"
              style={styles.input}
              placeholderTextColor="#666"
            />
          </Field>

          {/* Fecha de Nacimiento + Edad */}
          <Field label="Fecha de Nacimiento *">
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.selectorButton}>
              <Ionicons name="calendar" size={18} color="#6366F1" />
              <Text style={styles.selectorText}>
                {form.birth_date
                  ? form.birth_date.toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Seleccionar fecha'}
              </Text>
            </TouchableOpacity>
            {age !== null && <Text style={styles.helperText}>Edad: {age} años</Text>}
          </Field>

          {/* Género */}
          <Field label="Género">
            <TouchableOpacity
              onPress={() => setShowGenderPicker(true)}
              style={styles.selectorButton}
            >
              <Text style={styles.selectorText}>
                {gender ? genderLabel(gender) : '👤 Seleccionar género'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6366F1" />
            </TouchableOpacity>
          </Field>

          {/* País */}
          <Field label="País">
            <TouchableOpacity
              disabled={countriesLoading}
              onPress={() => {
                console.log('🌍 Opening country picker...');
                console.log('🌍 Available countries:', countries.length);
                console.log('🌍 Currently selected country:', form.country);
                setShowCountryPicker(true);
              }}
              style={styles.selectorButton}
            >
              <Text style={styles.selectorText}>
                {form.country
                  ? countries.find((c) => c.country_code === form.country)?.country_name ||
                    form.country
                  : '🌍 Seleccionar país'}
              </Text>
              {countriesLoading ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <Ionicons name="chevron-down" size={18} color="#6366F1" />
              )}
            </TouchableOpacity>
          </Field>

          {/* Ciudad */}
          <Field label="Ciudad / Estado">
            {supportsManualEntry ? (
              // Input manual para países sin ciudades disponibles en el API
              <View>
                <TextInput
                  value={form.city_state}
                  onChangeText={(t) => update('city_state', t)}
                  placeholder="Escribe el nombre de tu ciudad"
                  style={styles.input}
                  placeholderTextColor="#666"
                />
                <Text style={[styles.helperText, { color: '#6b7280' }]}>
                  📝 No tenemos ciudades predefinidas para este país. Escribe manualmente el nombre
                  de tu ciudad.
                </Text>
              </View>
            ) : (
              // Selector normal para países con ciudades disponibles
              <TouchableOpacity
                disabled={!form.country || citiesLoading}
                onPress={() => {
                  console.log('🏙️ Opening city picker...');
                  console.log('🏙️ Selected country:', form.country);
                  console.log('🏙️ Available cities:', cities.length);
                  console.log('🏙️ Has API data:', hasApiData);
                  console.log('🏙️ Currently selected city:', form.city_state);
                  setShowCityPicker(true);
                }}
                style={[
                  styles.selectorButton,
                  (!form.country || citiesLoading) && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.selectorText}>
                  {form.city_state ||
                    (!form.country
                      ? '🌍 Selecciona país primero'
                      : citiesLoading
                        ? '⏳ Cargando...'
                        : '🏙️ Seleccionar ciudad')}
                </Text>
                {citiesLoading ? (
                  <ActivityIndicator size="small" color="#6366F1" />
                ) : (
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={form.country ? '#6366F1' : '#ccc'}
                  />
                )}
              </TouchableOpacity>
            )}
            {form.country &&
              cities.length === 0 &&
              !citiesLoading &&
              !citiesError &&
              !supportsManualEntry && (
                <Text style={[styles.helperText, { color: '#6b7280' }]}>
                  � Cargando ciudades desde el servidor...
                </Text>
              )}
            {hasApiData && (
              <Text style={[styles.helperText, { color: '#10B981' }]}>
                🌐 {cities.length} ciudades disponibles desde el servidor
              </Text>
            )}
            {!hasApiData && cities.length > 0 && (
              <Text style={[styles.helperText, { color: '#F59E0B' }]}>
                📋 {cities.length} ciudades principales (lista local)
              </Text>
            )}
          </Field>

          {/* Dirección */}
          <Field label="Dirección de residencia">
            <TextInput
              value={form.address}
              onChangeText={(t) => update('address', t)}
              placeholder="Calle, número, etc."
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              multiline
              placeholderTextColor="#666"
            />
            {addressCoords && (
              <Text style={styles.helperText}>
                Lat: {addressCoords.lat.toFixed(5)} Lng: {addressCoords.lng.toFixed(5)}
              </Text>
            )}
          </Field>

          {/* Teléfono */}
          <Field label="Teléfono móvil">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View
                style={[
                  styles.input,
                  {
                    minWidth: 70,
                    maxWidth: 85,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#EEF2FF',
                    paddingHorizontal: 8,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: form.country_code ? '#6366F1' : '#666',
                    textAlign: 'center',
                  }}
                >
                  {form.country_code || '+XX'}
                </Text>
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.mobile_phone}
                onChangeText={(t) => update('mobile_phone', t.replace(/[^0-9\s]/g, ''))}
                placeholder="123 456 789"
                keyboardType="phone-pad"
                placeholderTextColor="#666"
                editable={!!form.country_code}
              />
            </View>
          </Field>
        </ScrollView>

        {/* Date Picker iOS */}
        {showDatePicker && Platform.OS === 'ios' && (
          <View style={styles.overlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.cancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Fecha de Nacimiento</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.done}>Listo</Text>
                </TouchableOpacity>
              </View>
              <View style={{ backgroundColor: '#fff', paddingVertical: 20 }}>
                <DateTimePicker
                  value={form.birth_date || new Date(1990, 0, 1)}
                  mode="date"
                  display="spinner"
                  onChange={(e, d) => {
                    if (e.type === 'set' && d) update('birth_date', d);
                  }}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  style={{ backgroundColor: '#fff' }}
                  textColor="#000000"
                  accentColor="#6366F1"
                />
              </View>
            </View>
          </View>
        )}

        {/* Date Picker Android */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={form.birth_date || new Date(1990, 0, 1)}
            mode="date"
            display="default"
            onChange={(e, d) => {
              if (e.type === 'set' && d) update('birth_date', d);
              setShowDatePicker(false);
            }}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
          />
        )}

        {/* Date Picker Web */}
        {showDatePicker && Platform.OS === 'web' && (
          <View style={styles.overlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.cancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Fecha de Nacimiento</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.done}>Listo</Text>
                </TouchableOpacity>
              </View>
              <View style={{ padding: 20, backgroundColor: '#fff' }}>
                <input
                  type="date"
                  value={form.birth_date ? form.birth_date.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const selectedDate = new Date(e.target.value);
                      update('birth_date', selectedDate);
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  min="1900-01-01"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Gender Picker */}
        {showGenderPicker && (
          <View style={styles.overlay}>
            <View style={styles.pickerSheetLarge}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                  <Text style={styles.cancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Seleccionar Género</Text>
                <View style={{ width: 60 }} />
              </View>
              <ScrollView style={{ paddingHorizontal: 20 }}>
                {genderOptions.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.option, gender === g.value && styles.optionSelected]}
                    onPress={() => {
                      setGender(g.value);
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text style={styles.optionIcon}>{g.icon}</Text>
                    <Text
                      style={[styles.optionText, gender === g.value && styles.optionTextSelected]}
                    >
                      {g.label}
                    </Text>
                    {gender === g.value && <Ionicons name="checkmark" size={18} color="#6366F1" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Country Picker */}
        {showCountryPicker && (
          <View style={styles.overlay}>
            <View style={styles.pickerSheetLarge}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCountryPicker(false);
                    setCountrySearchQuery('');
                  }}
                >
                  <Text style={styles.cancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Seleccionar País</Text>
                <View style={{ width: 60 }} />
              </View>

              {/* Buscador de países */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 10,
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                }}
              >
                <TextInput
                  value={countrySearchQuery}
                  onChangeText={setCountrySearchQuery}
                  placeholder="Buscar país..."
                  style={[styles.input, { marginBottom: 0, fontSize: 14 }]}
                  placeholderTextColor="#666"
                  autoFocus={false}
                />
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }}>
                {filteredCountries.length === 0 ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <Text style={{ color: '#6b7280' }}>No se encontraron países</Text>
                  </View>
                ) : (
                  filteredCountries.map((c) => (
                    <TouchableOpacity
                      key={c.country_code}
                      style={[
                        styles.option,
                        form.country === c.country_code && styles.optionSelected,
                      ]}
                      onPress={() => {
                        console.log('🌍 Country selected:', c.country_name, c.country_code);
                        console.log('🌍 Phone code:', c.phone_code);
                        update('country', c.country_code);
                        update('city_state', '');
                        console.log('🌍 Clearing city selection and closing picker');
                        setShowCountryPicker(false);
                        setCountrySearchQuery('');
                      }}
                    >
                      <Text style={styles.optionIcon}>🌍</Text>
                      <View
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            form.country === c.country_code && styles.optionTextSelected,
                          ]}
                        >
                          {c.country_name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>{c.phone_code}</Text>
                      </View>
                      {form.country === c.country_code && (
                        <Ionicons name="checkmark" size={18} color="#6366F1" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {/* City Picker */}
        {showCityPicker && (
          <View style={styles.overlay}>
            <View style={styles.pickerSheetLarge}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCityPicker(false);
                    setCitySearchQuery('');
                  }}
                >
                  <Text style={styles.cancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Seleccionar Ciudad</Text>
                <View style={{ width: 60 }} />
              </View>

              {/* Buscador de ciudades */}
              {cities.length > 10 && (
                <View
                  style={{
                    paddingHorizontal: 20,
                    paddingTop: 10,
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                  }}
                >
                  <TextInput
                    value={citySearchQuery}
                    onChangeText={(text) => {
                      setCitySearchQuery(text);
                      searchCities(text);
                    }}
                    placeholder="Buscar ciudad..."
                    style={[styles.input, { marginBottom: 0, fontSize: 14 }]}
                    placeholderTextColor="#666"
                    autoFocus={false}
                  />
                  {citySearchQuery.length > 0 && (
                    <Text style={[styles.helperText, { marginTop: 4, color: '#6b7280' }]}>
                      🔍 Mostrando resultados para "{citySearchQuery}"
                    </Text>
                  )}
                </View>
              )}

              <View style={{ paddingHorizontal: 20, flex: 1 }}>
                {citiesLoading ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={{ color: '#6b7280', marginTop: 10 }}>Cargando ciudades...</Text>
                  </View>
                ) : cities.length === 0 ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <Ionicons name="location-outline" size={48} color="#D1D5DB" />
                    <Text
                      style={{ color: '#6b7280', textAlign: 'center', marginTop: 12, fontSize: 16 }}
                    >
                      {citySearchQuery.length > 0
                        ? `No se encontraron ciudades que coincidan con "${citySearchQuery}"`
                        : 'No se encontraron ciudades para este país'}
                    </Text>
                    {citySearchQuery.length > 0 && (
                      <TouchableOpacity
                        style={{
                          marginTop: 16,
                          paddingHorizontal: 20,
                          paddingVertical: 8,
                          backgroundColor: '#F3F4F6',
                          borderRadius: 8,
                        }}
                        onPress={() => {
                          setCitySearchQuery('');
                          searchCities('');
                        }}
                      >
                        <Text style={{ color: '#6366F1', fontSize: 14 }}>
                          Mostrar todas las ciudades
                        </Text>
                      </TouchableOpacity>
                    )}
                    <Text
                      style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 8, fontSize: 12 }}
                    >
                      Verifica tu conexión a internet o intenta más tarde.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Información del origen de datos */}
                    <View
                      style={{
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F3F4F6',
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                        {hasApiData
                          ? `🌐 ${cities.length} ciudades desde el servidor`
                          : `📋 ${cities.length} ciudades principales (datos locales)`}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: '#9CA3AF',
                          textAlign: 'center',
                          marginTop: 4,
                        }}
                      >
                        {citySearchQuery
                          ? `🔍 ${filteredAndPaginatedCities.length} resultados`
                          : `Mostrando ${Math.min(displayedCitiesCount, cities.length)} de ${cities.length}`}
                      </Text>
                    </View>

                    <FlatList
                      data={filteredAndPaginatedCities}
                      keyExtractor={(item) => `${item.city}-${item.latitude}-${item.longitude}`}
                      renderItem={({ item }) => (
                        <CityItem
                          item={item}
                          isSelected={form.city_state === item.city}
                          onPress={() => {
                            console.log('🏙️ City selected:', item.city);
                            console.log('🏙️ Population:', item.population);
                            console.log('🏙️ Coordinates:', item.latitude, item.longitude);
                            update('city_state', item.city);
                            setShowCityPicker(false);
                            setCitySearchQuery('');
                            setDisplayedCitiesCount(50);
                          }}
                        />
                      )}
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingHorizontal: 0 }}
                      initialNumToRender={15}
                      maxToRenderPerBatch={15}
                      windowSize={8}
                      removeClippedSubviews={true}
                      getItemLayout={(data, index) => ({
                        length: 60, // altura aproximada de cada item
                        offset: 60 * index,
                        index,
                      })}
                      onEndReached={loadMoreCities}
                      onEndReachedThreshold={0.5}
                      ListFooterComponent={() => {
                        if (displayedCitiesCount < cities.length && !citySearchQuery) {
                          return (
                            <View style={{ padding: 16, alignItems: 'center' }}>
                              <TouchableOpacity
                                style={{
                                  backgroundColor: '#F3F4F6',
                                  paddingHorizontal: 16,
                                  paddingVertical: 8,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: '#E5E7EB',
                                }}
                                onPress={loadMoreCities}
                              >
                                <Text style={{ fontSize: 12, color: '#6366F1', fontWeight: '600' }}>
                                  Cargar más ({cities.length - displayedCitiesCount} restantes)
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        }
                        return null;
                      }}
                    />
                  </>
                )}
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={{ marginBottom: 24 }}>
    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
      {label}
    </Text>
    {children}
  </View>
);

const styles = {
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectorButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectorText: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1f2937' },
  helperText: { marginTop: 6, fontSize: 12, color: '#6366F1', fontWeight: '500' as const },
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end' as const,
  },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  pickerSheetLarge: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 0.7 * 800,
    flex: 1,
    flexDirection: 'column' as const,
  },
  sheetHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sheetTitle: { fontSize: 16, fontWeight: '600' as const, color: '#1f2937' },
  cancel: { fontSize: 16, color: '#6366F1' },
  done: { fontSize: 16, color: '#6366F1', fontWeight: '600' as const },
  option: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionSelected: { backgroundColor: '#F0F4FF', borderColor: '#6366F1' },
  optionIcon: { fontSize: 20, marginRight: 12 },
  optionText: { flex: 1, fontSize: 16, color: '#1f2937' },
  optionTextSelected: { color: '#6366F1', fontWeight: '600' as const },
};

export default PersonalInfoEditModal;
