import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Localization from 'expo-localization';
import { supabase } from '~/lib/supabase';

// Foreground display behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPushPermission(){
  // Use Expo Notifications instead of Firebase for Expo Go compatibility
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

export async function getDeviceToken(){
  // Use Expo push token instead of Firebase for Expo Go compatibility
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function registerDeviceToken(){
  const enabled = await requestPushPermission();
  if (!enabled) return null;
  const token = await getDeviceToken();
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid || !token) return null;
  const platform = Platform.OS;
  const locale = Localization.getLocales()?.[0]?.languageTag || 'en';
  await supabase.from('device_tokens').upsert({ user_id: uid, token, platform, locale, last_seen: new Date().toISOString() });
  
  // Note: Firebase messaging features are disabled for Expo Go compatibility
  // Token refresh and foreground message handling would be implemented with Firebase in a development build
  
  return token;
}
