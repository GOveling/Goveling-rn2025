import React, { useState, useEffect, useMemo } from 'react';

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
  FlatList,
  StyleSheet,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../src/contexts/AuthContext';
import { useCitiesByCountry } from '../../src/hooks/useCitiesByCountry';
import { useCountries } from '../../src/hooks/useCountries';
import { supabase } from '../../src/lib/supabase';
import { Country, CityResult } from '../../src/types/geo';

const { height: screenHeight } = Dimensions.get('window');

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
  { label: 'profile.personal_info.genders.masculine', value: 'masculine', icon: 'man-outline' },
  { label: 'profile.personal_info.genders.feminine', value: 'feminine', icon: 'woman-outline' },
  {
    label: 'profile.personal_info.genders.prefer_not_to_say',
    value: 'prefer_not_to_say',
    icon: 'person-outline',
  },
];

export default function PersonalInfoScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  // Estados para optimización de ciudades
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [displayedCitiesCount, setDisplayedCitiesCount] = useState(50); // Mostrar 50 inicialmente

  // Hooks para países y ciudades
  const { countries, loading: countriesLoading, error: countriesError } = useCountries();
  const {
    cities,
    loading: citiesLoading,
    error: citiesError,
    loadCitiesForCountry,
    clearResults,
  } = useCitiesByCountry();

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
  }, [profileData.country]);

  // Función para cargar más ciudades
  const loadMoreCities = () => {
    if (displayedCitiesCount < cities.length) {
      setDisplayedCitiesCount((prev) => Math.min(prev + 50, cities.length));
    }
  };

  // Componente optimizado para renderizar cada ciudad
  const CityItem = React.memo(
    ({
      item,
      isSelected,
      onPress,
    }: {
      item: CityResult;
      isSelected: boolean;
      onPress: () => void;
    }) => (
      <TouchableOpacity
        style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
        onPress={onPress}
      >
        <Ionicons name="business-outline" size={24} color="#6366F1" />
        <View style={styles.cityOptionContent}>
          <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
            {item.city}
          </Text>
          <Text style={styles.populationText}>
            {item.population.toLocaleString()} {t('profile.personal_info.city_picker.inhabitants')}
          </Text>
        </View>
        {isSelected && <Ionicons name="checkmark" size={20} color="#6366F1" />}
      </TouchableOpacity>
    )
  );
  CityItem.displayName = 'CityItem';

  useEffect(() => {
    loadProfileData();
  }, []);

  useEffect(() => {
    if (profileData.country && isEditing) {
      loadCitiesForCountry(profileData.country);
    }
  }, [profileData.country, isEditing]);

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

    setLoading(true);
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
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfileData = async () => {
    if (!user?.id) return;

    if (!profileData.full_name.trim()) {
      Alert.alert(
        t('profile.personal_info.errors.title'),
        t('profile.personal_info.errors.full_name_required')
      );
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        full_name: profileData.full_name.trim(),
        birth_date: profileData.birth_date
          ? profileData.birth_date.toISOString().split('T')[0]
          : null,
        age: profileData.birth_date ? calculateAge(profileData.birth_date) : null,
        gender: profileData.gender || null,
        country: profileData.country || null,
        city_state: profileData.city_state || null,
        address: profileData.address || null,
        mobile_phone: profileData.mobile_phone || null,
        country_code: profileData.country_code || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        ...updateData,
      });

      if (error) throw error;

      // Actualizar la edad calculada en el estado local
      const updatedData = {
        ...profileData,
        age: profileData.birth_date ? calculateAge(profileData.birth_date) : null,
      };
      setProfileData(updatedData);
      setOriginalData(updatedData);

      setIsEditing(false);
      Alert.alert(
        t('profile.personal_info.success.title'),
        t('profile.personal_info.success.saved')
      );
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert(
        t('profile.personal_info.errors.title'),
        error.message || t('profile.personal_info.errors.save_failed')
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setProfileData(originalData);
    setIsEditing(false);
    clearResults();
  };

  const updateField = (field: keyof ProfileData, value: any) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
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
      year: 'numeric',
    });
  };

  const getGenderLabel = (value: string) => {
    const option = genderOptions.find((o) => o.value === value);
    return option ? `${option.icon} ${t(option.label)}` : '';
  };

  const getCountryLabel = (countryCode: string) => {
    const country = countries.find((c) => c.country_code === countryCode);
    return country ? country.country_name : '';
  };

  const getCityLabel = (cityName: string) => {
    return cityName ? cityName : '';
  };

  const normalizePhoneCode = (phoneCode: string): string => {
    if (!phoneCode) return '';
    const cleanCode = phoneCode.replace(/^\++/, '');
    return `+${cleanCode}`;
  };

  // Actualizar prefijo telefónico cuando cambia el país
  useEffect(() => {
    if (profileData.country && isEditing) {
      const country = countries.find((c) => c.country_code === profileData.country);
      if (country) {
        const phoneCode = normalizePhoneCode(country.phone_code);
        updateField('country_code', phoneCode);
      }
    }
  }, [profileData.country, countries, isEditing]);

  if (loading && !isEditing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>{t('profile.personal_info.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('profile.personal_info.title')}</Text>

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
              {isEditing ? t('profile.personal_info.save') : t('profile.personal_info.edit')}
            </Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Información Básica */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.personal_info.basic_info')}</Text>

              {/* Nombre Completo */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  {t('profile.personal_info.full_name_required')}
                </Text>
                {isEditing ? (
                  <TextInput
                    style={styles.textInput}
                    value={profileData.full_name}
                    onChangeText={(text) => updateField('full_name', text)}
                    placeholder={t('profile.personal_info.full_name_placeholder')}
                    placeholderTextColor="rgba(0,0,0,0.5)"
                  />
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.full_name || t('profile.personal_info.not_specified')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Fecha de Nacimiento y Edad */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{t('profile.personal_info.birth_date')}</Text>
                {isEditing ? (
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar" size={20} color="#6366F1" />
                    <Text
                      style={[
                        styles.dateButtonText,
                        {
                          color: profileData.birth_date ? '#1F2937' : 'rgba(0,0,0,0.5)',
                        },
                      ]}
                    >
                      {profileData.birth_date
                        ? formatDate(profileData.birth_date)
                        : t('profile.personal_info.birth_date_placeholder')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.birth_date
                        ? formatDate(profileData.birth_date)
                        : t('profile.personal_info.not_specified')}
                    </Text>
                  </View>
                )}

                {/* Mostrar edad calculada */}
                {profileData.age !== null && (
                  <View style={styles.ageContainer}>
                    <Ionicons name="time" size={16} color="#6366F1" />
                    <Text style={styles.ageText}>
                      {t('profile.personal_info.age_years', { years: profileData.age })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Género */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{t('profile.personal_info.gender')}</Text>
                {isEditing ? (
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowGenderPicker(true)}
                  >
                    <Text style={styles.pickerButtonText}>
                      {profileData.gender
                        ? getGenderLabel(profileData.gender)
                        : t('profile.personal_info.gender_placeholder')}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6366F1" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.gender
                        ? getGenderLabel(profileData.gender)
                        : t('profile.personal_info.not_specified')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Información de Ubicación */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.personal_info.location')}</Text>

              {/* País */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{t('profile.personal_info.country')}</Text>
                {isEditing ? (
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowCountryPicker(true)}
                    disabled={countriesLoading}
                  >
                    <Text style={styles.pickerButtonText}>
                      {profileData.country
                        ? getCountryLabel(profileData.country)
                        : t('profile.personal_info.country_placeholder')}
                    </Text>
                    {countriesLoading ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <Ionicons name="chevron-down" size={20} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.country
                        ? getCountryLabel(profileData.country)
                        : t('profile.personal_info.not_specified')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Ciudad/Estado */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{t('profile.personal_info.city_state')}</Text>
                {isEditing ? (
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      (!profileData.country || citiesLoading) && styles.pickerButtonDisabled,
                    ]}
                    onPress={() => setShowCityPicker(true)}
                    disabled={!profileData.country || citiesLoading}
                  >
                    <Text
                      style={[
                        styles.pickerButtonText,
                        (!profileData.country || citiesLoading) && styles.pickerButtonTextDisabled,
                      ]}
                    >
                      {!profileData.country
                        ? t('profile.personal_info.select_country_first')
                        : citiesLoading
                          ? t('profile.personal_info.loading_cities')
                          : profileData.city_state
                            ? getCityLabel(profileData.city_state)
                            : t('profile.personal_info.city_state_placeholder')}
                    </Text>
                    {citiesLoading ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={!profileData.country ? '#ccc' : '#6366F1'}
                      />
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.city_state
                        ? getCityLabel(profileData.city_state)
                        : t('profile.personal_info.not_specified')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Dirección */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{t('profile.personal_info.address')}</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={profileData.address}
                    onChangeText={(text) => updateField('address', text)}
                    placeholder={t('profile.personal_info.address_placeholder')}
                    placeholderTextColor="rgba(0,0,0,0.5)"
                    multiline
                    numberOfLines={3}
                  />
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.address || t('profile.personal_info.not_specified')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Información de Contacto */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.personal_info.contact')}</Text>

              {/* Teléfono */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{t('profile.personal_info.mobile_phone')}</Text>
                {isEditing ? (
                  <View style={styles.phoneContainer}>
                    <View style={styles.countryCodeContainer}>
                      <TextInput
                        style={[styles.textInput, styles.countryCodeInput]}
                        value={profileData.country_code}
                        placeholder="+XX"
                        placeholderTextColor="rgba(0,0,0,0.5)"
                        editable={false}
                      />
                    </View>
                    <TextInput
                      style={[styles.textInput, styles.phoneInput]}
                      value={profileData.mobile_phone}
                      onChangeText={(text) => {
                        const cleanText = text.replace(/[^0-9\s]/g, '');
                        updateField('mobile_phone', cleanText);
                      }}
                      placeholder={t('profile.personal_info.mobile_phone_placeholder')}
                      placeholderTextColor="rgba(0,0,0,0.5)"
                      keyboardType="phone-pad"
                      editable={!!profileData.country_code}
                    />
                  </View>
                ) : (
                  <View style={styles.displayField}>
                    <Text style={styles.displayText}>
                      {profileData.country_code && profileData.mobile_phone
                        ? `${profileData.country_code} ${profileData.mobile_phone}`
                        : t('profile.personal_info.not_specified')}
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
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit} disabled={loading}>
              <Text style={styles.cancelButtonText}>{t('profile.personal_info.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { opacity: loading ? 0.6 : 1 }]}
              onPress={saveProfileData}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{t('profile.personal_info.save_changes')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Date Picker para iOS */}
      {showDatePicker && Platform.OS === 'ios' && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerCancel}>
                  {t('profile.personal_info.date_picker.cancel')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>{t('profile.personal_info.date_picker.title')}</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerDone}>{t('profile.personal_info.date_picker.done')}</Text>
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

      {/* Gender Picker */}
      {showGenderPicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Text style={styles.pickerCancel}>
                  {t('profile.personal_info.date_picker.cancel')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>
                {t('profile.personal_info.gender_picker.title')}
              </Text>
              <View style={styles.pickerHeaderSpacer} />
            </View>
            <ScrollView style={styles.pickerContent}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    profileData.gender === option.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    updateField('gender', option.value);
                    setShowGenderPicker(false);
                  }}
                >
                  <Ionicons name={option.icon as any} size={24} color="#6366F1" />
                  <Text
                    style={[
                      styles.pickerOptionText,
                      profileData.gender === option.value && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {t(option.label)}
                  </Text>
                  {profileData.gender === option.value && (
                    <Ionicons name="checkmark" size={20} color="#6366F1" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Country Picker */}
      {showCountryPicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Text style={styles.pickerCancel}>
                  {t('profile.personal_info.date_picker.cancel')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>
                {t('profile.personal_info.country_picker.title')}
              </Text>
              <View style={styles.pickerHeaderSpacer} />
            </View>
            <ScrollView style={styles.pickerContent}>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country.country_code}
                  style={[
                    styles.pickerOption,
                    profileData.country === country.country_code && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    updateField('country', country.country_code);
                    updateField('city_state', ''); // Limpiar ciudad cuando cambia país
                    setShowCountryPicker(false);
                  }}
                >
                  <Ionicons name="earth-outline" size={24} color="#6366F1" />
                  <View style={styles.countryOptionContent}>
                    <Text
                      style={[
                        styles.pickerOptionText,
                        profileData.country === country.country_code &&
                          styles.pickerOptionTextSelected,
                      ]}
                    >
                      {country.country_name}
                    </Text>
                    <Text style={styles.phoneCodeText}>{country.phone_code}</Text>
                  </View>
                  {profileData.country === country.country_code && (
                    <Ionicons name="checkmark" size={20} color="#6366F1" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* City Picker */}
      {showCityPicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowCityPicker(false);
                  setCitySearchQuery('');
                  setDisplayedCitiesCount(50);
                }}
              >
                <Text style={styles.pickerCancel}>
                  {t('profile.personal_info.date_picker.cancel')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>{t('profile.personal_info.city_picker.title')}</Text>
              <View style={styles.pickerHeaderSpacer} />
            </View>

            {/* Información y búsqueda */}
            <View style={styles.citySearchContainer}>
              {cities.length > 10 && (
                <TextInput
                  value={citySearchQuery}
                  onChangeText={setCitySearchQuery}
                  placeholder={t('profile.personal_info.city_picker.search_placeholder')}
                  style={styles.searchInput}
                  placeholderTextColor="#666"
                  clearButtonMode="while-editing"
                />
              )}
              <Text style={styles.cityCountText}>
                {citySearchQuery
                  ? t('profile.personal_info.city_picker.results_count', {
                      count: filteredAndPaginatedCities.length,
                    })
                  : t('profile.personal_info.city_picker.showing_count', {
                      showing: Math.min(displayedCitiesCount, cities.length),
                      total: cities.length,
                    })}
              </Text>
            </View>

            {cities.length === 0 && !citiesLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {t('profile.personal_info.city_picker.no_cities')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredAndPaginatedCities}
                keyExtractor={(item) => `${item.city}-${item.latitude}-${item.longitude}`}
                renderItem={({ item }) => (
                  <CityItem
                    item={item}
                    isSelected={profileData.city_state === item.city}
                    onPress={() => {
                      updateField('city_state', item.city);
                      setShowCityPicker(false);
                      setCitySearchQuery('');
                      setDisplayedCitiesCount(50);
                    }}
                  />
                )}
                style={styles.pickerContent}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={10}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                  length: 70, // altura aproximada de cada item
                  offset: 70 * index,
                  index,
                })}
                onEndReached={loadMoreCities}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => {
                  if (displayedCitiesCount < cities.length && !citySearchQuery) {
                    return (
                      <View style={styles.loadMoreFooterContainer}>
                        <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreCities}>
                          <Text style={styles.loadMoreText}>
                            {t('profile.personal_info.city_picker.load_more', {
                              remaining: cities.length - displayedCitiesCount,
                            })}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  return null;
                }}
              />
            )}
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
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: 'white',
    flex: 1,
    textAlign: 'center' as const,
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center' as const,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600' as const,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1f2937',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
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
    textAlignVertical: 'top' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 8,
    backgroundColor: '#F0F4FF',
    padding: 8,
    borderRadius: 8,
  },
  ageText: {
    fontSize: 14,
    color: '#6366F1',
    marginLeft: 6,
    fontWeight: '500' as const,
  },
  pickerButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
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
  pickerButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  pickerButtonTextDisabled: {
    color: '#9CA3AF',
  },
  phoneContainer: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  countryCodeContainer: {
    flex: 1,
  },
  countryCodeInput: {
    textAlign: 'center' as const,
    fontWeight: '600' as const,
    backgroundColor: '#F9FAFB',
  },
  phoneInput: {
    flex: 2,
  },
  actionButtons: {
    flexDirection: 'row' as const,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: 'white',
  },
  // Estilos para los pickers modales
  pickerOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.7,
  },
  pickerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1A1A1A',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#6366F1',
  },
  pickerDone: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600' as const,
  },
  pickerContent: {
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
  datePicker: {
    backgroundColor: 'white',
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  cityCountText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center' as const,
  },
  loadMoreButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#6366F1',
    textAlign: 'center' as const,
    fontWeight: '600' as const,
  },
  // Picker header spacer
  pickerHeaderSpacer: {
    width: 60,
  },
  // City search container
  citySearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  // Load more footer container
  loadMoreFooterContainer: {
    padding: 20,
    alignItems: 'center' as const,
  },
});
