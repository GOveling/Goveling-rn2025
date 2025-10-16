import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { affiliates } from '~/lib/affiliates';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HotelBookingModalProps {
  visible: boolean;
  onClose: () => void;
  destination?: string;
}

interface BookingFilters {
  destination: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  rooms: number;
  priceRange: {
    min: number;
    max: number;
  };
  hotelType: 'all' | 'hotel' | 'resort' | 'hostel' | 'apartment';
  amenities: string[];
}

const hotelTypes = [
  { value: 'all', label: 'Todos', icon: '🏨' },
  { value: 'hotel', label: 'Hoteles', icon: '🏨' },
  { value: 'resort', label: 'Resorts', icon: '🏖️' },
  { value: 'hostel', label: 'Hostales', icon: '🏠' },
  { value: 'apartment', label: 'Apartamentos', icon: '🏢' },
];

const popularAmenities = [
  { id: 'wifi', label: 'WiFi Gratis', icon: '📶' },
  { id: 'pool', label: 'Piscina', icon: '🏊‍♂️' },
  { id: 'gym', label: 'Gimnasio', icon: '💪' },
  { id: 'spa', label: 'Spa', icon: '🧖‍♀️' },
  { id: 'parking', label: 'Estacionamiento', icon: '🚗' },
  { id: 'breakfast', label: 'Desayuno', icon: '🥞' },
  { id: 'restaurant', label: 'Restaurante', icon: '🍽️' },
  { id: 'bar', label: 'Bar', icon: '🍸' },
  { id: 'room-service', label: 'Room Service', icon: '🛎️' },
  { id: 'air-conditioning', label: 'Aire Acondicionado', icon: '❄️' },
];

