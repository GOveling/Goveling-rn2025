import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import { ToastProvider } from '../src/components/ui/Toast';
import { ThemeProvider } from '../src/lib/theme';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function Root(){ 
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ToastProvider>
          <Stack screenOptions={{ 
            headerShown: false,
            ...(Platform.OS === 'web' && {
              contentStyle: { backgroundColor: '#F7F7FA' }
            })
          }} />
        </ToastProvider>
      </ThemeProvider>
    </I18nextProvider>
  ); 
}
