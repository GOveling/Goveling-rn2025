import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { AnimatedTabIcon } from '../../src/components/ui/AnimatedTabIcon';

// Importar archivos Lottie
const homeAnimation = require('../../assets/lottie/home.json');
const exploreAnimation = require('../../assets/lottie/explore.json');
const tripsAnimation = require('../../assets/lottie/my-trips.json');
const bookingAnimation = require('../../assets/lottie/booking.json');
const profileAnimation = require('../../assets/lottie/profile.json');

export default function TabLayout() {
  const { t } = useTranslation();
  
  // Estados para forzar re-render de cada animación
  const [tabKeys, setTabKeys] = useState({
    home: 0,
    explore: 0,
    trips: 0,
    booking: 0,
    profile: 0
  });

  // Función para incrementar el key de un tab específico
  const incrementTabKey = useCallback((tabName: keyof typeof tabKeys) => {
    setTabKeys(prev => ({
      ...prev,
      [tabName]: prev[tabName] + 1
    }));
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // Ocultamos los labels por defecto ya que usamos el nuestro
        tabBarStyle: Platform.OS === 'web' ? {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 8,
          paddingTop: 8,
          height: 84 // Aumentamos la altura 20% más para evitar corte de iconos en dispositivos nativos
        } : {
          paddingBottom: 8,
          paddingTop: 8,
          height: 84
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.title') || 'Home',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon 
              focused={focused} 
              source={homeAnimation} 
              label="Home"
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
              label="Explore"
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
              label="Trips"
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
              label="Booking"
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
              label="Profile"
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
  );
}