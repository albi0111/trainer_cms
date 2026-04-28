import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

type BadgeVariant = 'active' | 'completed' | 'on-hold' | 'pending';

interface StatusBadgeProps {
  status: BadgeVariant;
  /** Optional override label. If omitted, uses the status string. */
  label?: string;
  /** Optional style overrides */
  style?: ViewStyle;
}

const BADGE_THEMES: Record<BadgeVariant, { bg: string; text: string; label: string }> = {
  'active': { bg: '#1A2A1A', text: '#3DCC88', label: 'Active' },
  'completed': { bg: '#1E3A8A', text: '#60A5FA', label: 'Completed' },
  'on-hold': { bg: '#78350F', text: '#FBBF24', label: 'On Hold' },
  'pending': { bg: '#FFD700', text: '#000', label: 'Pending' },
};

export default function StatusBadge({ status, label, style }: StatusBadgeProps) {
  const theme = BADGE_THEMES[status] || BADGE_THEMES['active'];

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg }, style]}>
      <Text style={[styles.badgeText, { color: theme.text }]}>{label || theme.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
