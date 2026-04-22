import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TopNavBarProps {
  /** Content to render on the left side (e.g. back button) */
  leftContent?: React.ReactNode;
  /** Content to render on the right side (e.g. profile button, sync) */
  rightContent?: React.ReactNode;
  /** Whether to show the FIT.PERSONA logo in the center. Defaults to true. */
  showLogo?: boolean;
}

export default function TopNavBar({ leftContent, rightContent, showLogo = true }: TopNavBarProps) {
  return (
    <View style={styles.topNav}>
      <View style={styles.slot}>{leftContent}</View>
      {showLogo && (
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>FIT</Text>
          </View>
          <Text style={styles.logoText}>FIT.PERSONA</Text>
        </View>
      )}
      <View style={[styles.slot, { justifyContent: 'flex-end' }]}>{rightContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  slot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  logoBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
