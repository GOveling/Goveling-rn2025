import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import { ToastProvider } from '../src/components/ui/Toast';
import { ThemeProvider } from '../src/lib/theme';
import { Stack } from 'expo-router';
export default function Root(){ return (<I18nextProvider i18n={i18n}>{/*I18N*/}<ThemeProvider><ToastProvider>{/*PROVIDERS*/}<Stack screenOptions={{ headerShown:false }} />); }
