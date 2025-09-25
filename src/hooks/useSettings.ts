import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet } from 'react-native';

export type Settings = {
  voiceFirst: boolean;
  highContrast: boolean;
  largeText: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  voiceFirst: false,
  highContrast: true,
  largeText: false,
};

const STORAGE_KEYS = {
  voiceFirst: 'airease_voiceFirst',
  highContrast: 'airease_highContrast',
  largeText: 'airease_largeText',
} as const;

type PartialSettings = Partial<Settings>;

export function useSettings(): [Settings, (partial: PartialSettings) => Promise<void>, boolean] {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    const load = async () => {
      try {
        const [v, hc, lt] = await AsyncStorage.multiGet([
          STORAGE_KEYS.voiceFirst,
          STORAGE_KEYS.highContrast,
          STORAGE_KEYS.largeText,
        ]);
        const next: Settings = {
          voiceFirst: v?.[1] != null ? v[1] === 'true' : DEFAULT_SETTINGS.voiceFirst,
          highContrast: hc?.[1] != null ? hc[1] === 'true' : DEFAULT_SETTINGS.highContrast,
          largeText: lt?.[1] != null ? lt[1] === 'true' : DEFAULT_SETTINGS.largeText,
        };
        if (isMountedRef.current) setSettings(next);
      } catch (e) {
        // Fallback to defaults on error
        if (isMountedRef.current) setSettings(DEFAULT_SETTINGS);
      } finally {
        if (isMountedRef.current) setHydrated(true);
      }
    };
    load();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const update = useCallback(async (partial: PartialSettings) => {
    setSettings(current => {
      const merged = { ...current, ...partial };
      // Fire-and-forget persist; still await below for caller
      void AsyncStorage.multiSet([
        [STORAGE_KEYS.voiceFirst, String(merged.voiceFirst)],
        [STORAGE_KEYS.highContrast, String(merged.highContrast)],
        [STORAGE_KEYS.largeText, String(merged.largeText)],
      ]);
      return merged;
    });
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.voiceFirst, String((partial.voiceFirst ?? settings.voiceFirst))],
      [STORAGE_KEYS.highContrast, String((partial.highContrast ?? settings.highContrast))],
      [STORAGE_KEYS.largeText, String((partial.largeText ?? settings.largeText))],
    ]);
  }, [settings.voiceFirst, settings.highContrast, settings.largeText]);

  return [settings, update, hydrated];
}

export type Theme = {
  colors: {
    background: string;
    foreground: string;
    text?: string;
    card?: string;
    accent: string;
    border: string;
  };
  textScale: number;
  card: ReturnType<typeof StyleSheet.create>['card'];
};

export function useThemeStyles(settings: Settings) {
  const theme = useMemo(() => {
    const isHighContrast = settings.highContrast;
    const colors = {
      background: isHighContrast ? '#000000' : '#FFFFFF',
      foreground: isHighContrast ? '#FFFFFF' : '#111111',
      text: isHighContrast ? '#FFFFFF' : '#111111',
      card: isHighContrast ? '#000000' : '#FFFFFF',
      accent: isHighContrast ? '#FFD400' : '#2E7D32',
      border: isHighContrast ? '#FFFFFF' : '#CCCCCC',
    };
    const textScale = settings.largeText ? 1.3 : 1.0;
    const styles = StyleSheet.create({
      card: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
      },
    });
    return { colors, textScale, card: styles.card };
  }, [settings.highContrast, settings.largeText]);

  return theme;
}

export default useSettings;

