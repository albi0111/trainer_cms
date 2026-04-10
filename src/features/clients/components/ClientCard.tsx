import React from 'react';
import { StyleSheet, View, Pressable, Animated } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAppTheme, useAppStyle } from '../../../theme/ThemeContext';
import { AppTheme } from '../../../theme';
import { ThemeText } from '../../../shared/components/ThemeText';
import { ClientWithProfile, ClientDisplayStatus } from '../types';

interface ClientCardProps {
  client: ClientWithProfile;
  onPress: () => void;
  style?: object;
}

export const ClientCard = React.memo(({ client, onPress, style }: ClientCardProps) => {
  const isCreating = (client as any).status === 'creating';
  const displayStatus: ClientDisplayStatus = client.status === 'inactive' ? 'inactive' : 'active';
  
  // Animation value for tap feedback
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const styles = useAppStyle((t: AppTheme) => {
    const statusColor = displayStatus === 'active' ? t.colors.success : t.colors.textSecondary;
    
    return StyleSheet.create({
      cardBackground: {
        backgroundColor: t.colors.surfaceElevated,
        borderRadius: 20, // Premium rounded corners
        padding: t.spacing.lg,
        borderWidth: 1,
        borderColor: t.colors.border,
        opacity: isCreating ? 0.6 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        minHeight: 120, // Ensures consistency in grids
      },
      headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: t.spacing.sm,
      },
      avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: t.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: t.colors.border,
      },
      statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: statusColor,
        borderWidth: 2,
        borderColor: t.colors.surfaceElevated,
        position: 'absolute',
        top: -2,
        right: -2,
      },
      menuIcon: {
        padding: t.spacing.xs,
        opacity: 0.5,
      },
      nameText: {
        marginBottom: 2,
      },
      goalText: {
        flexShrink: 1,
      },
      footerRow: {
        flexDirection: 'row',
        marginTop: t.spacing.md,
        alignItems: 'center',
      },
      goalLabel: {
        marginLeft: 6,
        flex: 1,
      }
    });
  });

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const theme = useAppTheme();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress} 
        style={styles.cardBackground}
      >
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            <ThemeText level="body2" color="primary" style={{ fontWeight: '800' }}>
              {getInitials(client.name)}
            </ThemeText>
            <View style={styles.statusDot} />
          </View>
          <Icon name="chevron-right" size={24} color={styles.menuIcon.opacity ? theme.colors.textSecondary : theme.colors.textSecondary} style={styles.menuIcon} />
        </View>

        <View>
          <ThemeText level="h3" style={styles.nameText} numberOfLines={1}>
            {client.name}
          </ThemeText>
          <View style={styles.footerRow}>
            <Icon 
              name={client.goal ? "target" : "target-off"} 
              size={14} 
              color={client.goal ? theme.colors.primary : theme.colors.textTertiary} 
            />
            <ThemeText 
              level="caption" 
              color={client.goal ? "textSecondary" : "textTertiary"} 
              style={styles.goalLabel}
              numberOfLines={2}
            >
              {client.goal || 'No goal set'}
            </ThemeText>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});
