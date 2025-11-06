import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Appearance,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '~/constants/colors';

import { supabase } from '../../src/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isDark, setIsDark] = useState(Appearance.getColorScheme() === 'dark');
  const [authError, setAuthError] = useState<string | null>(null);

  // Referencias para los TextInputs
  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const confirmPasswordInputRef = React.useRef<TextInput>(null);

  // Listen to system theme changes
  React.useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDark(colorScheme === 'dark');
    });
    return () => subscription?.remove();
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const signUp = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      // Send confirmation email with Resend
      const response = await supabase.functions.invoke('send-confirmation-email', {
        body: {
          email,
          fullName,
        },
      });

      console.log('📧 Email function response:', response);

      // Check if there's a function error (network/execution error)
      if (response.error) {
        console.error('❌ Function error:', response.error);
        throw new Error(response.error.message || 'Error al conectar con el servidor');
      }

      // Check the response data
      const emailData = response.data;

      if (emailData?.ok) {
        // Success case - email sent
        console.log('✅ Email sent successfully');
        await AsyncStorage.setItem(
          'pendingSignup',
          JSON.stringify({
            email,
            password,
            fullName,
            timestamp: Date.now(),
          })
        );

        Alert.alert(
          '¡Casi listo!',
          `Hemos enviado un código de verificación a ${email}. Revisa tu correo e ingresa el código para completar tu registro.`,
          [
            {
              text: 'OK',
              onPress: () => router.push('/auth/verify-email' as any),
            },
          ]
        );
      } else if (emailData?.userExists || emailData?.error === 'user_already_exists') {
        // User already exists case
        console.log('👤 User already exists, switching to sign in');
        Alert.alert(
          'Usuario Existente',
          emailData.message ||
            'Este email ya está registrado en Goveling. Por favor inicia sesión.',
          [
            {
              text: 'Iniciar Sesión',
              onPress: () => {
                setMode('signin'); // Switch to sign in mode
                setEmail(email); // Pre-fill the email
              },
            },
            {
              text: 'Cancelar',
              style: 'cancel',
            },
          ]
        );
      } else {
        // Other error from the function
        throw new Error(emailData?.message || 'Error inesperado al procesar la solicitud');
      }
    } catch (error: any) {
      console.error('❌ Signup error:', error);

      // Handle specific error cases
      if (error.message?.includes('user_already_exists')) {
        Alert.alert(
          'Usuario Existente',
          'Este email ya está registrado en Goveling. Por favor inicia sesión.',
          [
            {
              text: 'Iniciar Sesión',
              onPress: () => {
                setMode('signin'); // Switch to sign in mode
                setEmail(email); // Pre-fill the email
              },
            },
            {
              text: 'Cancelar',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Error al enviar el correo de confirmación');
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // The AuthProvider will handle navigation
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
      <StatusBar barStyle={isDark ? 'light-content' : 'light-content'} />
      <LinearGradient colors={backgroundColors} style={styles.gradient}>
        {/* Theme Toggle */}
        <TouchableOpacity
          style={[styles.themeToggle, isDark ? styles.themeToggleDark : styles.themeToggleLight]}
          onPress={toggleTheme}
        >
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={24} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Error Message */}
          {authError && (
            <View
              style={[
                styles.errorContainer,
                isDark ? styles.errorContainerDark : styles.errorContainerLight,
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={isDark ? '#FCA5A5' : '#DC2626'} />
              <Text
                style={[styles.errorText, isDark ? styles.errorTextDark : styles.errorTextLight]}
              >
                {authError}
              </Text>
              <TouchableOpacity onPress={() => setAuthError(null)}>
                <Ionicons name="close" size={20} color={isDark ? '#FCA5A5' : '#DC2626'} />
              </TouchableOpacity>
            </View>
          )}

          {/* Card Container */}
          <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/branding-zeppeling.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {mode === 'signup' && (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                    placeholder="Full Name"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <TextInput
                  ref={emailInputRef}
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                  placeholder="Email Address"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                  placeholder="Password"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onSubmitEditing={
                    mode === 'signin' ? signIn : () => confirmPasswordInputRef.current?.focus()
                  }
                  returnKeyType={mode === 'signin' ? 'done' : 'next'}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={24}
                    color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'}
                  />
                </TouchableOpacity>
              </View>

              {mode === 'signup' && (
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={confirmPasswordInputRef}
                    style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                    placeholder="Confirm Password"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    onSubmitEditing={signUp}
                    returnKeyType="done"
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
              )}

              {mode === 'signin' && (
                <View style={styles.rememberRow}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isDark ? styles.checkboxDark : styles.checkboxLight,
                        rememberMe && styles.checkboxChecked,
                      ]}
                    >
                      {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text
                      style={[styles.checkboxText, isDark ? styles.textDark : styles.textLight]}
                    >
                      Remember me
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => router.push('/auth/forgot-password' as any)}>
                    <Text style={[styles.forgotText, isDark ? styles.linkDark : styles.linkLight]}>
                      Forgot password?
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Main Button */}
              <TouchableOpacity
                style={[styles.mainButton, loading && styles.buttonLoading]}
                onPress={mode === 'signup' ? signUp : signIn}
                disabled={loading}
              >
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.buttonGradient}>
                  <Text style={styles.mainButtonText}>
                    {mode === 'signup' ? 'Sign Up' : 'Log In'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Switch Mode */}
              <View style={styles.switchContainer}>
                <Text
                  style={[
                    styles.switchText,
                    isDark ? styles.switchTextDark : styles.switchTextLight,
                  ]}
                >
                  {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                </Text>
                <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
                  <Text style={[styles.switchLink, isDark ? styles.linkDark : styles.linkLight]}>
                    {mode === 'signup' ? 'Sign in' : 'Sign up'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  buttonGradient: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  card: {
    borderRadius: 24,
    elevation: 16,
    marginHorizontal: 20,
    padding: 32,
    shadowColor: COLORS.utility.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  checkbox: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginRight: 8,
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary.blue,
    borderColor: COLORS.border.indigo,
  },
  checkboxContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  checkboxText: {
    fontSize: 14,
  },
  container: {
    flex: 1,
  },
  errorContainer: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 20,
    marginHorizontal: 20,
    padding: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    gap: 20,
  },
  gradient: {
    flex: 1,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 16,
    height: 56,
    paddingHorizontal: 20,
  },
  inputContainer: {
    position: 'relative',
  },
  logo: {
    height: 100,
    width: 100,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainButton: {
    borderRadius: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  mainButtonText: {
    color: COLORS.utility.white2,
    fontSize: 18,
    fontWeight: '700',
  },
  rememberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  switchContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  switchLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchText: {
    fontSize: 16,
  },
  themeToggle: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    top: 60,
    width: 44,
    zIndex: 10,
  },

  // Theme-specific input styles
  inputDark: {
    borderColor: COLORS.border.whiteOpacity.light,
    color: COLORS.utility.white2,
    backgroundColor: COLORS.background.transparent,
  },
  inputLight: {
    borderColor: COLORS.border.blackOpacity.light,
    color: COLORS.utility.black,
    backgroundColor: COLORS.background.whiteOpacity.strong,
  },

  // Theme-specific checkbox border
  checkboxDark: {
    borderColor: COLORS.border.whiteOpacity.medium,
  },
  checkboxLight: {
    borderColor: COLORS.border.blackOpacity.medium,
  },

  // Theme-specific text colors
  textDark: {
    color: COLORS.utility.white2,
  },
  textLight: {
    color: COLORS.text.mediumGray,
  },

  // Theme-specific link color
  linkLight: {
    color: COLORS.primary.blue,
  },
  linkDark: {
    color: COLORS.utility.white2,
  },

  // Theme-specific switch text colors
  switchTextLight: {
    color: COLORS.text.grayish,
  },
  switchTextDark: {
    color: COLORS.utility.white2,
  },

  // Loading button opacity
  buttonLoading: {
    opacity: 0.6,
  },

  // Theme toggle background
  themeToggleDark: {
    backgroundColor: COLORS.background.whiteOpacity.medium,
  },
  themeToggleLight: {
    backgroundColor: COLORS.background.blackOpacity.medium,
  },

  // Error container
  errorContainerDark: {
    backgroundColor: COLORS.background.errorOpacity.light,
  },
  errorContainerLight: {
    backgroundColor: COLORS.background.errorOpacity.medium,
  },
  errorTextDark: {
    color: COLORS.status.errorLight,
  },
  errorTextLight: {
    color: COLORS.status.errorDark,
  },

  // Card background
  cardDark: {
    backgroundColor: COLORS.background.whiteOpacity.light,
  },
  cardLight: {
    backgroundColor: COLORS.background.whiteOpacity.veryStrong,
  },
});
