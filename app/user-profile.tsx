import { Stack } from 'expo-router';

import { UserProfileScreen } from '@/screens/social';

export default function UserProfilePage() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <UserProfileScreen />
    </>
  );
}
