import React, { useEffect, useState } from 'react';

import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';

import { useLocalSearchParams, router } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { supabase } from '~/lib/supabase';
import { acceptInvitation } from '~/lib/team';
import { store } from '~/store';
import { tripsApi } from '~/store/api/tripsApi';

/**
 * Screen to handle invitation acceptance via deep link
 * URL format: goveling://accept-invitation?token=abc123...
 */
export default function AcceptInvitationScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('invitations.invalid_link', 'Invalid invitation link'));
      setLoading(false);
      return;
    }

    handleAcceptInvitation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAcceptInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // User not logged in - redirect to login with return URL
        setLoading(false);
        Alert.alert(
          t('invitations.login_required', 'Login Required'),
          t('invitations.login_to_accept', 'Please login to accept this invitation'),
          [
            {
              text: t('common.cancel', 'Cancel'),
              style: 'cancel',
              onPress: () => router.replace('/'),
            },
            {
              text: t('auth.login', 'Login'),
              onPress: () => {
                // Store token for after login
                router.replace({
                  pathname: '/auth/login',
                  params: { returnTo: `/accept-invitation?token=${token}` },
                });
              },
            },
          ]
        );
        return;
      }

      // Accept invitation using token
      const result = await acceptInvitation(0, token); // ID is ignored when token is provided

      // Invalidar el caché de RTK Query para que recargue los trips
      store.dispatch(tripsApi.util.invalidateTags(['TripBreakdown', 'Trips']));

      setSuccess(true);
      setLoading(false);

      // Show success message and redirect
      setTimeout(() => {
        if (result?.trip_id) {
          router.replace(`/trips/${result.trip_id}`);
        } else {
          router.replace('/trips');
        }
      }, 1500);
    } catch (e: any) {
      console.error('Accept invitation error:', e);
      setError(e.message || t('invitations.accept_failed', 'Could not accept invitation'));
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>
          {t('invitations.processing', 'Processing invitation...')}
        </Text>
      </View>
    );
  }

  // Success state
  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color="#10B981" />
        </View>
        <Text style={styles.successTitle}>{t('invitations.accepted', 'Invitation Accepted!')}</Text>
        <Text style={styles.successMessage}>
          {t('invitations.redirecting', 'Redirecting to your trip...')}
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorIcon}>
          <Ionicons name="close-circle" size={64} color="#EF4444" />
        </View>
        <Text style={styles.errorTitle}>{t('invitations.error_title', 'Unable to Accept')}</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.returnLink} onPress={() => router.replace('/')}>
          {t('invitations.return_home', 'Return to Home')}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  returnLink: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
