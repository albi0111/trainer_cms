import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/theme';

interface AppSelectProps {
  label?: string;
  value: string;
  onPress: () => void;
  style?: ViewStyle;
}

export const AppSelect: React.FC<AppSelectProps> = ({ label, value, onPress, style }) => {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.selectBtn}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.selectBtnText}>{value}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textLabel} />
      </TouchableOpacity>
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
  selectBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
});
