import React from 'react';
import { View, ViewProps, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ThemedScreenProps extends ViewProps {
  children: React.ReactNode;
  safeArea?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const ThemedScreen: React.FC<ThemedScreenProps> = ({
  children,
  safeArea = true,
  padding = 'md',
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'sm':
        return { padding: theme.spacing.sm };
      case 'md':
        return { padding: theme.spacing.md };
      case 'lg':
        return { padding: theme.spacing.lg };
      default:
        return { padding: theme.spacing.md };
    }
  };

  const paddingStyles = getPaddingStyles();

  const screenStyles = [
    styles.base,
    {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    paddingStyles,
    style,
  ];

  if (safeArea) {
    return (
      <SafeAreaView style={screenStyles} {...props}>
        {children}
      </SafeAreaView>
    );
  }

  return (
    <View style={screenStyles} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
