import React, { useRef, useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Platform } from 'react-native';
import LottieView from 'lottie-react-native';

interface LocationButtonProps {
  onLocationPress: () => void;
  isActive?: boolean;
  style?: any;
}

export default function LocationButton({
  onLocationPress,
  isActive = false,
  style,
}: LocationButtonProps) {
  const animationRef = useRef<LottieView>(null);
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    // Trigger animation
    if (animationRef.current) {
      animationRef.current.play();
    }
    setIsPressed(!isPressed);
    onLocationPress();
  };

  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.activeContainer, style]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={[styles.button, isActive && styles.activeButton]}>
        <LottieView
          ref={animationRef}
          source={require('../../assets/animations/location-circle.json')}
          style={styles.lottie}
          autoPlay={isActive}
          loop={isActive}
          speed={1.2}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 20 : 100,
    right: 20,
    zIndex: 1000,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 3px 4.5px rgba(0, 0, 0, 0.3)',
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  activeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#005bb5',
  },
  lottie: {
    width: 36,
    height: 36,
  },
  activeContainer: {
    transform: [{ scale: 1.05 }],
  },
});
