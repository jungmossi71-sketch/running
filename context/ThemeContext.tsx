import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppThemeType = 'default' | 'cyberpunk' | 'electric_blue';

export interface ThemeColors {
  main: string;
  sub: string;
}

export const THEME_PALETTES: Record<AppThemeType, ThemeColors> = {
  default: { main: '#39FF14', sub: '#00F0FF' },
  cyberpunk: { main: '#FF00FF', sub: '#FFFF00' },
  electric_blue: { main: '#00BFFF', sub: '#00F0FF' },
};

export const THEME_BACKGROUNDS = {
  cyberpunk: require('../assets/images/cyberpunk_bg.png'),
  electric_blue: require('../assets/images/electric_bg.png'),
};interface ThemeContextType {
  customBackgroundUri: string | null;
  setCustomBackgroundUri: (uri: string | null) => void;
  appTheme: AppThemeType;
  setAppTheme: (theme: AppThemeType) => void;
  colors: ThemeColors;
  unlockedThemes: string[];
  unlockTheme: (themeId: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  customBackgroundUri: null,
  setCustomBackgroundUri: () => {},
  appTheme: 'default',
  setAppTheme: () => {},
  colors: THEME_PALETTES.default,
  unlockedThemes: ['default'],
  unlockTheme: async () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [customBackgroundUri, setCustomBackgroundUriState] = useState<string | null>(null);
  const [appTheme, setAppThemeState] = useState<AppThemeType>('default');
  const [unlockedThemes, setUnlockedThemes] = useState<string[]>(['default']);

  useEffect(() => {
    // Load from storage on mount
    AsyncStorage.getItem('custom_bg').then((uri) => {
      if (uri) setCustomBackgroundUriState(uri);
    });
    AsyncStorage.getItem('app_theme').then((theme) => {
      if (theme && (theme === 'default' || theme === 'cyberpunk' || theme === 'electric_blue')) {
        setAppThemeState(theme as AppThemeType);
      }
    });
    AsyncStorage.getItem('unlocked_themes').then((data) => {
      if (data) setUnlockedThemes(JSON.parse(data));
    });
  }, []);

  const setCustomBackgroundUri = async (uri: string | null) => {
    setCustomBackgroundUriState(uri);
    if (uri) {
      await AsyncStorage.setItem('custom_bg', uri);
      setAppThemeState('default');
      await AsyncStorage.setItem('app_theme', 'default');
    } else {
      await AsyncStorage.removeItem('custom_bg');
    }
  };

  const setAppTheme = async (theme: AppThemeType) => {
    setAppThemeState(theme);
    await AsyncStorage.setItem('app_theme', theme);
    if (theme !== 'default') {
      setCustomBackgroundUriState(null);
      await AsyncStorage.removeItem('custom_bg');
    }
  };

  const colors = THEME_PALETTES[appTheme];

  const unlockTheme = async (themeId: string) => {
    const newUnlocked = [...new Set([...unlockedThemes, themeId])];
    setUnlockedThemes(newUnlocked);
    await AsyncStorage.setItem('unlocked_themes', JSON.stringify(newUnlocked));
  };

  return (
    <ThemeContext.Provider value={{ customBackgroundUri, setCustomBackgroundUri, appTheme, setAppTheme, colors, unlockedThemes, unlockTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
