import React, { useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Animated, 
  ViewStyle 
} from 'react-native';
import { useAppTheme, useAppStyle } from '../../../theme/ThemeContext';
import { AppTheme } from '../../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  const styles = useAppStyle((t: AppTheme) => StyleSheet.create({
    skeleton: {
      backgroundColor: t.colors.surfaceElevated,
      width: width as any,
      height: height as any,
      borderRadius,
    },
  }));

  return (
    <Animated.View style={[styles.skeleton, { opacity }, style]} />
  );
};

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';
  skeletonCount?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  skeletonCount = 3,
}) => {
  const styles = useAppStyle((t: AppTheme) => StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: t.spacing.lg,
    },
    skeletonContainer: {
      width: '100%',
      gap: t.spacing.md,
    },
  }));

  if (variant === 'skeleton') {
    return (
      <View style={styles.skeletonContainer}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} height={60} borderRadius={12} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#E6FF00" />
    </View>
  );
};
