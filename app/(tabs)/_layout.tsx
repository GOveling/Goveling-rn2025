import React, { useState, useCallback } from 'react';

import { Platform } from 'react-native';

import { Tabs } from 'expo-router';

import { useTranslation } from 'react-i18next';

import bookingAnimation from '../../assets/lottie/booking.json';
import exploreAnimation from '../../assets/lottie/explore.json';
import homeAnimation from '../../assets/lottie/home.json';
import tripsAnimation from '../../assets/lottie/my-trips.json';
import profileAnimation from '../../assets/lottie/profile.json';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { AnimatedTabIcon } from '../../src/components/ui/AnimatedTabIcon';

export default function TabLayout() {
  const { t } = useTranslation();

  // Estados para forzar re-render de cada animación
  const [tabKeys, setTabKeys] = useState({
    home: 0,
    explore: 0,
    trips: 0,
    booking: 0,
    profile: 0,
  });

  // Función para incrementar el key de un tab específico
  const incrementTabKey = useCallback((tabName: keyof typeof tabKeys) => {
    setTabKeys((prev) => ({
      ...prev,
      [tabName]: prev[tabName] + 1,
    }));
  }, []);

  return (
    <ProtectedRoute>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false, // Ocultamos los labels por defecto ya que usamos el nuestro
          tabBarStyle:
            Platform.OS === 'web'
              ? {
                  backgroundColor: '#ffffff',
                  borderTopWidth: 1,
                  borderTopColor: '#e5e7eb',
                  paddingBottom: 8,
                  paddingTop: 8,
                  height: 84, // Aumentamos la altura 20% más para evitar corte de iconos en dispositivos nativos
                }
              : {
                  paddingBottom: 8,
                  paddingTop: 8,
                  height: 84,
                },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('home.title') || 'Home',
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon
                focused={focused}
                source={homeAnimation}
                label={t('tabs.home')}
                size={36}
                key={`home-${tabKeys.home}`}
              />
            ),
          }}
          listeners={{
            tabPress: () => incrementTabKey('home'),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: t('explore.title') || 'Explore',
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon
                focused={focused}
                source={exploreAnimation}
                label={t('tabs.explore')}
                size={36}
                key={`explore-${tabKeys.explore}`}
              />
            ),
            headerShown: true,
          }}
          listeners={{
            tabPress: () => incrementTabKey('explore'),
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: t('trips.title') || 'My Trips',
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon
                focused={focused}
                source={tripsAnimation}
                label={t('tabs.trips')}
                size={36}
                key={`trips-${tabKeys.trips}`}
              />
            ),
          }}
          listeners={{
            tabPress: () => incrementTabKey('trips'),
          }}
        />
        <Tabs.Screen
          name="booking"
          options={{
            title: t('booking.title') || 'Booking',
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon
                focused={focused}
                source={bookingAnimation}
                label={t('tabs.booking')}
                size={36}
                key={`booking-${tabKeys.booking}`}
              />
            ),
          }}
          listeners={{
            tabPress: () => incrementTabKey('booking'),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('profile.title') || 'Profile',
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon
                focused={focused}
                source={profileAnimation}
                label={t('tabs.profile')}
                size={36}
                key={`profile-${tabKeys.profile}`}
              />
            ),
          }}
          listeners={{
            tabPress: () => incrementTabKey('profile'),
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}
