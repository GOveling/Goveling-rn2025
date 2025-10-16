import React, { useState, useRef } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../../src/lib/supabase';

const styles = {
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center' as const,
    padding: 20,
  },
  backButton: {
    position: 'absolute' as const,
    top: 60,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  card: {
    borderRadius: 20,
    padding: 30,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoContainer: {
    alignItems: 'center' as const,
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center' as const,
    marginBottom: 30,
    opacity: 0.8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  resetButton: {
    height: 56,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  backToLoginContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 30,
  },
  backToLoginText: {
    fontSize: 16,
  },
  backToLoginLink: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginLeft: 5,
  },
  errorContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(220,38,38,0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  errorText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500' as const,
  },
};

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<TextInput>(null);

  const sendResetEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📧 Sending password reset request for:', email);

      const response = await supabase.functions.invoke('send-reset-password', {
        body: { email },
      });

      console.log('📧 Reset password response:', response);

      if (response.error) {
        console.error('❌ Function error:', response.error);
        throw new Error(response.error.message || 'Error al enviar el correo');
      }

      const resetData = response.data;

      if (resetData?.ok) {
        // Store email for verification step
        await AsyncStorage.setItem('resetPasswordEmail', email);

        Alert.alert(
          '📧 Correo Enviado',
          resetData.message ||
            'Si tu email está registrado, recibirás un código de restablecimiento.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/auth/reset-password-verify' as any),
            },
          ]
        );
      } else {
        throw new Error(resetData?.error || 'Error inesperado al procesar la solicitud');
      }
    } catch (error: any) {
      console.error('❌ Reset password error:', error);
      setError(error.message || 'Error al enviar el correo de restablecimiento');
    } finally {
      setLoading(false);
    }
  };

  const backgroundColors = isDark
    ? (['#1A1B3C', '#2D1B69', '#4A154B'] as const)
    : (['#6366F1', '#8B5CF6', '#EC4899'] as const);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={backgroundColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Main Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)',
            },
          ]}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/branding-zeppeling.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text
            style={[
              styles.title,
              {
                color: isDark ? '#fff' : '#1f2937',
              },
            ]}
          >
            🔐 Restablecer Contraseña
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: isDark ? 'rgba(255,255,255,0.8)' : '#6b7280',
              },
            ]}
          >
            Ingresa tu email y te enviaremos un código para restablecer tu contraseña
          </Text>

          {/* Error Message */}
          {error && (
            <View
              style={[
                styles.errorContainer,
                {
                  backgroundColor: isDark ? 'rgba(220,38,38,0.2)' : 'rgba(254,226,226,0.9)',
                },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={isDark ? '#FCA5A5' : '#DC2626'} />
              <Text
                style={[
                  styles.errorText,
                  {
                    color: isDark ? '#FCA5A5' : '#DC2626',
                  },
                ]}
              >
                {error}
              </Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <Ionicons name="close" size={20} color={isDark ? '#FCA5A5' : '#DC2626'} />
              </TouchableOpacity>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={emailInputRef}
              style={[
                styles.input,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                  color: isDark ? '#fff' : '#000',
                  backgroundColor: isDark ? 'transparent' : 'rgba(255,255,255,0.9)',
                },
              ]}
              placeholder="Email"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={sendResetEmail}
            />
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.resetButton, { opacity: loading ? 0.6 : 1 }]}
            onPress={sendResetEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.resetButtonText}>Enviar Código de Restablecimiento</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <View style={styles.backToLoginContainer}>
            <Text
              style={[
                styles.backToLoginText,
                {
                  color: isDark ? 'rgba(255,255,255,0.8)' : '#6b7280',
                },
              ]}
            >
              ¿Recordaste tu contraseña?
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text
                style={[
                  styles.backToLoginLink,
                  {
                    color: isDark ? '#fff' : '#6366F1',
                  },
                ]}
              >
                Volver al Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
