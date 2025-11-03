/**
 * Chat Screen Route
 * Ruta independiente para el chat grupal de un viaje
 */

import React from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';

import TripChatScreen from '~/components/TripChatScreen';

export default function ChatRoute() {
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
      tripTitle={params.tripTitle || 'Chat Grupal'}
    />
  );
}
