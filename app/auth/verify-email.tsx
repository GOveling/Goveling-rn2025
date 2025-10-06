import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Appearance,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '~/lib/supabase';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function VerifyEmailScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isDark, setIsDark] = useState(Appearance.getColorScheme() === 'dark');

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Get pending signup data
    const getPendingSignup = async () => {
      try {
        const pendingData = await AsyncStorage.getItem('pendingSignup');
        if (pendingData) {
          const { email: pendingEmail } = JSON.parse(pendingData);
          setEmail(pendingEmail);
        } else {
          // No pending signup, redirect back
          Alert.alert('Error', 'No hay registro pendiente', [
            { text: 'OK', onPress: () => router.push('/auth') }
          ]);
        }
      } catch (error) {
        console.error('Error getting pending signup:', error);
        router.push('/auth');
      }
    };

    getPendingSignup();

    // Listen for theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDark(colorScheme === 'dark');
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    // Countdown for resend cooldown
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6 && /^\d$/.test(digit)) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      
      // Focus on the next empty input or the last one
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Handle single character input
    if (/^\d*$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      Alert.alert('Error', 'Por favor ingresa el código completo de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      // Get pending signup data
      const pendingData = await AsyncStorage.getItem('pendingSignup');
      if (!pendingData) {
        throw new Error('No se encontró información de registro pendiente');
      }

      const { email, password, fullName } = JSON.parse(pendingData);

      // Verify the code and create user
      const { data, error } = await supabase.functions.invoke('verify-email-code', {
        body: { 
          email, 
          code: fullCode,
          password,
          fullName 
        }
      });

      if (error) throw error;
      
      if (data?.ok) {
        // Clear pending signup data
        await AsyncStorage.removeItem('pendingSignup');
        
        // Now sign in the user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // If sign in fails, let them know they can try to sign in manually
          Alert.alert(
            'Cuenta Verificada',
            'Tu cuenta ha sido creada exitosamente. Ahora puedes iniciar sesión.',
            [{ text: 'OK', onPress: () => router.push('/auth') }]
          );
        } else {
          Alert.alert('¡Éxito!', 'Tu cuenta ha sido verificada y estás conectado', [
            { text: 'OK', onPress: () => router.replace('/(tabs)') }
          ]);
        }
      } else {
        throw new Error(data?.error || 'Error al verificar el código');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al verificar el código');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    try {
      const pendingData = await AsyncStorage.getItem('pendingSignup');
      if (!pendingData) {
        throw new Error('No se encontró información de registro pendiente');
      }

      const { email, fullName } = JSON.parse(pendingData);

      const { data, error } = await supabase.functions.invoke('send-confirmation-email', {
        body: { email, fullName }
      });

      if (error) throw error;
      
      if (data?.ok) {
        Alert.alert('Código Reenviado', `Se ha enviado un nuevo código a ${email}`);
        setCode(['', '', '', '', '', '']);
        setResendCooldown(60); // 60 second cooldown
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al reenviar el código');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    Alert.alert(
      'Cancelar Verificación',
      '¿Estás seguro que quieres cancelar? Tendrás que registrarte de nuevo.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('pendingSignup');
            router.push('/auth');
          }
        }
      ]
    );
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#1a1a1a' : '#f8f9fa'}
      />

      <LinearGradient
        colors={isDark ? ['#1a1a1a', '#2d2d2d'] : ['#f8f9fa', '#e9ecef']}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={goBack}
            >
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={isDark ? '#ffffff' : '#000000'} 
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
              <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={24}
                color={isDark ? '#ffffff' : '#000000'}
              />
            </TouchableOpacity>
          </View>

          {/* Logo and Title */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🗺️</Text>
            </View>
            <Text style={[styles.title, { color: isDark ? '#ffffff' : '#000000' }]}>
              Verifica tu Email
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#cccccc' : '#666666' }]}>
              Hemos enviado un código de 6 dígitos a
            </Text>
            <Text style={[styles.emailText, { color: isDark ? '#6366F1' : '#4F46E5' }]}>
              {email}
            </Text>
          </View>

          {/* Code Input */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.codeInput,
                  {
                    borderColor: digit ? (isDark ? '#6366F1' : '#4F46E5') : (isDark ? '#444444' : '#e1e5e9'),
                    backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
                    color: isDark ? '#ffffff' : '#000000',
                  }
                ]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="numeric"
                maxLength={6} // Allow pasting
                textAlign="center"
                selectTextOnFocus
                autoComplete="one-time-code"
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              {
                backgroundColor: code.join('').length === 6 ? '#6366F1' : (isDark ? '#444444' : '#e1e5e9'),
                opacity: loading ? 0.8 : 1,
              }
            ]}
            onPress={verifyCode}
            disabled={loading || code.join('').length !== 6}
          >
            {loading ? (
              <Text style={styles.verifyButtonText}>Verificando...</Text>
            ) : (
              <Text style={styles.verifyButtonText}>Verificar Código</Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={[styles.resendText, { color: isDark ? '#cccccc' : '#666666' }]}>
              ¿No recibiste el código?
            </Text>
            <TouchableOpacity
              onPress={resendCode}
              disabled={loading || resendCooldown > 0}
              style={styles.resendButton}
            >
              <Text style={[
                styles.resendButtonText,
                {
                  color: (loading || resendCooldown > 0) ? (isDark ? '#666666' : '#cccccc') : '#6366F1'
                }
              ]}>
                {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={[styles.helpText, { color: isDark ? '#999999' : '#888888' }]}>
              • Revisa tu bandeja de entrada y spam
            </Text>
            <Text style={[styles.helpText, { color: isDark ? '#999999' : '#888888' }]}>
              • El código expira en 10 minutos
            </Text>
            <Text style={[styles.helpText, { color: isDark ? '#999999' : '#888888' }]}>
              • Asegúrate de tener conexión a internet
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },
  backButton: {
    padding: 8,
  },
  themeToggle: {
    padding: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  verifyButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resendText: {
    fontSize: 14,
    marginBottom: 8,
  },
  resendButton: {
    padding: 8,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
});
