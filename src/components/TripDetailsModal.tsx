import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Switch,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '~/lib/supabase';
import { getTripStats, getCountryFlag, TripStats } from '~/lib/tripUtils';
import { getCurrentUser, getTripCollaborators, getTripOwner, UserProfile } from '~/lib/userUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  timezone?: string;
  created_at: string;
  updated_at?: string;
}

interface TripDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  trip: TripData;
  onTripUpdate?: (updatedTrip: TripData) => void;
}

type TabType = 'overview' | 'itinerary' | 'team';

const TripDetailsModal: React.FC<TripDetailsModalProps> = ({
  visible,
  onClose,
  trip,
  onTripUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [tripData, setTripData] = useState<TripStats>({
    collaboratorsCount: 1,
    placesCount: 0,
    countries: [],
    countryCodes: [],
    categories: [],
    collaborators: [],
    firstPlaceImage: undefined,
  });
  const [editableTrip, setEditableTrip] = useState<TripData>(trip);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [tripOwner, setTripOwner] = useState<UserProfile | null>(null);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (visible && trip.id) {
      loadTripStats();
      loadUsers();
      setEditableTrip(trip);
    }
  }, [visible, trip.id]);

  const loadTripStats = async () => {
    try {
      const stats = await getTripStats(trip.id);
      setTripData(stats);
    } catch (error) {
      console.error('Error loading trip stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const [user, owner, collabs] = await Promise.all([
        getCurrentUser(),
        getTripOwner(trip.id),
        getTripCollaborators(trip.id),
      ]);
      
      setCurrentUser(user);
      setTripOwner(owner);
      setCollaborators(collabs);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const updateTrip = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          title: editableTrip.title,
          description: editableTrip.description,
          start_date: editableTrip.start_date,
          end_date: editableTrip.end_date,
          budget: editableTrip.budget,
          accommodation_preference: editableTrip.accommodation_preference,
          transport_preference: editableTrip.transport_preference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trip.id);

      if (error) {
        Alert.alert('Error', 'No se pudo actualizar el viaje');
        return;
      }

      setIsEditing(false);
      onTripUpdate?.(editableTrip);
      Alert.alert('Éxito', 'Viaje actualizado correctamente');
    } catch (error) {
      console.error('Error updating trip:', error);
      Alert.alert('Error', 'Ocurrió un error al actualizar el viaje');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTripStatus = () => {
    if (!editableTrip.start_date || !editableTrip.end_date) return 'Planning';
    
    const now = new Date();
    const startDate = new Date(editableTrip.start_date);
    const endDate = new Date(editableTrip.end_date);
    
    if (now < startDate) return 'Upcoming';
    if (now >= startDate && now <= endDate) return 'Traveling';
    if (now > endDate) return 'Completed';
    
    return 'Planning';
  };

  const getStatusConfig = () => {
    const status = getTripStatus();
    const configs = {
      Completed: { bgColor: '#DCFCE7', textColor: '#166534' },
      Upcoming: { bgColor: '#DBEAFE', textColor: '#1E40AF' },
      Planning: { bgColor: '#F3E8FF', textColor: '#6B21A8' },
      Traveling: { bgColor: '#FED7AA', textColor: '#C2410C' },
    };
    return configs[status as keyof typeof configs] || configs.Planning;
  };

  const getUserInitials = (fullName?: string) => {
    if (!fullName) return 'U';
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const TabButton = ({ tab, title }: { tab: TabType; title: string }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      style={{
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: activeTab === tab ? 2 : 0,
        borderBottomColor: '#3B82F6',
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: activeTab === tab ? '600' : '400',
          color: activeTab === tab ? '#3B82F6' : '#6B7280',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const OverviewTab = () => (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      {/* Header con badge de estado */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>
            {editableTrip.title}
          </Text>
        </View>
        <View style={{
          backgroundColor: getStatusConfig().bgColor,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 12,
        }}>
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: getStatusConfig().textColor,
          }}>
            {getTripStatus()}
          </Text>
        </View>
      </View>

      {/* Fechas */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
            Dates
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          {editableTrip.start_date && editableTrip.end_date 
            ? `${formatDate(editableTrip.start_date)} - ${formatDate(editableTrip.end_date)}`
            : 'No dates set'
          }
        </Text>
      </View>

      {/* Viajeros */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="people-outline" size={20} color="#6B7280" />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
            Travelers
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          {tripData.collaboratorsCount} {tripData.collaboratorsCount === 1 ? 'traveler' : 'travelers'}
        </Text>
      </View>

      {/* Destino */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="location-outline" size={20} color="#6B7280" />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
            Destination
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          {tripData.countries.length > 0 ? tripData.countries.join(', ') : 'To be defined'}
        </Text>
      </View>

      {/* Budget */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="card-outline" size={20} color="#6B7280" />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
            Budget
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          {editableTrip.budget ? `$${editableTrip.budget.toLocaleString()}` : '0'}
        </Text>
      </View>

      {/* Descripción */}
      {editableTrip.description && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
            Description
          </Text>
          <Text style={{ fontSize: 16, color: '#6B7280', lineHeight: 24 }}>
            {editableTrip.description}
          </Text>
        </View>
      )}

      {/* Botón de editar */}
      <TouchableOpacity
        onPress={() => Alert.alert('Editar Trip', 'Funcionalidad de edición próximamente disponible')}
        style={{ marginTop: 20 }}
      >
        <LinearGradient
          colors={['#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="pencil" size={20} color="white" />
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
              Edit Trip
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  const TeamTab = () => (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 20 }}>
        Trip Collaborators
      </Text>

      {/* Owner */}
      {tripOwner && (
        <View style={{
          backgroundColor: '#FEF3C7',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#F59E0B',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {tripOwner.avatar_url ? (
              <Image
                source={{ uri: tripOwner.avatar_url }}
                style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
              />
            ) : (
              <View style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#F59E0B',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                  {getUserInitials(tripOwner.full_name)}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                {tripOwner.full_name || 'Usuario'}
                {currentUser?.id === tripOwner.id && ' (You)'}
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>
                {tripOwner.email || 'No email'}
              </Text>
            </View>
            <View style={{
              backgroundColor: '#F59E0B',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                Owner
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Colaboradores */}
      {collaborators.map((collaborator) => (
        <View key={collaborator.id} style={{
          backgroundColor: '#F9FAFB',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {collaborator.avatar_url ? (
              <Image
                source={{ uri: collaborator.avatar_url }}
                style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
              />
            ) : (
              <View style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#6B7280',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                  {getUserInitials(collaborator.full_name)}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                {collaborator.full_name || 'Usuario'}
                {currentUser?.id === collaborator.id && ' (You)'}
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>
                {(collaborator as any).role || 'Colaborador'}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {/* Mensaje si no hay colaboradores */}
      {collaborators.length === 0 && (
        <View style={{
          backgroundColor: '#F3F4F6',
          borderRadius: 12,
          padding: 20,
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <Ionicons name="people-outline" size={32} color="#9CA3AF" />
          <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
            No collaborators yet
          </Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' }}>
            Invite friends to plan together
          </Text>
        </View>
      )}

      {/* Botones de acción */}
      <View style={{ gap: 12, marginTop: 20 }}>
        <TouchableOpacity
          onPress={() => Alert.alert('Chat Grupal', 'Funcionalidad de chat próximamente disponible')}
        >
          <LinearGradient
            colors={['#3B82F6', '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="chatbubble-outline" size={20} color="white" />
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                Chat Grupal
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Alert.alert('Manage Team', 'Funcionalidad de gestión de equipo próximamente disponible')}
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="people" size={20} color="white" />
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                Manage Team
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const ItineraryTab = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Ionicons name="map-outline" size={64} color="#D1D5DB" />
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16, textAlign: 'center' }}>
        Itinerary Coming Soon
      </Text>
      <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
        Plan your day-by-day activities and routes
      </Text>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'team':
        return <TeamTab />;
      case 'itinerary':
        return <ItineraryTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginRight: 8 }}>🌍</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937' }}>
              {trip.title}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Sub-header con información básica */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 4 }}>
                {editableTrip.start_date && editableTrip.end_date 
                  ? `${formatDate(editableTrip.start_date)} - ${formatDate(editableTrip.end_date)}`
                  : 'No dates set'
                }
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="people-outline" size={16} color="#6B7280" />
              <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 4 }}>
                {tripData.collaboratorsCount} traveler{tripData.collaboratorsCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}>
          <TabButton tab="overview" title="Overview" />
          <TabButton tab="itinerary" title="Itinerary" />
          <TabButton tab="team" title="Team" />
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </View>
    </Modal>
  );
};

export default TripDetailsModal;
