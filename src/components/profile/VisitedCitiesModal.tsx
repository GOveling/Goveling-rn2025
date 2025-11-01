/**
 * VisitedCitiesModal - Lista histórica de ciudades visitadas
 * Muestra cronología de visitas con iconos, fechas y retornos
 * Agrupadas por país para mejor organización
 */

import React, { useEffect, useState } from 'react';

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { supabase } from '~/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CityVisit {
  id: number;
  city_name: string;
  state_name: string | null;
  country_code: string;
  country_name: string;
  entry_date: string;
  is_return: boolean;
  places_count: number;
  previous_city_name: string | null;
  previous_country_code: string | null;
}

interface VisitedCitiesModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

export function VisitedCitiesModal({ visible, onClose, userId }: VisitedCitiesModalProps) {
  const [visits, setVisits] = useState<CityVisit[]>([]);
  const [loading, setLoading] = useState(false);

  console.log('🗺️ VisitedCitiesModal rendered:', { visible, userId, visitsCount: visits.length });

  useEffect(() => {
    if (visible) {
      console.log('🗺️ Modal visible - loading visits for user:', userId);
      loadVisits();
    }
  }, [visible, userId]);

  const loadVisits = async () => {
    try {
      setLoading(true);
      console.log('🏙️ Loading city visits for user:', userId);

      const { data, error } = await supabase
        .from('city_visits')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });

      if (error) {
        console.error('❌ Error loading city visits:', error);
        return;
      }

      console.log('✅ City visits loaded:', {
        count: data?.length || 0,
        visits: data?.map((v) => `${v.city_name}, ${v.country_code}`),
      });

      setVisits(data || []);
    } catch (error) {
      console.error('❌ Exception loading city visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoy a las ${date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
    }

    return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getTotalCities = (): number => {
    const uniqueCities = new Set(visits.map((v) => `${v.city_name}|${v.country_code}`));
    return uniqueCities.size;
  };

  const getReturnCount = (): number => {
    return visits.filter((v) => v.is_return).length;
  };

  /**
   * Group visits by country for better organization
   */
  const groupByCountry = (): { [countryName: string]: CityVisit[] } => {
    const groups: { [countryName: string]: CityVisit[] } = {};

    visits.forEach((visit) => {
      if (!groups[visit.country_name]) {
        groups[visit.country_name] = [];
      }
      groups[visit.country_name].push(visit);
    });

    return groups;
  };

  const groupedVisits = groupByCountry();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Ciudades Exploradas</Text>
            <Text style={styles.subtitle}>
              {getTotalCities()} {getTotalCities() === 1 ? 'ciudad única' : 'ciudades únicas'} •{' '}
              {visits.length} {visits.length === 1 ? 'visita' : 'visitas'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#1a1a1a" />
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
            <Text style={styles.emptyIcon}>🏙️</Text>
            <Text style={styles.emptyTitle}>Sin ciudades exploradas aún</Text>
            <Text style={styles.emptyDescription}>
              Activa el Modo Travel y comienza a explorar el mundo. Cada vez que llegues a una nueva
              ciudad, se registrará automáticamente aquí.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="business" size={24} color="#4F8EF7" />
                <Text style={styles.statNumber}>{getTotalCities()}</Text>
                <Text style={styles.statLabel}>
                  {getTotalCities() === 1 ? 'Ciudad Única' : 'Ciudades Únicas'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="repeat" size={24} color="#FF8C42" />
                <Text style={styles.statNumber}>{getReturnCount()}</Text>
                <Text style={styles.statLabel}>
                  {getReturnCount() === 1 ? 'Retorno' : 'Retornos'}
                </Text>
              </View>
            </View>

            {/* Grouped Visits by Country */}
            <View style={styles.visitsSection}>
              {Object.keys(groupedVisits)
                .sort()
                .map((countryName) => (
                  <View key={countryName} style={styles.countryGroup}>
                    {/* Country Header */}
                    <View style={styles.countryHeader}>
                      <Ionicons name="location" size={16} color="#666" />
                      <Text style={styles.countryHeaderText}>{countryName}</Text>
                      <Text style={styles.countryHeaderCount}>
                        {groupedVisits[countryName].length}{' '}
                        {groupedVisits[countryName].length === 1 ? 'visita' : 'visitas'}
                      </Text>
                    </View>

                    {/* Cities in this country */}
                    {groupedVisits[countryName].map((visit) => (
                      <View key={visit.id} style={styles.visitCard}>
                        <View style={styles.visitIconContainer}>
                          <Ionicons
                            name={visit.is_return ? 'repeat' : 'business'}
                            size={24}
                            color={visit.is_return ? '#FF8C42' : '#4F8EF7'}
                          />
                        </View>

                        <View style={styles.visitInfo}>
                          <View style={styles.visitHeader}>
                            <Text style={styles.cityName}>
                              {visit.city_name}
                              {visit.is_return && ' ↩️'}
                            </Text>
                          </View>

                          {visit.state_name && (
                            <Text style={styles.stateName}>{visit.state_name}</Text>
                          )}

                          <Text style={styles.visitDate}>{formatDate(visit.entry_date)}</Text>

                          {visit.is_return && (
                            <View style={styles.returnBadge}>
                              <Text style={styles.returnBadgeText}>Retorno</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
            </View>

            {/* Bottom Padding */}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  visitsSection: {
    paddingHorizontal: 20,
  },
  countryGroup: {
    marginBottom: 24,
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  countryHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  countryHeaderCount: {
    fontSize: 13,
    color: '#999',
  },
  visitCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  visitIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  visitInfo: {
    flex: 1,
  },
  visitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cityName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  stateName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  visitDate: {
    fontSize: 13,
    color: '#999',
  },
  returnBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFF4E8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  returnBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
});
