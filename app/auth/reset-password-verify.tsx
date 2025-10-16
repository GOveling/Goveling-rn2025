import React, { useState, useRef, useEffect } from 'react';

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
  codeContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 30,
  },
  codeInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: 'center' as const,
    fontSize: 24,
    fontWeight: 'bold' as const,
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
  eyeIcon: {
    position: 'absolute' as const,
    right: 16,
    top: 16,
    padding: 8,
  },
  verifyButton: {
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
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  resendContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 30,
  },
  resendText: {
    fontSize: 16,
  },
  resendLink: {
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

export default function ResetPasswordVerifyScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const codeInputRefs = useRef<(TextInput | null)[]>([]);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadEmailFromStorage();
    // Focus first input on mount
    setTimeout(() => {
      codeInputRefs.current[0]?.focus();
    }, 500);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const loadEmailFromStorage = async () => {
    try {
      const storedEmail = await AsyncStorage.getItem('resetPasswordEmail');
      if (storedEmail) {
        setEmail(storedEmail);
      } else {
        // If no email stored, go back to forgot password
        router.replace('/auth/forgot-password' as any);
      }
    } catch (error) {
      console.error('Error loading email:', error);
      router.replace('/auth/forgot-password' as any);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    // Auto-focus password when code is complete
    if (index === 5 && text && newCode.every((c) => c)) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const resetPassword = async () => {
    const codeString = code.join('');

    if (codeString.length !== 6) {
      Alert.alert('Error', 'Por favor ingresa el código de 6 dígitos');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔐 Verifying reset code and updating password');

      const response = await supabase.functions.invoke('verify-reset-password', {
        body: {
          email,
          code: codeString,
          newPassword,
        },
      });

      console.log('🔐 Reset password response:', response);

      if (response.error) {
        console.error('❌ Function error:', response.error);
        throw new Error(response.error.message || 'Error al verificar el código');
      }

      const resetData = response.data;

      if (resetData?.ok) {
        // Clear stored email
        await AsyncStorage.removeItem('resetPasswordEmail');

        Alert.alert(
          '✅ Contraseña Actualizada',
          'Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
          [
            {
              text: 'Iniciar Sesión',
              onPress: () => router.replace('/auth' as any),
            },
          ]
        );
      } else {
        throw new Error(resetData?.error || 'Error inesperado al actualizar la contraseña');
      }
    } catch (error: any) {
      console.error('❌ Reset password error:', error);
      setError(error.message || 'Error al verificar el código o actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('send-reset-password', {
        body: { email },
      });

      if (response.data?.ok) {
        Alert.alert('Código Reenviado', 'Se ha enviado un nuevo código a tu email');
        setResendCooldown(60); // 60 seconds cooldown
        setCode(['', '', '', '', '', '']);
        codeInputRefs.current[0]?.focus();
      } else {
        throw new Error(response.data?.error || 'Error al reenviar el código');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al reenviar el código');
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
            🔐 Nueva Contraseña
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: isDark ? 'rgba(255,255,255,0.8)' : '#6b7280',
              },
            ]}
          >
            Ingresa el código de 6 dígitos que enviamos a {email} y tu nueva contraseña
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

          {/* Code Input */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  codeInputRefs.current[index] = ref;
                }}
                style={[
                  styles.codeInput,
                  {
                    borderColor: digit
                      ? '#6366F1'
                      : isDark
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(0,0,0,0.2)',
                    color: isDark ? '#fff' : '#000',
                    backgroundColor: isDark ? 'transparent' : 'rgba(255,255,255,0.9)',
                  },
                ]}
                value={digit}
                onChangeText={(text) =>
                  handleCodeChange(text.replace(/[^0-9]/g, '').slice(0, 1), index)
                }
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* New Password Input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={passwordInputRef}
              style={[
                styles.input,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                  color: isDark ? '#fff' : '#000',
                  backgroundColor: isDark ? 'transparent' : 'rgba(255,255,255,0.9)',
                },
              ]}
              placeholder="Nueva Contraseña"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye' : 'eye-off'}
                size={24}
                color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={confirmPasswordInputRef}
              style={[
                styles.input,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                  color: isDark ? '#fff' : '#000',
                  backgroundColor: isDark ? 'transparent' : 'rgba(255,255,255,0.9)',
                },
              ]}
              placeholder="Confirmar Nueva Contraseña"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              returnKeyType="done"
              onSubmitEditing={resetPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye' : 'eye-off'}
                size={24}
                color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'}
              />
            </TouchableOpacity>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyButton, { opacity: loading ? 0.6 : 1 }]}
            onPress={resetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Actualizar Contraseña</Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text
              style={[
                styles.resendText,
                {
                  color: isDark ? 'rgba(255,255,255,0.8)' : '#6b7280',
                },
              ]}
            >
              ¿No recibiste el código?
            </Text>
            <TouchableOpacity onPress={resendCode} disabled={resendCooldown > 0 || loading}>
              <Text
                style={[
                  styles.resendLink,
                  {
                    color: resendCooldown > 0 ? '#9CA3AF' : isDark ? '#fff' : '#6366F1',
                    opacity: resendCooldown > 0 ? 0.5 : 1,
                  },
                ]}
              >
                {resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : 'Reenviar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
