import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import LiquidButton from '../src/components/LiquidButton';

const ButtonShowcase = () => {
  const handlePress = (variant: string) => {
    Alert.alert('Button Pressed', `You pressed the ${variant} button!`);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <View style={{ padding: 20 }}>
        <Text style={{
          fontSize: 32,
          fontWeight: '700',
          color: '#1C1C1E',
          marginBottom: 8,
          textAlign: 'center'
        }}>
          Liquid Glass Buttons
        </Text>
        
        <Text style={{
          fontSize: 16,
          color: '#666666',
          marginBottom: 32,
          textAlign: 'center',
          lineHeight: 22
        }}>
          iOS 16+ inspired button design system with liquid glass effects
        </Text>

        {/* Primary Buttons */}
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#1C1C1E',
          marginBottom: 16,
          marginTop: 20
        }}>
          Primary Actions
        </Text>
        
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <LiquidButton
            title="Ver Detalles"
            onPress={() => handlePress('primary')}
            variant="primary"
          />
          
          <LiquidButton
            title="Confirmar"
            icon="✓"
            onPress={() => handlePress('primary with icon')}
            variant="primary"
          />
        </View>

        {/* Accent Buttons */}
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#1C1C1E',
          marginBottom: 16
        }}>
          Accent Actions
        </Text>
        
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <LiquidButton
            title="Ver Mis lugares"
            icon="❤️"
            onPress={() => handlePress('accent')}
            variant="accent"
          />
          
          <LiquidButton
            title="Eliminar"
            icon="🗑"
            onPress={() => handlePress('accent delete')}
            variant="accent"
          />
        </View>

        {/* Success Buttons */}
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#1C1C1E',
          marginBottom: 16
        }}>
          Success Actions
        </Text>
        
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <LiquidButton
            title="Estadía"
            icon="🏠"
            onPress={() => handlePress('success')}
            variant="success"
          />
          
          <LiquidButton
            title="Completado"
            icon="✅"
            onPress={() => handlePress('success complete')}
            variant="success"
          />
        </View>

        {/* Glass Buttons */}
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#1C1C1E',
          marginBottom: 16
        }}>
          Glass Effect (iOS 16+)
        </Text>
        
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <LiquidButton
            title="Ruta Inteligente IA"
            icon="🧠"
            onPress={() => handlePress('glass')}
            variant="glass"
          />
          
          <LiquidButton
            title="Configuración"
            icon="⚙️"
            onPress={() => handlePress('glass settings')}
            variant="glass"
          />
        </View>

        {/* Secondary Buttons */}
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#1C1C1E',
          marginBottom: 16
        }}>
          Secondary Actions
        </Text>
        
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <LiquidButton
            title="Cancelar"
            onPress={() => handlePress('secondary')}
            variant="secondary"
          />
          
          <LiquidButton
            title="Opciones"
            icon="⋯"
            onPress={() => handlePress('secondary options')}
            variant="secondary"
          />
        </View>

        {/* Disabled States */}
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#1C1C1E',
          marginBottom: 16
        }}>
          Disabled States
        </Text>
        
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40 }}>
          <LiquidButton
            title="Disabled Primary"
            onPress={() => {}}
            variant="primary"
            disabled={true}
          />
          
          <LiquidButton
            title="Disabled Glass"
            icon="🔒"
            onPress={() => {}}
            variant="glass"
            disabled={true}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default ButtonShowcase;
