import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

const { height: screenHeight } = Dimensions.get('window');

// Obtener el usuario desde el contexto de autenticación
const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);
  
  return { user };
};

interface ProfileData {
  full_name: string;
  birth_date: Date | null;
  age: number | null;
  gender: string;
  country: string;
  city_state: string;
  address: string;
  mobile_phone: string;
  country_code: string;
}

const genderOptions = [
  { label: 'Masculino', value: 'masculine', icon: '👨' },
  { label: 'Femenino', value: 'feminine', icon: '👩' },
  { label: 'Prefiero no decirlo', value: 'prefer_not_to_say', icon: '🤐' },
];

const countries = [
  { country_code: 'ES', country_name: 'España', phone_code: '+34' },
  { country_code: 'US', country_name: 'Estados Unidos', phone_code: '+1' },
  { country_code: 'MX', country_name: 'México', phone_code: '+52' },
  { country_code: 'AR', country_name: 'Argentina', phone_code: '+54' },
  { country_code: 'CO', country_name: 'Colombia', phone_code: '+57' },
];

export default function PersonalInfoScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    birth_date: null,
    age: null,
    gender: '',
    country: '',
    city_state: '',
    address: '',
    mobile_phone: '',
    country_code: '',
  });

  const [originalData, setOriginalData] = useState<ProfileData>({
    full_name: '',
    birth_date: null,
    age: null,
    gender: '',
    country: '',
    city_state: '',
    address: '',
    mobile_phone: '',
    country_code: '',
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  useEffect(() => {
    // Si no hay datos básicos, activar automáticamente el modo edición
    const isEmptyProfile = !profileData.full_name && !profileData.birth_date && !profileData.gender;
    if (isEmptyProfile && !loading) {
      setIsEditing(true);
    }
  }, [profileData, loading]);

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const loadProfileData = async () => {
    if (!user?.id) return;

    console.log('Cargando datos del perfil para usuario:', user.id);
    setLoading(true);
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('Respuesta de Supabase:', { profile, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (profile) {
        console.log('Perfil encontrado:', profile);
        const birthDate = profile.birth_date ? new Date(profile.birth_date) : null;
        const age = birthDate ? calculateAge(birthDate) : null;

        const data: ProfileData = {
          full_name: profile.full_name || '',
          birth_date: birthDate,
          age: age,
          gender: profile.gender || '',
          country: profile.country || '',
          city_state: profile.city_state || '',
          address: profile.address || '',
          mobile_phone: profile.mobile_phone || '',
          country_code: profile.country_code || '',
        };

        setProfileData(data);
        setOriginalData(data);
      } else {
        console.log('No se encontró perfil, usando datos vacíos');
        // Si no hay perfil, mantener los datos vacíos iniciales
        const emptyData: ProfileData = {
          full_name: '',
          birth_date: null,
          age: null,
          gender: '',
          country: '',
          city_state: '',
          address: '',
          mobile_phone: '',
          country_code: '',
        };
        setProfileData(emptyData);
        setOriginalData(emptyData);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfileData = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    if (!profileData.full_name.trim()) {
      Alert.alert('Error', 'El nombre completo es obligatorio');
      return;
    }

    console.log('Guardando datos del perfil:', profileData);
    setLoading(true);
    
    try {
      const updateData = {
        full_name: profileData.full_name.trim(),
        birth_date: profileData.birth_date ? profileData.birth_date.toISOString().split('T')[0] : null,
        gender: profileData.gender || null,
        country: profileData.country || null,
        city_state: profileData.city_state || null,
        address: profileData.address || null,
        mobile_phone: profileData.mobile_phone || null,
        country_code: profileData.country_code || null,
        updated_at: new Date().toISOString(),
      };

      console.log('Datos a guardar en Supabase:', updateData);

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...updateData,
        }, {
          onConflict: 'id'
        })
        .select();

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      console.log('Datos guardados exitosamente:', data);

      // Actualizar la edad calculada en el estado local
      const updatedData = {
        ...profileData,
        age: profileData.birth_date ? calculateAge(profileData.birth_date) : null
      };
      setProfileData(updatedData);
      setOriginalData(updatedData);

      setIsEditing(false);
      Alert.alert('Éxito', 'Tu información personal ha sido actualizada');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Error al guardar la información');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const updateField = (field: keyof ProfileData, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'dismissed' || event.type === 'neutralButtonPressed') {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate && event.type === 'set') {
      updateField('birth_date', selectedDate);
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

  if (loading && !profileData.full_name) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Información Personal</Text>
          
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              if (isEditing) {
                saveProfileData();
              } else {
                setIsEditing(true);
              }
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.editButtonText}>
                {isEditing ? 'Guardar' : 'Editar'}
              </Text>
            )}
          </TouchableOpacity>
        </LinearGradient>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            {/* Información Personal */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Personal</Text>

              {/* Nombre completo */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Nombre Completo *</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.textInput}
                    value={profileData.full_name}
                    onChangeText={(text) => updateField('full_name', text)}
                    placeholder="Tu nombre completo"
                    placeholderTextColor="rgba(0,0,0,0.5)"
                  />
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.full_name || 'No especificado'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Fecha de nacimiento */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Fecha de Nacimiento</Text>
                {isEditing ? (
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar" size={20} color="#6366F1" />
                    <Text style={[styles.dateButtonText, { 
                      color: profileData.birth_date ? '#1F2937' : 'rgba(0,0,0,0.5)',
                    }]}>
                      {profileData.birth_date 
                        ? formatDate(profileData.birth_date)
                        : 'Seleccionar fecha'
                      }
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.birth_date ? formatDate(profileData.birth_date) : 'No especificado'}
                    </Text>
                  </View>
                )}
                
                {/* Mostrar edad calculada */}
                {profileData.age !== null && (
                  <View style={styles.ageContainer}>
                    <Ionicons name="time" size={16} color="#6366F1" />
                    <Text style={styles.ageText}>
                      Edad: {profileData.age} años
                    </Text>
                  </View>
                )}
              </View>

              {/* Género */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Género</Text>
                {isEditing ? (
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowGenderPicker(true)}
                  >
                    <Text style={styles.pickerButtonText}>
                      {profileData.gender ? getGenderLabel(profileData.gender) : '👤 Seleccionar género'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6366F1" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.gender ? getGenderLabel(profileData.gender) : 'No especificado'}
                    </Text>
                  </View>
                )}
              </View>

              {/* País */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>País</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.textInput}
                    value={profileData.country}
                    onChangeText={(text) => updateField('country', text)}
                    placeholder="Tu país"
                    placeholderTextColor="rgba(0,0,0,0.5)"
                  />
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.country || 'No especificado'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Ciudad */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Ciudad/Estado</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.textInput}
                    value={profileData.city_state}
                    onChangeText={(text) => updateField('city_state', text)}
                    placeholder="Tu ciudad o estado"
                    placeholderTextColor="rgba(0,0,0,0.5)"
                  />
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.city_state || 'No especificado'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Dirección */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Dirección</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={profileData.address}
                    onChangeText={(text) => updateField('address', text)}
                    placeholder="Dirección completa"
                    placeholderTextColor="rgba(0,0,0,0.5)"
                    multiline
                    numberOfLines={3}
                  />
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.address || 'No especificado'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Información de Contacto */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contacto</Text>

              {/* Teléfono */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Teléfono Móvil</Text>
                {isEditing ? (
                  <View style={styles.phoneContainer}>
                    <TextInput
                      style={[styles.textInput, styles.countryCodeInput]}
                      value={profileData.country_code}
                      onChangeText={(text) => updateField('country_code', text)}
                      placeholder="+XX"
                      placeholderTextColor="rgba(0,0,0,0.5)"
                    />
                    <TextInput
                      style={[styles.textInput, styles.phoneInput]}
                      value={profileData.mobile_phone}
                      onChangeText={(text) => {
                        const cleanText = text.replace(/[^0-9\s]/g, '');
                        updateField('mobile_phone', cleanText);
                      }}
                      placeholder="123 456 7890"
                      placeholderTextColor="rgba(0,0,0,0.5)"
                      keyboardType="phone-pad"
                    />
                  </View>
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.country_code && profileData.mobile_phone 
                        ? `${profileData.country_code} ${profileData.mobile_phone}`
                        : 'No especificado'
                      }
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Botones de acción cuando está editando */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelEdit}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { opacity: loading ? 0.6 : 1 }]}
              onPress={saveProfileData}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Date Picker para Android */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={profileData.birth_date || new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      {/* Date Picker para iOS */}
      {showDatePicker && Platform.OS === 'ios' && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Fecha de Nacimiento</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerDone}>Listo</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={profileData.birth_date || new Date()}
              mode="date"
              display="spinner"
              onChange={onDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              style={styles.datePicker}
            />
          </View>
        </View>
      )}

      {/* Gender Picker */}
      {showGenderPicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Text style={styles.pickerCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Seleccionar Género</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Text style={styles.pickerDone}>Listo</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerContent}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    profileData.gender === option.value && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    updateField('gender', option.value);
                    setShowGenderPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionIcon}>{option.icon}</Text>
                  <Text style={[
                    styles.pickerOptionText,
                    profileData.gender === option.value && styles.pickerOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    paddingVertical: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  displayField: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  displayText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dateButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
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
    marginLeft: 8,
    flex: 1,
  },
  ageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F0F4FF',
    padding: 8,
    borderRadius: 8,
  },
  ageText: {
    fontSize: 14,
    color: '#6366F1',
    marginLeft: 6,
    fontWeight: '500',
  },
  pickerButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCodeInput: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  phoneInput: {
    flex: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  // Estilos para los pickers modales
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.7,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#6366F1',
  },
  pickerDone: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600',
  },
  pickerContent: {
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
    fontWeight: '600',
  },
  datePicker: {
    backgroundColor: 'white',
  },
});
