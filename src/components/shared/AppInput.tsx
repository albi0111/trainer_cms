import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/theme';

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isTextArea?: boolean;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  icon,
  isTextArea,
  style,
  ...rest
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        error ? styles.inputError : null,
        isTextArea ? styles.textAreaWrapper : null
      ]}>
        {icon && (
          <Ionicons
            name={icon}
            size={14}
            color={colors.textLabel}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            icon ? styles.inputWithIcon : null,
            isTextArea ? styles.textArea : null,
            style
          ]}
          placeholderTextColor={colors.textPlaceholder}
          textAlignVertical={isTextArea ? "top" : "auto"}
          multiline={isTextArea}
          numberOfLines={isTextArea ? 4 : 1}
          {...rest}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  label: {
    color: '#666',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  inputError: {
    borderColor: colors.error,
  },
  icon: {
    paddingLeft: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    padding: 14,
    fontSize: 14,
  },
  inputWithIcon: {
    paddingLeft: spacing.sm,
  },
  textArea: {
    minHeight: 90,
  },
  errorText: {
    color: colors.error,
    fontSize: 11,
    marginTop: spacing.xs,
  },
});
