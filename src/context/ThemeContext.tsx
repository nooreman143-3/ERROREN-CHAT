import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode, WallpaperStyle, AccentColor } from '../types';
import { safeStorage } from '../utils/safeStorage';

export interface AccentOption {
  id: AccentColor;
  name: string;
  hex: string;
  hoverHex: string;
  activeHex: string;
  textColorDark: string;
  textColorLight: string;
  softBgDark: string;
  softBgLight: string;
  borderDark: string;
  borderLight: string;
  borderStrongDark: string;
  borderStrongLight: string;
  glowShadow: string;
  foregroundDark: string;
  foregroundLight: string;
  ringDark: string;
  ringLight: string;
  // Computed helpers for current mode
  textColor: string;
  softBg: string;
  border: string;
  borderStrong: string;
  foreground: string;
  ring: string;
}

export type RawAccentOption = Omit<AccentOption, 'textColor' | 'softBg' | 'border' | 'borderStrong' | 'foreground' | 'ring'>;

export const ACCENT_COLORS: RawAccentOption[] = [
  {
    id: 'blue',
    name: 'Blue',
    hex: '#3B82F6',
    hoverHex: '#2563EB',
    activeHex: '#1D4ED8',
    textColorDark: '#60A5FA',
    textColorLight: '#1D4ED8',
    softBgDark: 'rgba(59, 130, 246, 0.16)',
    softBgLight: 'rgba(59, 130, 246, 0.10)',
    borderDark: 'rgba(59, 130, 246, 0.35)',
    borderLight: 'rgba(59, 130, 246, 0.30)',
    borderStrongDark: 'rgba(59, 130, 246, 0.65)',
    borderStrongLight: 'rgba(59, 130, 246, 0.55)',
    glowShadow: '0 0 20px rgba(59, 130, 246, 0.35)',
    foregroundDark: '#FFFFFF',
    foregroundLight: '#FFFFFF',
    ringDark: 'rgba(59, 130, 246, 0.45)',
    ringLight: 'rgba(59, 130, 246, 0.45)',
  },
  {
    id: 'purple',
    name: 'Purple',
    hex: '#8B5CF6',
    hoverHex: '#7C3AED',
    activeHex: '#6D28D9',
    textColorDark: '#A78BFA',
    textColorLight: '#6D28D9',
    softBgDark: 'rgba(139, 92, 246, 0.16)',
    softBgLight: 'rgba(139, 92, 246, 0.10)',
    borderDark: 'rgba(139, 92, 246, 0.35)',
    borderLight: 'rgba(139, 92, 246, 0.30)',
    borderStrongDark: 'rgba(139, 92, 246, 0.65)',
    borderStrongLight: 'rgba(139, 92, 246, 0.55)',
    glowShadow: '0 0 20px rgba(139, 92, 246, 0.35)',
    foregroundDark: '#FFFFFF',
    foregroundLight: '#FFFFFF',
    ringDark: 'rgba(139, 92, 246, 0.45)',
    ringLight: 'rgba(139, 92, 246, 0.45)',
  },
  {
    id: 'pink',
    name: 'Pink',
    hex: '#EC4899',
    hoverHex: '#DB2777',
    activeHex: '#BE185D',
    textColorDark: '#F472B6',
    textColorLight: '#BE185D',
    softBgDark: 'rgba(236, 72, 153, 0.16)',
    softBgLight: 'rgba(236, 72, 153, 0.10)',
    borderDark: 'rgba(236, 72, 153, 0.35)',
    borderLight: 'rgba(236, 72, 153, 0.30)',
    borderStrongDark: 'rgba(236, 72, 153, 0.65)',
    borderStrongLight: 'rgba(236, 72, 153, 0.55)',
    glowShadow: '0 0 20px rgba(236, 72, 153, 0.35)',
    foregroundDark: '#FFFFFF',
    foregroundLight: '#FFFFFF',
    ringDark: 'rgba(236, 72, 153, 0.45)',
    ringLight: 'rgba(236, 72, 153, 0.45)',
  },
  {
    id: 'red',
    name: 'Red',
    hex: '#EF4444',
    hoverHex: '#DC2626',
    activeHex: '#B91C1C',
    textColorDark: '#F87171',
    textColorLight: '#B91C1C',
    softBgDark: 'rgba(239, 68, 68, 0.16)',
    softBgLight: 'rgba(239, 68, 68, 0.10)',
    borderDark: 'rgba(239, 68, 68, 0.35)',
    borderLight: 'rgba(239, 68, 68, 0.30)',
    borderStrongDark: 'rgba(239, 68, 68, 0.65)',
    borderStrongLight: 'rgba(239, 68, 68, 0.55)',
    glowShadow: '0 0 20px rgba(239, 68, 68, 0.35)',
    foregroundDark: '#FFFFFF',
    foregroundLight: '#FFFFFF',
    ringDark: 'rgba(239, 68, 68, 0.45)',
    ringLight: 'rgba(239, 68, 68, 0.45)',
  },
  {
    id: 'orange',
    name: 'Orange',
    hex: '#F97316',
    hoverHex: '#EA580C',
    activeHex: '#C2410C',
    textColorDark: '#FB923C',
    textColorLight: '#C2410C',
    softBgDark: 'rgba(249, 115, 22, 0.16)',
    softBgLight: 'rgba(249, 115, 22, 0.10)',
    borderDark: 'rgba(249, 115, 22, 0.35)',
    borderLight: 'rgba(249, 115, 22, 0.30)',
    borderStrongDark: 'rgba(249, 115, 22, 0.65)',
    borderStrongLight: 'rgba(249, 115, 22, 0.55)',
    glowShadow: '0 0 20px rgba(249, 115, 22, 0.35)',
    foregroundDark: '#FFFFFF',
    foregroundLight: '#FFFFFF',
    ringDark: 'rgba(249, 115, 22, 0.45)',
    ringLight: 'rgba(249, 115, 22, 0.45)',
  },
  {
    id: 'green',
    name: 'Green',
    hex: '#10B981',
    hoverHex: '#059669',
    activeHex: '#047857',
    textColorDark: '#34D399',
    textColorLight: '#047857',
    softBgDark: 'rgba(16, 185, 129, 0.16)',
    softBgLight: 'rgba(16, 185, 129, 0.10)',
    borderDark: 'rgba(16, 185, 129, 0.35)',
    borderLight: 'rgba(16, 185, 129, 0.30)',
    borderStrongDark: 'rgba(16, 185, 129, 0.65)',
    borderStrongLight: 'rgba(16, 185, 129, 0.55)',
    glowShadow: '0 0 20px rgba(16, 185, 129, 0.35)',
    foregroundDark: '#FFFFFF',
    foregroundLight: '#FFFFFF',
    ringDark: 'rgba(16, 185, 129, 0.45)',
    ringLight: 'rgba(16, 185, 129, 0.45)',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    hex: '#06B6D4',
    hoverHex: '#0891B2',
    activeHex: '#0E7490',
    textColorDark: '#22D3EE',
    textColorLight: '#0E7490',
    softBgDark: 'rgba(6, 182, 212, 0.16)',
    softBgLight: 'rgba(6, 182, 212, 0.10)',
    borderDark: 'rgba(6, 182, 212, 0.35)',
    borderLight: 'rgba(6, 182, 212, 0.30)',
    borderStrongDark: 'rgba(6, 182, 212, 0.65)',
    borderStrongLight: 'rgba(6, 182, 212, 0.55)',
    glowShadow: '0 0 20px rgba(6, 182, 212, 0.35)',
    foregroundDark: '#FFFFFF',
    foregroundLight: '#FFFFFF',
    ringDark: 'rgba(6, 182, 212, 0.45)',
    ringLight: 'rgba(6, 182, 212, 0.45)',
  },
  {
    id: 'gold',
    name: 'Gold',
    hex: '#EAB308',
    hoverHex: '#CA8A04',
    activeHex: '#A16207',
    textColorDark: '#FACC15',
    textColorLight: '#854D0E',
    softBgDark: 'rgba(234, 179, 8, 0.16)',
    softBgLight: 'rgba(234, 179, 8, 0.10)',
    borderDark: 'rgba(234, 179, 8, 0.35)',
    borderLight: 'rgba(234, 179, 8, 0.30)',
    borderStrongDark: 'rgba(234, 179, 8, 0.65)',
    borderStrongLight: 'rgba(234, 179, 8, 0.55)',
    glowShadow: '0 0 20px rgba(234, 179, 8, 0.35)',
    foregroundDark: '#070A0F',
    foregroundLight: '#070A0F',
    ringDark: 'rgba(234, 179, 8, 0.45)',
    ringLight: 'rgba(234, 179, 8, 0.45)',
  },
];

