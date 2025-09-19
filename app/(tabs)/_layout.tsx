import { useTranslation } from 'react-i18next';
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

// Web-compatible icons
const HomeIcon = () => <span style={{ fontSize: 20 }}>🏠</span>;
const ExploreIcon = () => <span style={{ fontSize: 20 }}>🔍</span>;
const TripsIcon = () => <span style={{ fontSize: 20 }}>✈️</span>;
const BookingIcon = () => <span style={{ fontSize: 20 }}>📅</span>;
const ProfileIcon = () => <span style={{ fontSize: 20 }}>👤</span>;

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