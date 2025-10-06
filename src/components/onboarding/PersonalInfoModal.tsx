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

interface PersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

interface FormData {
  full_name: string;
  birth_date: Date | null;
  gender: string;
  country: string;
  city_state: string;
  address: string;
  phone: string;
  phone_country_code: string;
}

const genderOptions = [
  { label: 'Seleccionar género', value: '', icon: '👤' },
  { label: 'Masculino', value: 'masculine', icon: '👨' },
  { label: 'Femenino', value: 'feminine', icon: '👩' },
  { label: 'Prefiero no decirlo', value: 'prefer_not_to_say', icon: '🤐' },
];

const countryCodes = [
  { country: 'España', code: '+34' },
  { country: 'México', code: '+52' },
  { country: 'Argentina', code: '+54' },
  { country: 'Estados Unidos', code: '+1' },
  { country: 'Colombia', code: '+57' },
  { country: 'Chile', code: '+56' },
  { country: 'Perú', code: '+51' },
  { country: 'Venezuela', code: '+58' },
];

export default function PersonalInfoModal({ isOpen, onClose, user }: PersonalInfoModalProps) {
  const [showIntro, setShowIntro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    birth_date: null,
    gender: '',
    country: '',
    city_state: '',
    address: '',
    phone: '',
    phone_country_code: '+34',
  });

  useEffect(() => {
    if (isOpen && user?.id) {
      checkIntroStatus();
      loadExistingData();
    }
  }, [isOpen, user?.id]);

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
          phone: profile.phone || '',
          phone_country_code: profile.phone_country_code || '+34',
        });
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
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
        phone: formData.phone || null,
        phone_country_code: formData.phone_country_code,
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

                {/* Country */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>País</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.country}
                    onChangeText={(text) => updateField('country', text)}
                    placeholder="Ej: España"
                    placeholderTextColor="rgba(0,0,0,0.5)"
                  />
                </View>

                {/* City/State */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Ciudad/Estado</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.city_state}
                    onChangeText={(text) => updateField('city_state', text)}
                    placeholder="Ej: Madrid, Comunidad de Madrid"
                    placeholderTextColor="rgba(0,0,0,0.5)"
                  />
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
                      <Picker
                        selectedValue={formData.phone_country_code}
                        onValueChange={(value) => updateField('phone_country_code', value)}
                        style={styles.countryCodePicker}
                      >
                        {countryCodes.map((item) => (
                          <Picker.Item
                            key={item.code}
                            label={`${item.country} ${item.code}`}
                            value={item.code}
                          />
                        ))}
                      </Picker>
                    </View>
                    <TextInput
                      style={[styles.textInput, styles.phoneInput]}
                      value={formData.phone}
                      onChangeText={(text) => updateField('phone', text)}
                      placeholder="123456789"
                      placeholderTextColor="rgba(0,0,0,0.5)"
                      keyboardType="phone-pad"
                    />
                  </View>
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
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
};
