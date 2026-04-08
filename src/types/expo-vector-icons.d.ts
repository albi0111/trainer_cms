// Minimal type declaration for @expo/vector-icons.
// Install the actual package: npx expo install @expo/vector-icons
declare module '@expo/vector-icons' {
  import React from 'react';
  import { TextProps } from 'react-native';

  interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export const MaterialCommunityIcons: React.FC<IconProps>;
  export const Ionicons: React.FC<IconProps>;
  export const FontAwesome: React.FC<IconProps>;
  export const AntDesign: React.FC<IconProps>;
}
