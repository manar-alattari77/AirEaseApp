import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ThemePreferences {
  highContrast: boolean;
  largeText: boolean;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  text: string;
  card: string;
  border: string;
  accent: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
}

export interface Theme {
  colors: ThemeColors;
  textScale: number;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
}

interface ThemeContextType {
  preferences: ThemePreferences;
  theme: Theme;
  updatePreferences: (newPreferences: Partial<ThemePreferences>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getThemeColors = (highContrast: boolean): ThemeColors => {
  if (highContrast) {
    return {
      background: '#000000',
      foreground: '#FFFFFF',
      text: '#FFFFFF',
      card: '#1A1A1A',
      border: '#FFFFFF',
      accent: '#00FF00',
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
      success: '#00FF00',
      warning: '#FFFF00',
      error: '#FF0000',
    };
  } else {
    return {
      background: '#FFFFFF',
      foreground: '#000000',
      text: '#000000',
      card: '#F8F9FA',
      border: '#E5E5E5',
      accent: '#007AFF',
      primary: '#000000',
      secondary: '#666666',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
    };
  }
};

const getTheme = (preferences: ThemePreferences): Theme => {
  const colors = getThemeColors(preferences.highContrast);
  const textScale = preferences.largeText ? 1.3 : 1.0;

  return {
    colors,
    textScale,
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
    },
  };
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<ThemePreferences>({
    highContrast: false,
    largeText: false,
  });

  const theme = getTheme(preferences);

  const updatePreferences = (newPreferences: Partial<ThemePreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  const value: ThemeContextType = {
    preferences,
    theme,
    updatePreferences,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
