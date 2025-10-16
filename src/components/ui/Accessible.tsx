import React from 'react';

import { TouchableOpacity, TouchableOpacityProps, Text, TextProps } from 'react-native';

// Accessible button component with proper semantics
interface AccessibleButtonProps extends TouchableOpacityProps {
  title: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const AccessibleButton = React.memo<AccessibleButtonProps>(function AccessibleButton({
  title,
  accessibilityLabel,
  accessibilityHint,
  variant = 'primary',
  style,
  ...props
}) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return '#007aff';
      case 'secondary':
        return '#f0f0f0';
      case 'danger':
        return '#ff3b30';
      default:
        return '#007aff';
    }
  };

  const getTextColor = () => {
    return variant === 'secondary' ? '#000' : '#fff';
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      style={[
        {
          backgroundColor: getBackgroundColor(),
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44, // Minimum touch target size
        },
        style,
      ]}
      {...props}
    >
      <Text
        style={{
          color: getTextColor(),
          fontSize: 16,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
});

// Accessible text component with proper semantics
interface AccessibleTextProps extends TextProps {
  children: React.ReactNode;
  variant?: 'heading' | 'subheading' | 'body' | 'caption';
  semantic?: 'header' | 'summary' | 'text';
}

export const AccessibleText = React.memo<AccessibleTextProps>(function AccessibleText({
  children,
  variant = 'body',
  semantic = 'text',
  style,
  ...props
}) {
  const getTextStyle = () => {
    switch (variant) {
      case 'heading':
        return { fontSize: 24, fontWeight: '700' as const };
      case 'subheading':
        return { fontSize: 18, fontWeight: '600' as const };
      case 'body':
        return { fontSize: 16, fontWeight: '400' as const };
      case 'caption':
        return { fontSize: 14, fontWeight: '400' as const, opacity: 0.7 };
      default:
        return { fontSize: 16, fontWeight: '400' as const };
    }
  };

  const getAccessibilityRole = () => {
    switch (semantic) {
      case 'header':
        return 'header';
      case 'summary':
        return 'summary';
      default:
        return 'text';
    }
  };

  return (
    <Text accessibilityRole={getAccessibilityRole()} style={[getTextStyle(), style]} {...props}>
      {children}
    </Text>
  );
});

// Screen reader announcements hook
export const useScreenReader = () => {
  const announce = React.useCallback((message: string) => {
    // This would integrate with screen reader APIs
    // For now, we'll use a simple console log for development
    if (__DEV__) {
      console.log('Screen Reader:', message);
    }
  }, []);

  return { announce };
};
