import React from 'react';
import { 
  View, 
  StyleSheet, 
  ViewStyle, 
  KeyboardAvoidingView, 
  Platform, 
  useWindowDimensions,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme, useAppStyle } from '../../../theme/ThemeContext';
import { AppTheme } from '../../../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  withPadding?: boolean;
  scrollable?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  withPadding = true,
  scrollable = false,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const styles = useAppStyle((theme: AppTheme) => {
    return StyleSheet.create({
      safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
      },
      keyboardView: {
        flex: 1,
      },
      content: {
        flex: 1,
        paddingHorizontal: withPadding ? (isTablet ? theme.spacing.xl : theme.spacing.md) : 0,
        // Fluid width for tablets to support grid layouts, while maintaining maximum reading width
        alignSelf: 'center',
        width: '100%',
        maxWidth: isTablet ? 1200 : '100%',
      },
    });
  });

  const ContentWrapper = scrollable ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ContentWrapper 
          style={[styles.content, style]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ContentWrapper>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
