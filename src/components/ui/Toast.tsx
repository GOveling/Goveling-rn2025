// src/components/ui/Toast.tsx
import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

type ToastItem = { id: number; text: string };
const ToastCtx = createContext<{ show: (text: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const opacity = useRef(new Animated.Value(0)).current;
  const { colors, radius, spacing } = useTheme();

  useEffect(() => {
    if (queue.length) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
            () => {
              setQueue((q) => q.slice(1));
            }
          );
        }, 1600);
      });
    }
  }, [queue.length]);

  function show(text: string) {
    setQueue((q) => [...q, { id: Date.now(), text }]);
  }

  const current = queue[0];

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {current ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: spacing(2),
            right: spacing(2),
            bottom: spacing(6),
            opacity,
            transform: [
              { translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            ],
          }}
          pointerEvents="none"
        >
          <View
            style={{
              backgroundColor: colors.card,
              padding: spacing(1.5),
              borderRadius: radius.lg,
              boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.15)',
              elevation: 4,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '700' }}>
              {current.text}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
