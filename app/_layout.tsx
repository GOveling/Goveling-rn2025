import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import { ToastProvider } from '../src/components/ui/Toast';
import { Stack } from 'expo-router';

export default function Root(){ 
  return (
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <Stack screenOptions={{ headerShown:false }} />
      </ToastProvider>
    </I18nextProvider>
  ); 
}
