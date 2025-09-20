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
  Appearance
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '~/lib/supabase';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function AuthScreen(){
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isDark, setIsDark] = useState(Appearance.getColorScheme() === 'dark');

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;
      
      if (data.user) {
        Alert.alert('Éxito', 'Cuenta creada exitosamente');
        // The AuthProvider will handle navigation
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
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

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      // For now, we'll show an alert since Google OAuth requires additional setup
      Alert.alert(
        'Google OAuth',
        'La funcionalidad de Google OAuth requiere configuración adicional en Supabase. Por ahora, usa el registro con email.',
        [{ text: 'OK' }]
      );
      
      // Uncomment when Google OAuth is properly configured:
      /*
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.EXPO_PUBLIC_SITE_URL}://auth/callback`
        }
      });

      if (error) throw error;
      */
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error con Google OAuth');
    } finally {
      setLoading(false);
    }
  };

  const backgroundColors = isDark 
    ? ['#1A1B3C', '#2D1B69', '#4A154B'] as const
    : ['#6366F1', '#8B5CF6', '#EC4899'] as const;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'light-content'} />
      <LinearGradient
        colors={backgroundColors}
        style={styles.gradient}
      >
        {/* Theme Toggle */}
        <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
          <Ionicons 
            name={isDark ? 'sunny' : 'moon'} 
            size={24} 
            color="rgba(255,255,255,0.8)" 
          />
        </TouchableOpacity>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Container */}
          <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)' }]}>
            
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
                    style={[styles.input, { 
                      borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                      color: isDark ? '#fff' : '#000',
                      backgroundColor: isDark ? 'transparent' : 'rgba(255,255,255,0.9)'
                    }]}
                    placeholder="Full Name"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { 
                    borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                    color: isDark ? '#fff' : '#000',
                    backgroundColor: isDark ? 'transparent' : 'rgba(255,255,255,0.9)'
                  }]}
                  placeholder="Email Address"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { 
                    borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                    color: isDark ? '#fff' : '#000',
                    backgroundColor: isDark ? 'transparent' : 'rgba(255,255,255,0.9)'
                  }]}
                  placeholder="Password"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
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
                    style={[styles.input, { 
                      borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                      color: isDark ? '#fff' : '#000',
                      backgroundColor: isDark ? 'transparent' : 'rgba(255,255,255,0.9)'
                    }]}
                    placeholder="Confirm Password"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
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
                    <View style={[
                      styles.checkbox, 
                      { borderColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)' },
                      rememberMe && styles.checkboxChecked
                    ]}>
                      {rememberMe && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={[styles.checkboxText, { color: isDark ? '#fff' : '#333' }]}>
                      Remember me
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity>
                    <Text style={[styles.forgotText, { color: isDark ? '#fff' : '#666' }]}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Main Action Button */}
              <TouchableOpacity
                style={styles.mainButton}
                onPress={mode === 'signup' ? signUp : signIn}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.mainButtonText}>
                    {mode === 'signup' ? 'Sign Up' : 'Log In'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Or Divider */}
              <View style={styles.orContainer}>
                <View style={[styles.orLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]} />
                <View style={[styles.orTextContainer, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)'
                }]}>
                  <Text style={[styles.orText, { color: isDark ? '#fff' : '#666' }]}>or</Text>
                </View>
              </View>

              {/* Google Button */}
              <TouchableOpacity style={styles.googleButton} onPress={signInWithGoogle}>
                <Image 
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Switch Mode */}
              <View style={styles.switchContainer}>
                <Text style={[styles.switchText, { color: isDark ? '#fff' : '#666' }]}>
                  {mode === 'signup' ? "Already have an account? " : "Don't have an account? "}
                </Text>
                <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
                  <Text style={[styles.switchLink, { color: isDark ? '#fff' : '#6366F1' }]}>
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
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  themeToggle: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
  },
  formContainer: {
    gap: 16,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkboxText: {
    fontSize: 14,
  },
  forgotText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  mainButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  orTextContainer: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -12 }],
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  orText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    height: 56,
    borderRadius: 12,
    gap: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
