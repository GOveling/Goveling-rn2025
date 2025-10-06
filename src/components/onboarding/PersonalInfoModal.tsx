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
  { label: 'Seleccionar género', value: '' },
  { label: 'Masculino', value: 'masculine' },
  { label: 'Femenino', value: 'feminine' },
  { label: 'Prefiero no decirlo', value: 'prefer_not_to_say' },
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
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateField('birth_date', selectedDate);
    }
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
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, { 
                      color: formData.birth_date ? '#000' : 'rgba(0,0,0,0.5)' 
                    }]}>
                      {formData.birth_date 
                        ? formData.birth_date.toLocaleDateString('es-ES')
                        : 'Seleccionar fecha'
                      }
                    </Text>
                    <Ionicons name="calendar" size={20} color="#6366F1" />
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
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.gender}
                      onValueChange={(value) => updateField('gender', value)}
                      style={styles.picker}
                    >
                      {genderOptions.map((option) => (
                        <Picker.Item
                          key={option.value}
                          label={option.label}
                          value={option.value}
                        />
                      ))}
                    </Picker>
                  </View>
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
          {showDatePicker && (
            <DateTimePicker
              value={formData.birth_date || new Date()}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
          )}
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
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  dateButtonText: {
    fontSize: 16,
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
};
