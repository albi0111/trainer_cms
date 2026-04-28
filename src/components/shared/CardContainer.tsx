import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { commonStyles } from '../../theme/theme';

interface CardContainerProps {
  children: React.ReactNode;
  /** Optional icon name from Ionicons */
  headerIcon?: keyof typeof Ionicons.glyphMap;
  /** Optional color for the header icon */
  headerIconColor?: string;
  /** Optional title text displayed next to the icon */
  headerTitle?: string;
  /** Optional element to render to the right of the header title */
  headerAddon?: React.ReactNode;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional action button icon */
  actionIcon?: keyof typeof Ionicons.glyphMap;
  /** Optional action button icon color */
  actionIconColor?: string;
  /** Callback when action button is pressed */
  onAction?: () => void;
  /** Override container styles */
  style?: ViewStyle;
}

export default function CardContainer({
  children,
  headerIcon,
  headerIconColor = '#FFD700',
  headerTitle,
  headerAddon,
  actionLabel,
  actionIcon,
  actionIconColor = '#AAA',
  onAction,
  style,
}: CardContainerProps) {
  const showHeader = headerIcon || headerTitle || actionLabel || headerAddon;

  return (
    <View style={[styles.container, style]}>
      {showHeader && (
        <View style={styles.headerRow}>
          <View style={styles.row}>
            {headerIcon && <Ionicons name={headerIcon} size={16} color={headerIconColor} />}
            {headerTitle && <Text style={styles.headerTitle}>{headerTitle}</Text>}
            {headerAddon}
          </View>
          {(actionLabel || actionIcon) && onAction && (
            <TouchableOpacity 
              style={[
                styles.actionBtn, 
                !actionLabel && styles.circularActionBtn
              ]} 
              onPress={onAction}
            >
              {actionIcon && <Ionicons name={actionIcon} size={actionLabel ? 12 : 16} color={actionIconColor} />}
              {actionLabel && (
                <Text style={[styles.actionBtnText, actionIcon ? { marginLeft: 4 } : null]}>{actionLabel}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#AAA',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  actionBtnText: {
    color: '#AAA',
    fontSize: 11,
    fontWeight: '600',
  },
  circularActionBtn: {
    ...commonStyles.circularButton,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