export const ACCENT_OPTIONS = ACCENT_COLORS;

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  accentColor: AccentColor;
  setAccentColor: (accent: AccentColor) => void;
  currentAccent: AccentOption;
  ACCENT_OPTIONS: AccentOption[];
  wallpaper: WallpaperStyle | string;
  setWallpaper: (wallpaper: WallpaperStyle | string) => void;
  customGalleryWallpaper: string | null;
  setCustomGalleryWallpaper: (dataUrl: string | null) => void;
  chatWallpapers: { [chatId: string]: string };
  setChatWallpaper: (chatId: string, wallpaperValue: string) => void;
  resetChatWallpaper: (chatId: string) => void;
  getEffectiveWallpaper: (chatId?: string) => string;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = safeStorage.getItem('erroren_theme') as ThemeMode;
    if (saved && (saved === 'dark' || saved === 'light' || saved === 'system')) {
      return saved;
    }
    return 'dark';
  });

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    const saved = safeStorage.getItem('erroren_accent_color') as AccentColor;
    if (saved && ACCENT_COLORS.some((c) => c.id === saved)) {
      return saved;
    }
    return 'blue';
  });

  const [wallpaper, setWallpaperState] = useState<string>(() => {
    return safeStorage.getItem('erroren_wallpaper') || 'cyber-mesh';
  });

  const [customGalleryWallpaper, setCustomGalleryWallpaperState] = useState<string | null>(() => {
    return safeStorage.getItem('erroren_custom_wallpaper') || null;
  });

  const [chatWallpapers, setChatWallpapersState] = useState<{ [chatId: string]: string }>(() => {
    return safeStorage.getJSON<{ [chatId: string]: string }>('erroren_per_chat_wallpapers', {});
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    return safeStorage.getItem('erroren_sound') !== 'false';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && theme === 'system' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme !== 'light';
  });

  // Calculate current accent with dynamic light/dark helpers
  const rawAccent = ACCENT_COLORS.find((c) => c.id === accentColor) || ACCENT_COLORS[0];
  const currentAccent: AccentOption = {
    ...rawAccent,
    textColor: isDark ? rawAccent.textColorDark : rawAccent.textColorLight,
    softBg: isDark ? rawAccent.softBgDark : rawAccent.softBgLight,
    border: isDark ? rawAccent.borderDark : rawAccent.borderLight,
    borderStrong: isDark ? rawAccent.borderStrongDark : rawAccent.borderStrongLight,
    foreground: isDark ? rawAccent.foregroundDark : rawAccent.foregroundLight,
    ring: isDark ? rawAccent.ringDark : rawAccent.ringLight,
  };

  const allAccentOptions: AccentOption[] = ACCENT_COLORS.map((c) => ({
    ...c,
    textColor: isDark ? c.textColorDark : c.textColorLight,
    softBg: isDark ? c.softBgDark : c.softBgLight,
    border: isDark ? c.borderDark : c.borderLight,
    borderStrong: isDark ? c.borderStrongDark : c.borderStrongLight,
    foreground: isDark ? c.foregroundDark : c.foregroundLight,
    ring: isDark ? c.ringDark : c.ringLight,
  }));

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    const applyTheme = () => {
      let activeIsDark = true;
      if (theme === 'system') {
        activeIsDark = mediaQuery ? mediaQuery.matches : true;
      } else {
        activeIsDark = theme === 'dark';
      }

      setIsDark(activeIsDark);
      if (activeIsDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        document.body.style.backgroundColor = '#070A0F';
        document.body.style.color = '#F1F5F9';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        document.body.style.backgroundColor = '#F8FAFC';
        document.body.style.color = '#0F172A';
      }

      const activeText = activeIsDark ? rawAccent.textColorDark : rawAccent.textColorLight;
      const activeSoftBg = activeIsDark ? rawAccent.softBgDark : rawAccent.softBgLight;
      const activeBorder = activeIsDark ? rawAccent.borderDark : rawAccent.borderLight;
      const activeBorderStrong = activeIsDark ? rawAccent.borderStrongDark : rawAccent.borderStrongLight;
      const activeForeground = activeIsDark ? rawAccent.foregroundDark : rawAccent.foregroundLight;
      const activeRing = activeIsDark ? rawAccent.ringDark : rawAccent.ringLight;

      // Update accent CSS variables on root
      root.style.setProperty('--accent', rawAccent.hex);
      root.style.setProperty('--accent-hex', rawAccent.hex);
      root.style.setProperty('--accent-hover', rawAccent.hoverHex);
      root.style.setProperty('--accent-active', rawAccent.activeHex);
      root.style.setProperty('--accent-text', activeText);
      root.style.setProperty('--accent-soft', activeSoftBg);
      root.style.setProperty('--accent-soft-bg', activeSoftBg);
      root.style.setProperty('--accent-border', activeBorder);
      root.style.setProperty('--accent-border-strong', activeBorderStrong);
      root.style.setProperty('--accent-foreground', activeForeground);
      root.style.setProperty('--accent-glow', rawAccent.glowShadow);
      root.style.setProperty('--accent-ring', activeRing);

      root.setAttribute('data-accent', accentColor);
      root.setAttribute('data-theme', activeIsDark ? 'dark' : 'light');
    };

    applyTheme();
    if (mediaQuery && mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme, accentColor, rawAccent]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    safeStorage.setItem('erroren_theme', newTheme);
  };

  const setAccentColor = (newAccent: AccentColor) => {
    setAccentColorState(newAccent);
    safeStorage.setItem('erroren_accent_color', newAccent);
  };

  const setWallpaper = (newWall: WallpaperStyle | string) => {
    setWallpaperState(newWall);
    safeStorage.setItem('erroren_wallpaper', newWall);
  };

  const setCustomGalleryWallpaper = (dataUrl: string | null) => {
    setCustomGalleryWallpaperState(dataUrl);
    if (dataUrl) {
      safeStorage.setItem('erroren_custom_wallpaper', dataUrl);
    } else {
      safeStorage.removeItem('erroren_custom_wallpaper');
    }
  };

  const setChatWallpaper = (chatId: string, wallpaperValue: string) => {
    setChatWallpapersState((prev) => {
      const updated = { ...prev, [chatId]: wallpaperValue };
      safeStorage.setJSON('erroren_per_chat_wallpapers', updated);
      return updated;
    });
  };

  const resetChatWallpaper = (chatId: string) => {
    setChatWallpapersState((prev) => {
      const updated = { ...prev };
      delete updated[chatId];
      safeStorage.setJSON('erroren_per_chat_wallpapers', updated);
      return updated;
    });
  };

  const getEffectiveWallpaper = (chatId?: string): string => {
    if (chatId && chatWallpapers[chatId]) {
      return chatWallpapers[chatId];
    }
    return wallpaper;
  };

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    safeStorage.setItem('erroren_sound', enabled ? 'true' : 'false');
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        currentAccent,
        ACCENT_OPTIONS: allAccentOptions,
        wallpaper,
        setWallpaper,
        customGalleryWallpaper,
        setCustomGalleryWallpaper,
        chatWallpapers,
        setChatWallpaper,
        resetChatWallpaper,
        getEffectiveWallpaper,
        soundEnabled,
        setSoundEnabled,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
