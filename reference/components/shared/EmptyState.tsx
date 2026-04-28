import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  /** Message to display */
  message: string;
  /** Optional icon name */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Optional style overrides */
  style?: ViewStyle;
}

export default function EmptyState({ message, icon, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon && <Ionicons name={icon} size={24} color="#444" style={{ marginBottom: 8 }} />}
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  text: {
    color: '#555',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
