import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';

interface Visit {
  id: string;
  place_name: string;
  visited_at: string;
  city: string | null;
  country_code: string | null;
  lat: number;
  lng: number;
}

interface VisitedPlacesModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

export const VisitedPlacesModal: React.FC<VisitedPlacesModalProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      loadVisits();
    }
  }, [visible, userId]);

  const loadVisits = async () => {
    try {
      setLoading(true);
      console.log('📍 Loading visits for user:', userId);

      const { data, error } = await supabase
        .from('trip_visits')
        .select('*')
        .eq('user_id', userId)
        .order('visited_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading visits:', error);
        Alert.alert('Error', 'No se pudieron cargar las visitas');
        return;
      }

      console.log('✅ Visits loaded:', data?.length || 0);
      setVisits(data || []);
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar las visitas');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return `Hoy a las ${date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (diffInDays === 1) {
      return `Ayer a las ${date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (diffInDays < 7) {
      return `Hace ${diffInDays} días`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return '🌍';

    const flags: Record<string, string> = {
      CL: '🇨🇱',
      US: '🇺🇸',
      MX: '🇲🇽',
      AR: '🇦🇷',
      BR: '🇧🇷',
      ES: '🇪🇸',
      FR: '🇫🇷',
      IT: '🇮🇹',
      GB: '🇬🇧',
      DE: '🇩🇪',
    };

    return flags[countryCode] || '🌍';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="location" size={24} color="#007AFF" />
              <Text style={styles.headerTitle}>Lugares Visitados</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando visitas...</Text>
            </View>
          ) : visits.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Sin visitas aún</Text>
              <Text style={styles.emptyText}>
                Activa el Travel Mode y confirma tus visitas a lugares para verlos aquí
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.subtitle}>
                {visits.length} {visits.length === 1 ? 'lugar visitado' : 'lugares visitados'}
              </Text>

              {visits.map((visit) => (
                <View key={visit.id} style={styles.visitCard}>
                  <View style={styles.visitHeader}>
                    <View style={styles.visitIconContainer}>
                      <Ionicons name="location-sharp" size={20} color="#007AFF" />
                    </View>
                    <View style={styles.visitInfo}>
                      <Text style={styles.visitName} numberOfLines={2}>
                        {visit.place_name}
                      </Text>
                      <View style={styles.visitMeta}>
                        <Text style={styles.visitFlag}>{getCountryFlag(visit.country_code)}</Text>
                        {visit.city && <Text style={styles.visitCity}>{visit.city}</Text>}
                      </View>
                    </View>
                  </View>
                  <View style={styles.visitFooter}>
                    <Ionicons name="time-outline" size={14} color="#999" />
                    <Text style={styles.visitDate}>{formatDate(visit.visited_at)}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.bottomPadding} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  visitCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  visitHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  visitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  visitInfo: {
    flex: 1,
  },
  visitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  visitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visitFlag: {
    fontSize: 16,
  },
  visitCity: {
    fontSize: 14,
    color: '#666',
  },
  visitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  visitDate: {
    fontSize: 13,
    color: '#999',
  },
  bottomPadding: {
    height: 20,
  },
});
