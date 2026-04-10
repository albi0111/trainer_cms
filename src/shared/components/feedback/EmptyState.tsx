import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme, useAppStyle } from '../../../theme/ThemeContext';
import { AppTheme } from '../../../theme';
import { ThemeText } from '../ThemeText';
import { Button } from '../Button';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: any;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = 'database-off-outline',
  actionLabel,
  onAction,
}) => {
  const styles = useAppStyle((t: AppTheme) => StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: t.spacing.xl,
    },
    icon: {
      marginBottom: t.spacing.lg,
    },
    title: {
      marginBottom: t.spacing.sm,
    },
  }));

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons 
        name={icon} 
        size={64} 
        color="#E6FF00" 
        style={styles.icon} 
      />
      <ThemeText level="h2" align="center" style={styles.title}>
        {title}
      </ThemeText>
      <ThemeText level="body2" color="textSecondary" align="center" style={{ marginBottom: 24 }}>
        {message}
      </ThemeText>
      {actionLabel && onAction && (
        <View style={{ width: '100%', maxWidth: 200 }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
};
