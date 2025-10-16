import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCountries } from '../../hooks/useCountries';
import { useCitiesByCountry } from '../../hooks/useCitiesByCountry';
import { Country, CityResult } from '../../types/geo';

interface PersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

interface FormData {
  full_name: string;
  birth_date: Date | null;
  gender: string;
  country: string;           // country_code (ej: "MX", "ES")
  city_state: string;        // nombre de la ciudad seleccionada
  address: string;
  mobile_phone: string;      // número de teléfono sin prefijo
  country_code: string;      // prefijo telefónico (ej: "+52")
}

const genderOptions = [
  { label: 'Seleccionar género', value: '', icon: '👤' },
  { label: 'Masculino', value: 'masculine', icon: '👨' },
  { label: 'Femenino', value: 'feminine', icon: '👩' },
  { label: 'Prefiero no decirlo', value: 'prefer_not_to_say', icon: '🤐' },
];



export default function PersonalInfoModal({ isOpen, onClose, user }: PersonalInfoModalProps) {
  const [showIntro, setShowIntro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Hooks para países y ciudades
  const { countries, loading: countriesLoading, error: countriesError } = useCountries();
  const { 
    cities, 
    loading: citiesLoading, 
    error: citiesError,
    loadCitiesForCountry,
    clearResults 
  } = useCitiesByCountry();

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    birth_date: null,
    gender: '',
    country: '',
    city_state: '',
    address: '',
    mobile_phone: '',
    country_code: '',
  });

  // Función para normalizar código telefónico
  const normalizePhoneCode = (phoneCode: string): string => {
    if (!phoneCode) return '';
    const cleanCode = phoneCode.replace(/^\++/, ''); // Elimina todos los "+" iniciales
    return `+${cleanCode}`; // Agrega exactamente un "+"
  };

  // useEffect #1: Inicialización y carga de datos
  useEffect(() => {
    if (isOpen && user?.id) {
      checkIntroStatus();
      loadExistingData();
    }
  }, [isOpen, user?.id]);

  // useEffect #2: Actualización automática del prefijo telefónico cuando cambia el país
  useEffect(() => {
    if (!isInitialized) return; // Previene actualización durante la carga inicial

    if (formData.country) {
      // Busca el país en el array de países
      const country = countries.find(c => c.country_code === formData.country);
      
      if (country) {
        // Normaliza el phone_code (asegura un solo "+")
        const phoneCode = normalizePhoneCode(country.phone_code);
        
        // Actualiza el prefijo automáticamente
        setFormData(prev => ({
          ...prev,
          country_code: phoneCode
        }));
      }
    } else {
      // Si no hay país, limpia prefijo y teléfono
      setFormData(prev => ({
        ...prev,
        country_code: '',
        mobile_phone: ''
      }));
    }
  }, [formData.country, countries, isInitialized]);

  // useEffect #3: Carga reactiva de ciudades cuando cambia el país
  useEffect(() => {
    if (!isInitialized) return; // Previene fetch duplicado al cargar perfil

    if (formData.country && formData.country !== '') {
      setFormData(prev => ({ ...prev, city_state: '' })); // Limpia ciudad anterior
      loadCitiesForCountry(formData.country); // Fetch ciudades del nuevo país
    } else {
      clearResults(); // Limpia resultados si no hay país
    }
  }, [formData.country, loadCitiesForCountry, clearResults, isInitialized]);

  // useEffect #4: Limpieza al cerrar modal
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
      clearResults(); // Limpia ciudades cargadas
    }
  }, [isOpen, clearResults]);

  const checkIntroStatus = async () => {
    try {
      const key = `intro_shown_${user.id}`;
      const alreadyShown = await AsyncStorage.getItem(key);
      if (!alreadyShown) {
        setShowIntro(true);
        await AsyncStorage.setItem(key, 'true');
      }
    } catch (error) {
      console.error('Error checking intro status:', error);
    }
  };

  const loadExistingData = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (profile) {
        setFormData({
          full_name: profile.full_name || '',
          birth_date: profile.birth_date ? new Date(profile.birth_date) : null,
          gender: profile.gender || '',
          country: profile.country || '',
          city_state: profile.city_state || '',
          address: profile.address || '',
          mobile_phone: profile.mobile_phone || '',
          country_code: profile.country_code || '',
        });
      }
      
      // Marcar como inicializado después de cargar los datos
      setIsInitialized(true);
    } catch (error) {
      console.error('Error loading existing data:', error);
      setIsInitialized(true); // Marcar como inicializado incluso si hay error
    }
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const skipOnboarding = async () => {
    try {
      await AsyncStorage.setItem(`onboarding_dismissed_${user.id}`, 'true');
      onClose();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const completeOnboarding = async () => {
    if (!formData.full_name.trim()) {
      Alert.alert('Campo requerido', 'El nombre completo es obligatorio');
      return;
    }

    if (!formData.birth_date) {
      Alert.alert('Campo requerido', 'La fecha de nacimiento es obligatoria');
      return;
    }

    if (!formData.gender) {
      Alert.alert('Campo requerido', 'El género es obligatorio');
      return;
    }

    setLoading(true);
    try {
      const age = calculateAge(formData.birth_date);
      
      const updateData = {
        full_name: formData.full_name.trim(),
        birth_date: formData.birth_date.toISOString().split('T')[0],
        age,
        gender: formData.gender,
        country: formData.country || null,
        city_state: formData.city_state || null,
        address: formData.address || null,
        mobile_phone: formData.mobile_phone || null,
        country_code: formData.country_code,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...updateData,
        });

      if (error) throw error;

      // Mark welcome as shown
      await AsyncStorage.setItem(`welcome_shown_${user.id}`, 'true');

      Alert.alert(
        '🎉 ¡Perfil Completado!',
        'Tu información ha sido guardada exitosamente. ¡Bienvenido a Go Travel Connect!',
        [
          {
            text: 'Comenzar a Explorar',
            onPress: onClose
          }
        ]
      );
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', error.message || 'Error al guardar la información');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    console.log('Date change event:', event?.type, selectedDate);
    
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'dismissed' || event.type === 'neutralButtonPressed') {
      console.log('Date picker dismissed');
      setShowDatePicker(false);
      return;
    }

    if (selectedDate && event.type === 'set') {
      console.log('Setting birth date:', selectedDate);
      updateField('birth_date', selectedDate);
      // En iOS, el modal se cierra manualmente con los botones Done/Cancel
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
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

  const getGenderLabel = (value: string) => {
    const option = genderOptions.find(o => o.value === value);
    return option ? `${option.icon} ${option.label}` : '';
  };

  const getCountryLabel = (countryCode: string) => {
    const country = countries.find(c => c.country_code === countryCode);
    return country ? `🌍 ${country.country_name}` : '';
  };

  const getCityLabel = (cityName: string) => {
    return cityName ? `🏙️ ${cityName}` : '';
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Información Personal</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Intro Banner */}
          {showIntro && (
            <View style={styles.introBanner}>
              <View style={styles.introContent}>
                <Ionicons name="flag" size={24} color="#6366F1" />
                <View style={styles.introText}>
                  <Text style={styles.introTitle}>¡Último paso para comenzar!</Text>
                  <Text style={styles.introSubtitle}>
                    Completa tu información para obtener recomendaciones personalizadas.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowIntro(false)}
                style={styles.introCloseButton}
              >
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.formContainer}>
              
              {/* Required Fields Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Campos Obligatorios *</Text>

                {/* Full Name */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Nombre Completo *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.full_name}
                    onChangeText={(text) => updateField('full_name', text)}
                    placeholder="Ingresa tu nombre completo"
                    placeholderTextColor="rgba(0,0,0,0.5)"
                  />
                </View>

                {/* Birth Date */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Fecha de Nacimiento *</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, formData.birth_date && styles.dateButtonSelected]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar" size={20} color="#6366F1" />
                    <Text style={[styles.dateButtonText, { 
                      color: formData.birth_date ? '#1F2937' : 'rgba(0,0,0,0.5)',
                      fontWeight: formData.birth_date ? '600' : '400'
                    }]}>
                      {formData.birth_date 
                        ? formatDate(formData.birth_date)
                        : 'Seleccionar fecha'
                      }
                    </Text>
                  </TouchableOpacity>
                  {formData.birth_date && (
                    <Text style={styles.ageText}>
                      Edad: {calculateAge(formData.birth_date)} años
                    </Text>
                  )}
                </View>

                {/* Gender */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Género *</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, formData.gender && styles.pickerButtonSelected]}
                    onPress={() => setShowGenderPicker(true)}
                  >
                    <Text style={[styles.pickerButtonText, formData.gender && styles.pickerButtonTextSelected]}>
                      {formData.gender ? getGenderLabel(formData.gender) : '👤 Seleccionar género'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6366F1" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Optional Fields Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Campos Opcionales</Text>

                {/* Country Selector */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>País</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, formData.country && styles.pickerButtonSelected]}
                    onPress={() => setShowCountryPicker(true)}
                    disabled={countriesLoading}
                  >
                    <Text style={[styles.pickerButtonText, formData.country && styles.pickerButtonTextSelected]}>
                      {formData.country ? getCountryLabel(formData.country) : '🌍 Seleccionar país'}
                    </Text>
                    {countriesLoading ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <Ionicons name="chevron-down" size={20} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                  {countriesError && (
                    <Text style={styles.errorText}>
                      Error al cargar países. Usando lista básica.
                    </Text>
                  )}
                </View>

                {/* City/State Selector */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Ciudad/Estado</Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton, 
                      formData.city_state && styles.pickerButtonSelected,
                      (!formData.country || citiesLoading) && styles.pickerButtonDisabled
                    ]}
                    onPress={() => setShowCityPicker(true)}
                    disabled={!formData.country || citiesLoading}
                  >
                    <Text style={[
                      styles.pickerButtonText, 
                      formData.city_state && styles.pickerButtonTextSelected,
                      (!formData.country || citiesLoading) && styles.pickerButtonTextDisabled
                    ]}>
                      {!formData.country 
                        ? '🌍 Selecciona un país primero'
                        : citiesLoading 
                        ? '⏳ Cargando ciudades...'
                        : formData.city_state 
                        ? getCityLabel(formData.city_state)
                        : '🏙️ Seleccionar ciudad o estado'
                      }
                    </Text>
                    {citiesLoading ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <Ionicons 
                        name="chevron-down" 
                        size={20} 
                        color={!formData.country ? "#ccc" : "#6366F1"} 
                      />
                    )}
                  </TouchableOpacity>
                  {citiesError && (
                    <Text style={styles.errorText}>
                      Error al cargar ciudades para este país.
                    </Text>
                  )}
                </View>

                {/* Address */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Dirección</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.address}
                    onChangeText={(text) => updateField('address', text)}
                    placeholder="Dirección completa"
                    placeholderTextColor="rgba(0,0,0,0.5)"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Phone */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Teléfono Móvil</Text>
                  <View style={styles.phoneContainer}>
                    <View style={styles.countryCodeContainer}>
                      <TextInput
                        style={[styles.textInput, styles.countryCodeInput]}
                        value={formData.country_code}
                        placeholder="+XX"
                        placeholderTextColor="rgba(0,0,0,0.5)"
                        editable={false}
                      />
                    </View>
                    <TextInput
                      style={[styles.textInput, styles.phoneInput]}
                      value={formData.mobile_phone}
                      onChangeText={(text) => {
                        // Solo permitir números y espacios
                        const cleanText = text.replace(/[^0-9\s]/g, '');
                        updateField('mobile_phone', cleanText);
                      }}
                      placeholder="123 456 7890"
                      placeholderTextColor="rgba(0,0,0,0.5)"
                      keyboardType="phone-pad"
                      editable={!!formData.country_code}
                    />
                  </View>
                  {!formData.country && (
                    <Text style={styles.helperText}>
                      Selecciona un país primero para habilitar el teléfono
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={skipOnboarding}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>Omitir por ahora</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { opacity: loading ? 0.6 : 1 }]}
              onPress={completeOnboarding}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {showDatePicker && Platform.OS === 'ios' && (
            <Modal
              visible={showDatePicker}
              animationType="slide"
              presentationStyle="formSheet"
              transparent={false}
            >
              <View style={styles.iosDatePickerContainer}>
                <View style={styles.iosDatePickerHeader}>
                  <TouchableOpacity 
                    onPress={() => {
                      console.log('Date picker cancelled');
                      setShowDatePicker(false);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.datePickerCancel}>Cancelar</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>Fecha de Nacimiento</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      console.log('Date picker done');
                      setShowDatePicker(false);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.datePickerDone}>Listo</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.datePickerContent}>
                  <DateTimePicker
                    value={formData.birth_date || new Date()}
                    mode="date"
                    display="inline"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                    locale="es-ES"
                    style={styles.iosDatePicker}
                    textColor="#000000"
                    accentColor="#6366F1"
                    themeVariant="light"
                  />
                </View>
              </View>
            </Modal>
          )}

          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={formData.birth_date || new Date()}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
          )}

          {/* Gender Picker Modal */}
          <Modal
            visible={showGenderPicker}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                  <Text style={styles.pickerCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Seleccionar Género</Text>
                <View style={{ width: 60 }} />
              </View>
              <ScrollView style={styles.pickerContent}>
                {genderOptions.slice(1).map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.pickerOption, formData.gender === option.value && styles.pickerOptionSelected]}
                    onPress={() => {
                      updateField('gender', option.value);
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionIcon}>{option.icon}</Text>
                    <Text style={[styles.pickerOptionText, formData.gender === option.value && styles.pickerOptionTextSelected]}>
                      {option.label}
                    </Text>
                    {formData.gender === option.value && (
                      <Ionicons name="checkmark" size={20} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>

          {/* Country Picker Modal */}
          <Modal
            visible={showCountryPicker}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                  <Text style={styles.pickerCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Seleccionar País</Text>
                <View style={{ width: 60 }} />
              </View>
              <ScrollView style={styles.pickerContent}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar país..."
                  placeholderTextColor="#6b7280"
                  onChangeText={(text) => {
                    // Implementar búsqueda local
                    // Por ahora mostramos todos los países
                  }}
                />
                {countries.map((country) => (
                  <TouchableOpacity
                    key={country.country_code}
                    style={[styles.pickerOption, formData.country === country.country_code && styles.pickerOptionSelected]}
                    onPress={() => {
                      updateField('country', country.country_code);
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionIcon}>🌍</Text>
                    <View style={styles.countryOptionContent}>
                      <Text style={[styles.pickerOptionText, formData.country === country.country_code && styles.pickerOptionTextSelected]}>
                        {country.country_name}
                      </Text>
                      <Text style={styles.phoneCodeText}>{country.phone_code}</Text>
                    </View>
                    {formData.country === country.country_code && (
                      <Ionicons name="checkmark" size={20} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>

          {/* City Picker Modal */}
          <Modal
            visible={showCityPicker}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                  <Text style={styles.pickerCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Seleccionar Ciudad</Text>
                <View style={{ width: 60 }} />
              </View>
              <ScrollView style={styles.pickerContent}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar ciudad..."
                  placeholderTextColor="#6b7280"
                  onChangeText={(text) => {
                    // Implementar búsqueda local
                    // Por ahora mostramos todas las ciudades
                  }}
                />
                {cities.length === 0 && !citiesLoading && formData.country && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No se encontraron ciudades para este país
                    </Text>
                  </View>
                )}
                {cities.map((city) => (
                  <TouchableOpacity
                    key={`${city.city}-${city.latitude}-${city.longitude}`}
                    style={[styles.pickerOption, formData.city_state === city.city && styles.pickerOptionSelected]}
                    onPress={() => {
                      updateField('city_state', city.city);
                      setShowCityPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionIcon}>🏙️</Text>
                    <View style={styles.cityOptionContent}>
                      <Text style={[styles.pickerOptionText, formData.city_state === city.city && styles.pickerOptionTextSelected]}>
                        {city.city}
                      </Text>
                      <Text style={styles.populationText}>
                        {city.population.toLocaleString()} habitantes
                      </Text>
                    </View>
                    {formData.city_state === city.city && (
                      <Ionicons name="checkmark" size={20} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: 'white',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  introBanner: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  introContent: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  introText: {
    flex: 1,
    marginLeft: 12,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  introCloseButton: {
    padding: 4,
  },
  form: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: 'white',
    marginBottom: 16,
    textShadow: '0px 1px 2px rgba(0,0,0,0.3)',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  dateButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    minHeight: 56,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)',
    elevation: 3,
    elevation: 2,
  },
  dateButtonSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#F8FAFF',
    borderWidth: 2,
  },
  dateButtonText: {
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500' as const,
  },
  ageText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    fontStyle: 'italic' as const,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  picker: {
    height: 50,
  },
  pickerButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    minHeight: 56,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)',
    elevation: 3,
    elevation: 2,
  },
  pickerButtonSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#F8FAFF',
    borderWidth: 2,
  },
  pickerButtonText: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.5)',
    fontWeight: '500' as const,
  },
  pickerButtonTextSelected: {
    color: '#1F2937',
    fontWeight: '600' as const,
  },
  pickerButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  pickerButtonTextDisabled: {
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  countryCodeInput: {
    textAlign: 'center' as const,
    fontWeight: '600' as const,
    backgroundColor: '#F9FAFB',
  },
  phoneContainer: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  countryCodeContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  countryCodePicker: {
    height: 50,
  },
  phoneInput: {
    flex: 2,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    padding: 20,
    gap: 12,
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  saveButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#6366F1',
  },
  // Estilos para iOS DatePicker
  iosDatePickerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Fondo blanco para mejor contraste
    justifyContent: 'space-between' as const,
  },
  iosDatePickerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    backgroundColor: '#6366F1', // Header mantiene el color del tema
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    elevation: 3,
  },
  datePickerContent: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Fondo blanco
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  datePickerCancel: {
    fontSize: 17,
    color: '#ffffff',
    fontWeight: '500' as const,
  },
  datePickerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  datePickerDone: {
    fontSize: 17,
    color: '#ffffff',
    fontWeight: '600' as const,
  },
  iosDatePicker: {
    backgroundColor: '#FFFFFF', // Fondo blanco para el calendario
    width: '100%' as const,
    maxWidth: 380,
    alignSelf: 'center' as const,
    borderRadius: 12,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 8,
    elevation: 5,
  },
  // Estilos para Gender Picker Modal
  pickerModal: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  pickerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#6366F1',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1A1A1A',
  },
  pickerContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pickerOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerOptionSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#F0F4FF',
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
    color: '#6366F1',
    fontWeight: '600' as const,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  countryOptionContent: {
    flex: 1,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  phoneCodeText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500' as const,
  },
  cityOptionContent: {
    flex: 1,
  },
  populationText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center' as const,
  },
};
