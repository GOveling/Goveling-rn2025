import React from 'react';
import { TouchableOpacity, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface LiquidButtonProps {
  title: string;
  icon?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'glass';
  style?: ViewStyle;
  disabled?: boolean;
}

const LiquidButton: React.FC<LiquidButtonProps> = ({
  title,
  icon,
  onPress,
  variant = 'secondary',
  style,
  disabled = false,
}) => {
  const getButtonConfig = () => {
    switch (variant) {
      case 'primary':
        return {
          gradientColors: ['#007AFF', '#5AC8FA'] as const,
          boxShadow: '0px 8px 16px rgba(0, 122, 255, 0.3)',
          textColor: '#FFFFFF',
          borderColor: 'transparent',
          useGradient: true,
        };
      case 'accent':
        return {
          gradientColors: ['#FF3B30', '#FF9500'] as const,
          boxShadow: '0px 8px 16px rgba(255, 59, 48, 0.3)',
          textColor: '#FFFFFF',
          borderColor: 'transparent',
          useGradient: true,
        };
      case 'success':
        return {
          gradientColors: ['#34C759', '#30D158'] as const,
          boxShadow: '0px 8px 16px rgba(52, 199, 89, 0.3)',
          textColor: '#FFFFFF',
          borderColor: 'transparent',
          useGradient: true,
        };
      case 'glass':
        return {
          gradientColors: ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)'] as const,
          boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.15)',
          textColor: '#1C1C1E',
          borderColor: 'rgba(255,255,255,0.3)',
          useGradient: false,
        };
      default: // secondary
        return {
          gradientColors: ['rgba(248,249,250,0.95)', 'rgba(248,249,250,0.85)'] as const,
          boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.12)',
          textColor: '#1C1C1E',
          borderColor: 'rgba(0,0,0,0.08)',
          useGradient: false,
        };
    }
  };

  const config = getButtonConfig();

  const ButtonContent = () => (
    <Text
      style={{
        fontSize: 16,
        fontWeight: '600',
        color: config.textColor,
        textAlign: 'center',
        letterSpacing: 0.3,
        // textShadow is not deprecated for Text components
        textShadowColor:
          variant === 'secondary' || variant === 'glass' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      }}
      numberOfLines={2}
    >
      {icon && `${icon} `}
      {title}
    </Text>
  );

  const containerStyle = {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    overflow: 'hidden' as const,
    boxShadow: disabled ? '0px 8px 16px rgba(0, 0, 0, 0.05)' : config.boxShadow,
    elevation: disabled ? 2 : 12,
    opacity: disabled ? 0.6 : 1,
    transform: [{ scale: disabled ? 0.98 : 1 }],
  };

  const innerStyle = {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 18,
    borderWidth: variant === 'secondary' || variant === 'glass' ? 1 : 0,
    borderColor: config.borderColor,
  };

  if (variant === 'glass') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[containerStyle, style]}
        activeOpacity={0.7}
      >
        <BlurView
          intensity={20}
          tint="light"
          style={[innerStyle, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
        >
          <ButtonContent />
        </BlurView>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[containerStyle, style]}
      activeOpacity={0.8}
    >
      {config.useGradient ? (
        <LinearGradient
          colors={config.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={innerStyle}
        >
          <ButtonContent />
        </LinearGradient>
      ) : (
        <LinearGradient
          colors={config.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[innerStyle, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
        >
          <ButtonContent />
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
};

export default LiquidButton;
