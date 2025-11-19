import { Stack } from 'expo-router';

import { MyPostsScreen } from '@/screens/social/MyPostsScreen';

export default function MyPostsPage() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Mis Posts',
          headerShown: true,
        }}
      />
      <MyPostsScreen />
    </>
  );
}
