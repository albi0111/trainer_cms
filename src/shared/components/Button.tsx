import React, { useCallback } from 'react';
import { 
  Pressable, 
  StyleSheet, 
  ViewStyle, 
  Animated, 
  ActivityIndicator 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme, useAppStyle } from '../../theme/ThemeContext';
import { AppTheme } from '../../theme';
import { ThemeText } from './ThemeText';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  const theme = useAppTheme();
  const animatedScale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(animatedScale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [animatedScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(animatedScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [animatedScale]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [disabled, loading, onPress]);

  const styles = useAppStyle((t: AppTheme) => {
    const isPrimary = variant === 'primary';
    const isSecondary = variant === 'secondary';
    const isOutline = variant === 'outline';
    const isGhost = variant === 'ghost';
    
    let backgroundColor: string = 'transparent';
    let borderColor: string = 'transparent';
    let textColor: string = t.colors.textPrimary;

    if (isPrimary) {
      backgroundColor = t.colors.primary;
      textColor = t.colors.background;
    } else if (isSecondary) {
      backgroundColor = t.colors.surfaceElevated;
      textColor = t.colors.textPrimary;
    } else if (isOutline) {
      borderColor = t.colors.primary;
      textColor = t.colors.primary;
    } else if (isGhost) {
      textColor = t.colors.primary;
    }

    return StyleSheet.create({
      container: {
        height: 52,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: t.spacing.lg,
        backgroundColor,
        borderWidth: isOutline ? 2 : 0,
        borderColor,
        opacity: disabled ? 0.5 : 1,
      },
      text: {
        color: textColor,
      },
    });
  });

  return (
    <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[styles.container, style]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? theme.colors.background : theme.colors.primary} />
        ) : (
          <ThemeText 
            level="buttonLabel" 
            style={styles.text}
          >
            {label}
          </ThemeText>
        )}
      </Pressable>
    </Animated.View>
  );
};
