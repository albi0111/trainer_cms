import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface AvatarCircleProps {
  /** Full name — first two characters are used as initials */
  name: string;
  /** Diameter of the avatar circle. Default: 48 */
  size?: number;
  /** Background color. Default: '#FFD700' */
  bgColor?: string;
  /** Text color. Default: '#000' */
  textColor?: string;
  /** Optional border color */
  borderColor?: string;
  /** Override container style */
  style?: ViewStyle;
}

export default function AvatarCircle({
  name,
  size = 48,
  bgColor = '#FFD700',
  textColor = '#000',
  borderColor,
  style,
}: AvatarCircleProps) {
  const initials = name.substring(0, 2).toUpperCase();
  const fontSize = size * 0.35;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
          justifyContent: 'center',
          alignItems: 'center',
        },
        borderColor ? { borderWidth: 1, borderColor } : null,
        style,
      ]}
    >
      <Text style={{ color: textColor, fontSize, fontWeight: '800' }}>{initials}</Text>
    </View>
  );
}
