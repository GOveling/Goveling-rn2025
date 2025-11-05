import React, { useState, useEffect, useCallback } from 'react';

import { View, Text, ActivityIndicator, Alert } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTranslation } from 'react-i18next';

import TripDetailsModal from '~/components/TripDetailsModal';
import { supabase } from '~/lib/supabase';

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
  has_defined_dates?: boolean;
  timezone?: string;
  created_at: string;
  updated_at?: string;
}

export default function TripDetailScreen() {
  const { id, openManageTeam, tab } = useLocalSearchParams<{
    id: string;
    openManageTeam?: string;
    tab?: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTrip = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('trips').select('*').eq('id', id).single();

      if (error) {
        console.error('Error loading trip:', error);
        Alert.alert(t('common.error'), t('trips.detail.error_loading'));
        router.back();
        return;
      }

      setTrip(data);
    } catch (error) {
      console.error('Error loading trip:', error);
      Alert.alert(t('common.error'), t('trips.detail.error_loading'));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router, t]);

  useEffect(() => {
    if (id) {
      loadTrip();
    }
  }, [id, loadTrip]);

  const handleClose = () => {
    router.back();
  };

  const handleTripUpdate = (updatedTrip: TripData) => {
    setTrip(updatedTrip);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>{t('trips.detail.loading')}</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#6B7280' }}>{t('trips.detail.not_found')}</Text>
      </View>
    );
  }

  // Determine the manage team tab from query params
  const manageTeamTab =
    tab === 'invitations'
      ? 'invitations'
      : tab === 'members'
        ? 'members'
        : tab === 'history'
          ? 'history'
          : 'invitations';

  return (
    <TripDetailsModal
      visible={true}
      onClose={handleClose}
      trip={trip}
      onTripUpdate={handleTripUpdate}
      initialTab={openManageTeam === 'true' ? 'team' : 'overview'}
      openManageTeam={openManageTeam === 'true'}
      manageTeamTab={manageTeamTab}
    />
  );
}
