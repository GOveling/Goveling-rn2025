/**
 * Chat Screen Route
 * Ruta independiente para el chat grupal de un viaje
 */

import React from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTranslation } from 'react-i18next';

import TripChatScreen from '~/components/TripChatScreen';

export default function ChatRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    tripId: string;
    tripTitle: string;
  }>();

  const handleClose = () => {
    router.back();
  };

  return (
    <TripChatScreen
      onClose={handleClose}
      tripId={params.tripId}
      tripTitle={params.tripTitle || t('chat.title')}
    />
  );
}
