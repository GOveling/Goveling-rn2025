import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import * as Localization from 'expo-localization';
import { supabase } from '~/lib/supabase';

// Foreground display behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestPushPermission(){
  const authStatus = await messaging().requestPermission();
  const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  return enabled;
}

export async function getDeviceToken(){
  const token = await messaging().getToken(); // FCM for both iOS/Android (iOS via APNs linked in Firebase)
  return token;
}

export async function registerDeviceToken(){
  const enabled = await requestPushPermission();
  if (!enabled) return null;
  const token = await getDeviceToken();
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid || !token) return null;
  const platform = Platform.OS;
  const locale = Localization.locale;
  await supabase.from('device_tokens').upsert({ user_id: uid, token, platform, locale, last_seen: new Date().toISOString() });
  // Refresh token
  messaging().onTokenRefresh(async (t)=>{
    await supabase.from('device_tokens').upsert({ user_id: uid, token: t, platform, locale, last_seen: new Date().toISOString() });
  });
  // Foreground handler → mirror to inbox table (best-effort)
  messaging().onMessage(async (remoteMessage)=>{
    const { notification, data } = remoteMessage;
    if (notification?.title || notification?.body){
      await supabase.from('notifications_inbox').insert({ user_id: uid, title: notification?.title||'', body: notification?.body||'', data: data||null });
      await Notifications.scheduleNotificationAsync({ content: { title: notification?.title, body: notification?.body, data }, trigger: null });
    }
  });
  return token;
}
