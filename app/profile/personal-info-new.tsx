import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';

import { router } from 'expo-router';

import { User } from '@supabase/supabase-js';

import { supabase } from '../../src/lib/supabase';

interface ProfileData {
  full_name: string;
  birth_date: string;
  gender: string;
  mobile_phone: string;
  country_code: string;
  country: string;
  city_state: string;
  nationality: string;
  passport_number: string;
  passport_expiry: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
}

// Hook de autenticación simplificado
function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

const PersonalInfoScreen: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    birth_date: '',
    gender: '',
    mobile_phone: '',
    country_code: '',
    country: '',
    city_state: '',
    nationality: '',
    passport_number: '',
    passport_expiry: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
  });

  // Cargar datos del perfil
  useEffect(() => {
    if (user && !authLoading) {
      loadProfileData();
    }
  }, [user, authLoading]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos del perfil');
        return;
      }

      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          birth_date: data.birth_date || '',
          gender: data.gender || '',
          mobile_phone: data.mobile_phone || '',
          country_code: data.country_code || '',
          country: data.country || '',
          city_state: data.city_state || '',
          nationality: data.nationality || '',
          passport_number: data.passport_number || '',
          passport_expiry: data.passport_expiry || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          emergency_contact_relationship: data.emergency_contact_relationship || '',
        });

        // Si no hay datos importantes, activar modo edición automáticamente
        if (!data.full_name || !data.birth_date) {
          setIsEditMode(true);
        }
      } else {
        // Perfil nuevo, activar modo edición
        setIsEditMode(true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del perfil');
    } finally {
      setLoading(false);
    }
  };

  const saveProfileData = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Validación básica
      if (!profileData.full_name.trim()) {
        Alert.alert('Error', 'El nombre completo es obligatorio');
        return;
      }

      const dataToSave = {
        id: user.id,
        full_name: profileData.full_name.trim(),
        birth_date: profileData.birth_date || null,
        gender: profileData.gender || null,
        mobile_phone: profileData.mobile_phone.trim() || null,
        country_code: profileData.country_code.trim() || null,
        country: profileData.country.trim() || null,
        city_state: profileData.city_state.trim() || null,
        nationality: profileData.nationality.trim() || null,
        passport_number: profileData.passport_number.trim() || null,
        passport_expiry: profileData.passport_expiry || null,
        emergency_contact_name: profileData.emergency_contact_name.trim() || null,
        emergency_contact_phone: profileData.emergency_contact_phone.trim() || null,
        emergency_contact_relationship: profileData.emergency_contact_relationship.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(dataToSave, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

      if (error) {
        console.error('Error saving profile:', error);
        Alert.alert('Error', 'No se pudieron guardar los datos');
        return;
      }

      setIsEditMode(false);
      Alert.alert('Éxito', 'Información personal guardada correctamente');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'No se pudieron guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const genderOptions = [
    { label: '👨 Masculino', value: 'male' },
    { label: '👩 Femenino', value: 'female' },
    { label: '🏳️‍⚧️ No binario', value: 'non-binary' },
    { label: '🤐 Prefiero no decir', value: 'prefer-not-to-say' },
  ];

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Información Personal</Text>
        {!isEditMode && (
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditMode(true)}>
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información Básica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Básica</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre Completo *</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={profileData.full_name}
                onChangeText={(value) => updateField('full_name', value)}
                placeholder="Ingresa tu nombre completo"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.value}>{profileData.full_name || 'No especificado'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Fecha de Nacimiento</Text>
            {isEditMode ? (
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !profileData.birth_date && styles.pickerButtonTextPlaceholder,
                  ]}
                >
                  {profileData.birth_date
                    ? `${profileData.birth_date} (${calculateAge(profileData.birth_date)} años)`
                    : 'Selecciona tu fecha de nacimiento'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.value}>
                {profileData.birth_date
                  ? `${profileData.birth_date} (${calculateAge(profileData.birth_date)} años)`
                  : 'No especificado'}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Género</Text>
            {isEditMode ? (
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowGenderPicker(true)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !profileData.gender && styles.pickerButtonTextPlaceholder,
                  ]}
                >
                  {profileData.gender
                    ? genderOptions.find((g) => g.value === profileData.gender)?.label ||
                      profileData.gender
                    : 'Selecciona tu género'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.value}>
                {profileData.gender
                  ? genderOptions.find((g) => g.value === profileData.gender)?.label ||
                    profileData.gender
                  : 'No especificado'}
              </Text>
            )}
          </View>
        </View>

        {/* Información de Contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Contacto</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Teléfono Móvil</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={profileData.mobile_phone}
                onChangeText={(value) => updateField('mobile_phone', value)}
                placeholder="Ej: +57 300 123 4567"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{profileData.mobile_phone || 'No especificado'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Código de País</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={profileData.country_code}
                onChangeText={(value) => updateField('country_code', value)}
                placeholder="Ej: +57"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{profileData.country_code || 'No especificado'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>País</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={profileData.country}
                onChangeText={(value) => updateField('country', value)}
                placeholder="Ej: Colombia"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.value}>{profileData.country || 'No especificado'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ciudad/Estado</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={profileData.city_state}
                onChangeText={(value) => updateField('city_state', value)}
                placeholder="Ej: Bogotá"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.value}>{profileData.city_state || 'No especificado'}</Text>
            )}
          </View>
        </View>

        {/* Información de Viaje */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Viaje</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nacionalidad</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={profileData.nationality}
                onChangeText={(value) => updateField('nationality', value)}
                placeholder="Ej: Colombiana"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.value}>{profileData.nationality || 'No especificado'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Número de Pasaporte</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={profileData.passport_number}
                onChangeText={(value) => updateField('passport_number', value)}
                placeholder="Ej: AB1234567"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
            ) : (
              <Text style={styles.value}>{profileData.passport_number || 'No especificado'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Fecha de Vencimiento del Pasaporte</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={profileData.passport_expiry}
                onChangeText={(value) => updateField('passport_expiry', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.value}>{profileData.passport_expiry || 'No especificado'}</Text>
            )}
          </View>
        </View>

        {/* Contacto de Emergencia */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacto de Emergencia</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={profileData.emergency_contact_name}
                onChangeText={(value) => updateField('emergency_contact_name', value)}
                placeholder="Nombre del contacto de emergencia"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.value}>
                {profileData.emergency_contact_name || 'No especificado'}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Teléfono</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={profileData.emergency_contact_phone}
                onChangeText={(value) => updateField('emergency_contact_phone', value)}
                placeholder="Teléfono del contacto de emergencia"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>
                {profileData.emergency_contact_phone || 'No especificado'}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Relación</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={profileData.emergency_contact_relationship}
                onChangeText={(value) => updateField('emergency_contact_relationship', value)}
                placeholder="Ej: Padre, Madre, Hermano/a, Cónyuge"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.value}>
                {profileData.emergency_contact_relationship || 'No especificado'}
              </Text>
            )}
          </View>
        </View>

        {isEditMode && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsEditMode(false);
                loadProfileData(); // Recargar datos originales
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={saveProfileData}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Fecha de Nacimiento</Text>
            </View>

            <TextInput
              style={styles.dateInput}
              value={profileData.birth_date}
              onChangeText={(value) => updateField('birth_date', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.modalSaveButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Selecciona tu Género</Text>
            </View>

            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderOption,
                  profileData.gender === option.value && styles.genderOptionSelected,
                ]}
                onPress={() => {
                  updateField('gender', option.value);
                  setShowGenderPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.genderOptionText,
                    profileData.gender === option.value && styles.genderOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {profileData.gender === option.value && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000',
    marginBottom: 20,
  },
  field: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#333',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: '#666',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    minHeight: 48,
  },
  input: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    minHeight: 48,
  },
  pickerButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center' as const,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#000',
  },
  pickerButtonTextPlaceholder: {
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: 20,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center' as const,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center' as const,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%' as const,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 20,
  },
  modalCloseButton: {
    fontSize: 20,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000',
    flex: 1,
    textAlign: 'center' as const,
  },
  dateInput: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
  },
  modalSaveButton: {
    paddingVertical: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#fff',
  },
  genderOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  genderOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#000',
  },
  genderOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '500' as const,
  },
  checkmark: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold' as const,
  },
};

export default PersonalInfoScreen;
