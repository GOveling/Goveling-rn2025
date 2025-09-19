import { useTranslation } from 'react-i18next';
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

// Cross-platform compatible icons
const HomeIcon = () => <Text style={{ fontSize: 20 }}>🏠</Text>;
const ExploreIcon = () => <Text style={{ fontSize: 20 }}>🔍</Text>;
const TripsIcon = () => <Text style={{ fontSize: 20 }}>✈️</Text>;
const BookingIcon = () => <Text style={{ fontSize: 20 }}>📅</Text>;
const ProfileIcon = () => <Text style={{ fontSize: 20 }}>👤</Text>;

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: Platform.OS === 'web' ? {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60
        } : undefined
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.title') || 'Home',
          tabBarIcon: () => <HomeIcon />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('explore.title') || 'Explore',
          tabBarIcon: () => <ExploreIcon />,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: t('trips.title') || 'My Trips',
          tabBarIcon: () => <TripsIcon />,
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: t('booking.title') || 'Booking',
          tabBarIcon: () => <BookingIcon />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title') || 'Profile',
          tabBarIcon: () => <ProfileIcon />,
        }}
      />
    </Tabs>
  );
}