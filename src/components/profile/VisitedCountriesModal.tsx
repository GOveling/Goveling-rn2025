/**
 * VisitedCountriesModal - Lista histórica de países visitados
 * Muestra cronología de visitas con banderas, fechas y retornos
 * Optimizado para iOS y Android
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
import { countryDetectionService } from '~/services/travelMode/CountryDetectionService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CountryVisit {
  id: number;
  country_code: string;
  country_name: string;
  entry_date: string;
  is_return: boolean;
  places_count: number;
  previous_country_code: string | null;
}

interface VisitedCountriesModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

export function VisitedCountriesModal({ visible, onClose, userId }: VisitedCountriesModalProps) {
  const [visits, setVisits] = useState<CountryVisit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadVisits();
    }
  }, [visible]);

  const loadVisits = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('country_visits')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });

      if (error) {
        console.error('Error loading country visits:', error);
        return;
      }

      setVisits(data || []);
    } catch (error) {
      console.error('Error loading country visits:', error);
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

  const getCountryInfo = (countryCode: string) => {
    return countryDetectionService.getCountryInfoByCode(countryCode);
  };

  const getTotalCountries = (): number => {
    const uniqueCountries = new Set(visits.map((v) => v.country_code));
    return uniqueCountries.size;
  };

  const getReturnCount = (): number => {
    return visits.filter((v) => v.is_return).length;
  };

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
            <Text style={styles.title}>Países Visitados</Text>
            <Text style={styles.subtitle}>
              {getTotalCountries()} {getTotalCountries() === 1 ? 'país único' : 'países únicos'} •{' '}
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
            <Text style={styles.emptyIcon}>🌍</Text>
            <Text style={styles.emptyTitle}>Sin países visitados aún</Text>
            <Text style={styles.emptyDescription}>
              Activa el Modo Travel y comienza a explorar el mundo. Cada vez que llegues a un nuevo
              país, se registrará automáticamente aquí.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={Platform.OS === 'ios'}
          >
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{getTotalCountries()}</Text>
                <Text style={styles.statLabel}>Países Únicos</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{getReturnCount()}</Text>
                <Text style={styles.statLabel}>Retornos</Text>
              </View>
            </View>

            {/* Visits List */}
            <Text style={styles.sectionTitle}>Cronología de Visitas</Text>

            {visits.map((visit, index) => {
              const countryInfo = getCountryInfo(visit.country_code);
              const isFirst = index === visits.length - 1; // First visit ever

              return (
                <View key={visit.id} style={styles.visitCard}>
                  {/* Timeline Dot */}
                  <View style={styles.timelineContainer}>
                    <View style={[styles.timelineDot, isFirst && styles.timelineDotFirst]} />
                    {index < visits.length - 1 && <View style={styles.timelineLine} />}
                  </View>

                  {/* Visit Info */}
                  <View style={styles.visitContent}>
                    <View style={styles.visitHeader}>
                      <Text style={styles.countryFlag}>{countryInfo?.countryFlag || '🌍'}</Text>
                      <View style={styles.visitHeaderText}>
                        <Text style={styles.countryName}>{visit.country_name}</Text>
                        <Text style={styles.visitDate}>{formatDate(visit.entry_date)}</Text>
                      </View>
                    </View>

                    {/* Badges */}
                    <View style={styles.badgesContainer}>
                      {isFirst && (
                        <View style={styles.badge}>
                          <Ionicons name="trophy" size={14} color="#FFD700" />
                          <Text style={styles.badgeText}>Primera visita</Text>
                        </View>
                      )}
                      {visit.is_return && (
                        <View style={[styles.badge, styles.returnBadge]}>
                          <Ionicons name="repeat" size={14} color="#007AFF" />
                          <Text style={styles.badgeText}>Retorno</Text>
                        </View>
                      )}
                      {visit.places_count > 0 && (
                        <View style={styles.badge}>
                          <Ionicons name="location" size={14} color="#34C759" />
                          <Text style={styles.badgeText}>
                            {visit.places_count} {visit.places_count === 1 ? 'lugar' : 'lugares'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Previous Country Flow */}
                    {visit.previous_country_code && (
                      <View style={styles.flowContainer}>
                        <Ionicons name="arrow-back" size={14} color="#999" />
                        <Text style={styles.flowText}>
                          Desde{' '}
                          {getCountryInfo(visit.previous_country_code)?.countryName ||
                            visit.previous_country_code}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
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
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
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
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  visitCard: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  timelineDotFirst: {
    backgroundColor: '#FFD700',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
      },
    }),
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#e0e0e0',
    marginTop: 4,
  },
  visitContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  visitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  countryFlag: {
    fontSize: 40,
  },
  visitHeaderText: {
    flex: 1,
  },
  countryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  visitDate: {
    fontSize: 14,
    color: '#666',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  returnBadge: {
    backgroundColor: '#e8f4ff',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  flowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  flowText: {
    fontSize: 13,
    color: '#999',
  },
});