export default function HotelBookingModal({
  visible,
  onClose,
  destination = '',
}: HotelBookingModalProps) {
  const [filters, setFilters] = useState<BookingFilters>({
    destination: destination,
    checkIn: new Date(),
    checkOut: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    guests: 2,
    rooms: 1,
    priceRange: { min: 0, max: 500 },
    hotelType: 'all',
    amenities: [],
  });

  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [activeSection, setActiveSection] = useState<'search' | 'filters'>('search');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateNights = () => {
    const diffTime = filters.checkOut.getTime() - filters.checkIn.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  };

  const toggleAmenity = (amenityId: string) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter((id) => id !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  };

  const searchHotels = async () => {
    if (!filters.destination.trim()) {
      Alert.alert('Error', 'Por favor ingresa un destino');
      return;
    }

    try {
      // Use the affiliates system to open hotel booking
      const hotelQuery = {
        city: filters.destination,
        checkin: filters.checkIn.toISOString().split('T')[0],
        checkout: filters.checkOut.toISOString().split('T')[0],
        guests: filters.guests,
        rooms: filters.rooms,
      };

      await affiliates.hotels.open(hotelQuery);
      onClose();
    } catch (error) {
      console.error('Error opening hotel booking:', error);
      Alert.alert('Error', 'No se pudo abrir la búsqueda de hoteles');
    }
  };

  const renderSearchSection = () => (
    <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
      {/* Destination */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Destino</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color="#8B5CF6" />
          <TextInput
            style={styles.textInput}
            placeholder="¿A dónde viajas?"
            value={filters.destination}
            onChangeText={(text) => setFilters((prev) => ({ ...prev, destination: text }))}
          />
        </View>
      </View>

      {/* Dates */}
      <View style={styles.dateContainer}>
        <View style={styles.dateGroup}>
          <Text style={styles.label}>Check-in</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowCheckInPicker(true)}>
            <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
            <Text style={styles.dateText}>{formatDate(filters.checkIn)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateGroup}>
          <Text style={styles.label}>Check-out</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowCheckOutPicker(true)}>
            <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
            <Text style={styles.dateText}>{formatDate(filters.checkOut)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nights Display */}
      <View style={styles.nightsInfo}>
        <Text style={styles.nightsText}>
          {calculateNights()} {calculateNights() === 1 ? 'noche' : 'noches'}
        </Text>
      </View>

      {/* Guests and Rooms */}
      <View style={styles.guestsContainer}>
        <View style={styles.counterGroup}>
          <Text style={styles.label}>Huéspedes</Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() =>
                setFilters((prev) => ({ ...prev, guests: Math.max(1, prev.guests - 1) }))
              }
            >
              <Ionicons name="remove" size={20} color="#8B5CF6" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{filters.guests}</Text>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() =>
                setFilters((prev) => ({ ...prev, guests: Math.min(20, prev.guests + 1) }))
              }
            >
              <Ionicons name="add" size={20} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.counterGroup}>
          <Text style={styles.label}>Habitaciones</Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() =>
                setFilters((prev) => ({ ...prev, rooms: Math.max(1, prev.rooms - 1) }))
              }
            >
              <Ionicons name="remove" size={20} color="#8B5CF6" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{filters.rooms}</Text>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() =>
                setFilters((prev) => ({ ...prev, rooms: Math.min(10, prev.rooms + 1) }))
              }
            >
              <Ionicons name="add" size={20} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Button */}
      <TouchableOpacity style={styles.searchButton} onPress={searchHotels}>
        <LinearGradient
          colors={['#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.searchButtonGradient}
        >
          <Ionicons name="search" size={20} color="white" />
          <Text style={styles.searchButtonText}>Buscar Hoteles</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Quick Filters */}
      <View style={styles.quickFilters}>
        <Text style={styles.sectionTitle}>Filtros Rápidos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChips}>
            {hotelTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.filterChip,
                  filters.hotelType === type.value && styles.filterChipSelected,
                ]}
                onPress={() => setFilters((prev) => ({ ...prev, hotelType: type.value as any }))}
              >
                <Text style={styles.filterChipIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.filterChipText,
                    filters.hotelType === type.value && styles.filterChipTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Popular Amenities */}
      <View style={styles.amenitiesSection}>
        <Text style={styles.sectionTitle}>Servicios Populares</Text>
        <View style={styles.amenitiesGrid}>
          {popularAmenities.map((amenity) => (
            <TouchableOpacity
              key={amenity.id}
              style={[
                styles.amenityChip,
                filters.amenities.includes(amenity.id) && styles.amenityChipSelected,
              ]}
              onPress={() => toggleAmenity(amenity.id)}
            >
              <Text style={styles.amenityIcon}>{amenity.icon}</Text>
              <Text
                style={[
                  styles.amenityText,
                  filters.amenities.includes(amenity.id) && styles.amenityTextSelected,
                ]}
              >
                {amenity.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Buscar Hoteles</Text>
            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>{renderSearchSection()}</View>

        {/* Date Pickers */}
        {showCheckInPicker && (
          <DateTimePicker
            value={filters.checkIn}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowCheckInPicker(false);
              if (selectedDate) {
                setFilters((prev) => {
                  const updatedFilters = { ...prev, checkIn: selectedDate };
                  // Adjust checkout if necessary
                  if (selectedDate >= prev.checkOut) {
                    const newCheckOut = new Date(selectedDate);
                    newCheckOut.setDate(newCheckOut.getDate() + 1);
                    updatedFilters.checkOut = newCheckOut;
                  }
                  return updatedFilters;
                });
              }
            }}
          />
        )}

        {showCheckOutPicker && (
          <DateTimePicker
            value={filters.checkOut}
            mode="date"
            display="default"
            minimumDate={new Date(filters.checkIn.getTime() + 24 * 60 * 60 * 1000)}
            onChange={(event, selectedDate) => {
              setShowCheckOutPicker(false);
              if (selectedDate) {
                setFilters((prev) => ({ ...prev, checkOut: selectedDate }));
              }
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: 'white',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  dateContainer: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 12,
  },
  dateGroup: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#374151',
  },
  nightsInfo: {
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  nightsText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500' as const,
  },
  guestsContainer: {
    flexDirection: 'row' as const,
    gap: 20,
    marginBottom: 20,
  },
  counterGroup: {
    flex: 1,
  },
  counterContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'space-between' as const,
  },
  counterButton: {
    padding: 8,
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#374151',
    minWidth: 40,
    textAlign: 'center' as const,
  },
  searchButton: {
    marginBottom: 30,
    borderRadius: 12,
    overflow: 'hidden' as const,
  },
  searchButtonGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 16,
    gap: 12,
  },
  searchButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: 'white',
  },
  quickFilters: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 16,
  },
  filterChips: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  filterChipSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterChipIcon: {
    fontSize: 16,
  },
  filterChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500' as const,
  },
  filterChipTextSelected: {
    color: 'white',
  },
  amenitiesSection: {
    marginBottom: 20,
  },
  amenitiesGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  amenityChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  amenityChipSelected: {
    backgroundColor: '#EBF8FF',
    borderColor: '#3B82F6',
  },
  amenityIcon: {
    fontSize: 14,
  },
  amenityText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  amenityTextSelected: {
    color: '#3B82F6',
  },
};
