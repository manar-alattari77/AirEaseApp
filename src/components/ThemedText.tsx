import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ThemedTextProps extends TextProps {
  variant?: 'title' | 'subtitle' | 'body' | 'caption' | 'button';
  color?: string;
  children: React.ReactNode;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = 'body',
  color,
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();
  
  const getVariantStyles = () => {
    const baseSize = 16;
    const scaledSize = baseSize * theme.textScale;
    
    switch (variant) {
      case 'title':
        return {
          fontSize: scaledSize * 1.5,
          fontWeight: 'bold' as const,
          color: color || theme.colors.text,
        };
      case 'subtitle':
        return {
          fontSize: scaledSize * 1.25,
          fontWeight: '600' as const,
          color: color || theme.colors.text,
        };
      case 'body':
        return {
          fontSize: scaledSize,
          fontWeight: 'normal' as const,
          color: color || theme.colors.text,
        };
      case 'caption':
        return {
          fontSize: scaledSize * 0.875,
          fontWeight: 'normal' as const,
          color: color || theme.colors.secondary,
        };
      case 'button':
        return {
          fontSize: scaledSize,
          fontWeight: '600' as const,
          color: color || theme.colors.primary,
        };
      default:
        return {
          fontSize: scaledSize,
          fontWeight: 'normal' as const,
          color: color || theme.colors.text,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Text
      style={[
        styles.base,
        variantStyles,
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: 'System',
  },
});
