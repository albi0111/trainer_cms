import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useAppTheme, useAppStyle } from '../../theme/ThemeContext';
import { TypographyKey, ColorKey, AppTheme } from '../../theme';

interface ThemeTextProps extends TextProps {
  level?: TypographyKey;
  color?: ColorKey;
  align?: TextStyle['textAlign'];
}

export const ThemeText: React.FC<ThemeTextProps> = ({
  level = 'body1',
  color = 'textPrimary',
  align = 'left',
  style,
  children,
  ...props
}) => {
  const styles = useAppStyle((theme: AppTheme) => ({
    text: {
      ...theme.typography[level],
      color: theme.colors[color],
      textAlign: align,
    } as TextStyle,
  }));

  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
};
