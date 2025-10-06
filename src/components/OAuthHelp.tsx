import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GOOGLE_CONSOLE_SETUP_INSTRUCTIONS } from '~/lib/oauth-urls';

interface OAuthHelpProps {
  isDark?: boolean;
  visible?: boolean;
}

export default function OAuthHelp({ isDark = false, visible = true }: OAuthHelpProps) {
  const [expanded, setExpanded] = useState(false);
  
  if (!visible) return null;
  
  const showInstructions = () => {
    Alert.alert(
      "Configuración de Google OAuth",
      GOOGLE_CONSOLE_SETUP_INSTRUCTIONS,
      [
        { text: "Copiar URL", onPress: () => copyToClipboard() },
        { text: "Cerrar", style: "cancel" }
      ]
    );
  };
  
  const copyToClipboard = () => {
    // En web, usar navigator.clipboard, en móvil podríamos usar una librería
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('https://iwsuyrlrbmnbfyfkqowl.supabase.co/auth/v1/callback');
    }
    Alert.alert("URL Copiada", "URL de callback copiada al portapapeles");
  };

  const textColor = isDark ? '#FFFFFF' : '#333333';
  const backgroundColor = isDark ? '#374151' : '#FEF3C7';
  const borderColor = isDark ? '#4B5563' : '#F59E0B';
  const iconColor = isDark ? '#FBBF24' : '#D97706';

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      <View style={styles.header}>
        <Ionicons 
          name="warning-outline" 
          size={20} 
          color={iconColor} 
        />
        <Text style={[styles.title, { color: textColor }]}>
          OAuth en Desarrollo
        </Text>
        <TouchableOpacity onPress={showInstructions}>
          <Ionicons 
            name="help-circle-outline" 
            size={20} 
            color={iconColor}
          />
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.subtitle, { color: textColor, opacity: 0.8 }]}>
        Si ves errores de "navegador no seguro", toca el ícono de ayuda
      </Text>
      
      <TouchableOpacity 
        style={styles.expandButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.expandText, { color: iconColor }]}>
          {expanded ? 'Ocultar detalles' : 'Ver solución rápida'}
        </Text>
        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={16} 
          color={iconColor}
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={[styles.solutionText, { color: textColor }]}>
            🚀 <Text style={styles.bold}>Solución recomendada:</Text>{'\n'}
            Usar el callback de Supabase (ya configurado){'\n\n'}
            
            🔧 <Text style={styles.bold}>Si persisten errores:</Text>{'\n'}
            • Verificar configuración en Google Console{'\n'}
            • Usar Chrome/Safari actualizado{'\n'}
            • Permitir cookies y popups{'\n'}
            • Probar en modo incógnito
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  solutionText: {
    fontSize: 12,
    lineHeight: 16,
  },
  bold: {
    fontWeight: '600',
  },
});
