import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../../theme/theme';

interface AppCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  style?: ViewStyle;
}

export const AppCheckbox: React.FC<AppCheckboxProps> = ({ checked, onChange, style }) => {
  return (
    <TouchableOpacity
      style={[
        styles.checkbox,
        checked && styles.checkboxChecked,
        style
      ]}
      onPress={() => onChange(!checked)}
      activeOpacity={0.7}
    >
      {checked && <Ionicons name="checkmark" size={14} color="#000" />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
