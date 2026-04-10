import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useAppStyle } from '../../../theme/ThemeContext';
import { AppTheme, SpacingKey } from '../../../theme';

interface StackProps {
  children: React.ReactNode;
  direction?: 'column' | 'row';
  gap?: SpacingKey;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  style?: ViewStyle;
}

export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'column',
  gap = 'md',
  align,
  justify,
  style,
}) => {
  const styles = useAppStyle((t: AppTheme) => StyleSheet.create({
    container: {
      flexDirection: direction,
      gap: t.spacing[gap],
      alignItems: align,
      justifyContent: justify,
    },
  }));

  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
};
