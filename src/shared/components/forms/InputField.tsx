import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TextInputProps, 
  ViewStyle 
} from 'react-native';
import { useAppTheme, useAppStyle } from '../../../theme/ThemeContext';
import { AppTheme } from '../../../theme';
import { ThemeText } from '../ThemeText';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  containerStyle,
  onBlur,
  onFocus,
  ...props
}) => {
  const theme = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const styles = useAppStyle((t: AppTheme) => StyleSheet.create({
    container: {
      marginBottom: t.spacing.md,
    },
    label: {
      marginBottom: t.spacing.xs,
    },
    input: {
      height: 52,
      backgroundColor: t.colors.surface,
      borderRadius: 12,
      paddingHorizontal: t.spacing.md,
      borderWidth: 2,
      borderColor: error ? t.colors.danger : 
                  isFocused ? t.colors.primary : t.colors.surfaceElevated,
      color: t.colors.textPrimary,
      ...t.typography.body1,
    },
    errorText: {
      marginTop: t.spacing.xs,
    },
  }));

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemeText level="caption" color="textSecondary" style={styles.label}>
          {label}
        </ThemeText>
      )}
      <TextInput
        style={styles.input}
        placeholderTextColor={theme.colors.textTertiary}
        onFocus={handleFocus}
        onBlur={handleBlur}
        selectionColor={theme.colors.primary}
        {...props}
      />
      {error && (
        <ThemeText level="caption" color="danger" style={styles.errorText}>
          {error}
        </ThemeText>
      )}
    </View>
  );
};
