import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme, useAppStyle } from '../../../theme/ThemeContext';
import { AppTheme } from '../../../theme';
import { ThemeText } from '../ThemeText';
import { Button } from '../Button';

interface ErrorStateProps {
  message: string;
  onRetry: () => Promise<void> | void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
}) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

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
    message: {
      marginBottom: t.spacing.xl,
    },
  }));

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons 
        name="alert-circle-outline" 
        size={64} 
        color="#FF3B30" 
        style={styles.icon} 
      />
      <ThemeText level="h3" align="center" style={styles.message} color="danger">
        {message}
      </ThemeText>
      <Button 
        label="Retry" 
        onPress={handleRetry} 
        loading={retrying}
        disabled={retrying}
      />
    </View>
  );
};
