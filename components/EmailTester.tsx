import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { supabase } from '../src/lib/supabase';

export default function EmailTester() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const testEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa un email');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testing email function with:', email);
      
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('resend-otp', {
        body: { 
          email: email,
          type: 'confirmation'
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Email function response:', data);
      
      if (data.ok) {
        setResult(`✅ Email enviado exitosamente!${data.emailId ? ` ID: ${data.emailId}` : ''}`);
        Alert.alert('¡Éxito!', 'Email de prueba enviado. Revisa tu bandeja de entrada.');
      } else {
        setResult(`❌ Error: ${data.error || 'Unknown error'}`);
        Alert.alert('Error', data.error || 'Error desconocido');
      }

    } catch (error: any) {
      console.error('💥 Email test error:', error);
      setResult(`❌ Error: ${error.message}`);
      Alert.alert('Error', error.message || 'Error al enviar email');
    } finally {
      setLoading(false);
    }
  };

  const testConfirmationEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa un email');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testing confirmation email with:', email, fullName);
      
      // Call the new confirmation email function
      const { data, error } = await supabase.functions.invoke('send-confirmation-email', {
        body: { 
          email: email,
          fullName: fullName || 'Usuario de Prueba'
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Confirmation email response:', data);
      
      if (data.ok) {
        setResult(`✅ Email de confirmación enviado!${data.emailId ? ` ID: ${data.emailId}` : ''}${data.code ? ` Código: ${data.code}` : ''}`);
        Alert.alert('¡Éxito!', 'Email de confirmación enviado. Revisa tu bandeja de entrada.');
      } else {
        setResult(`❌ Error: ${data.error || 'Unknown error'}`);
        Alert.alert('Error', data.error || 'Error desconocido');
      }

    } catch (error: any) {
      console.error('💥 Confirmation email test error:', error);
      setResult(`❌ Error: ${error.message}`);
      Alert.alert('Error', error.message || 'Error al enviar email de confirmación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Probador de Email</Text>
      
      <Text style={styles.label}>Email de prueba:</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <Text style={styles.label}>Nombre completo (opcional):</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Tu Nombre"
        autoCapitalize="words"
      />
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={testEmail}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Enviando...' : 'Enviar Email de Prueba (OTP)'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.confirmationButton, loading && styles.buttonDisabled]}
        onPress={testConfirmationEmail}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Enviando...' : 'Enviar Email de Confirmación'}
        </Text>
      </TouchableOpacity>
      
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
      
      <Text style={styles.info}>
        📧 Esta función usa Resend con el dominio team.goveling.com
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    margin: 8,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    color: '#E5E7EB',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmationButton: {
    backgroundColor: '#6366F1',
  },
  buttonDisabled: {
    backgroundColor: '#6B7280',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  resultText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  info: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
