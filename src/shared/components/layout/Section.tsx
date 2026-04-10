import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useAppStyle } from '../../../theme/ThemeContext';
import { AppTheme } from '../../../theme';
import { ThemeText } from '../ThemeText';
import { Stack } from './Stack';

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Section: React.FC<SectionProps> = ({
  title,
  children,
  style,
}) => {
  const styles = useAppStyle((t: AppTheme) => StyleSheet.create({
    container: {
      paddingVertical: t.spacing.lg,
    },
    title: {
      marginBottom: t.spacing.md,
    },
  }));

  return (
    <View style={[styles.container, style]}>
      {title && (
        <ThemeText level="h2" style={styles.title}>
          {title}
        </ThemeText>
      )}
      <Stack gap="md">
        {children}
      </Stack>
    </View>
  );
};
