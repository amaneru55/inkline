import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useInklineSettings } from "../../app/settings/SettingsProvider";
import type { ColorMode, ThemeFullName, ThemeMode, ThemeName } from "../../core/settings/schema";
import {
  colorModes,
  getThemeFullName,
  resolveColorMode,
  themeFullNames,
  themeModes,
  themeNames,
} from "../../core/settings/schema";

export type { ColorMode, ThemeFullName, ThemeMode, ThemeName };
export { getThemeFullName, resolveColorMode };

const fallbackColorMode: ColorMode = "light";

type ThemeContextValue = {
  themeName: ThemeName;
  setThemeName: (themeName: ThemeName) => void;
  themeNames: readonly ThemeName[];
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => void;
  themeModes: readonly ThemeMode[];
  resolvedColorMode: ColorMode;
  themeFullName: ThemeFullName;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getSystemColorMode = (): ColorMode =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : fallbackColorMode;

const applyTheme = (themeName: ThemeName, themeMode: ThemeMode, resolvedColorMode: ColorMode) => {
  const themeFullName = getThemeFullName(themeName, resolvedColorMode);
  const root = document.documentElement;

  root.dataset.theme = themeFullName;
  root.dataset.themeName = themeName;
  root.dataset.themeMode = themeMode;
  root.dataset.colorMode = resolvedColorMode;
  root.style.colorScheme = resolvedColorMode;
  root.classList.remove(...themeFullNames, ...colorModes);
  root.classList.add(themeFullName, resolvedColorMode);
};

const syncNativeTheme = (themeMode: ThemeMode) => {
  if (!("__TAURI_INTERNALS__" in window)) {
    return;
  }

  void import("@tauri-apps/api/app")
    .then(({ setTheme }) => setTheme(themeMode === "system" ? null : themeMode))
    .catch(() => undefined);
};

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings, updateSettings } = useInklineSettings();
  const [systemColorMode, setSystemColorMode] = useState<ColorMode>(getSystemColorMode);
  const { themeMode, themeName } = settings;
  const resolvedColorMode = resolveColorMode(themeMode, systemColorMode === "dark");
  const themeFullName = getThemeFullName(themeName, resolvedColorMode);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

    if (mediaQuery === undefined) {
      return undefined;
    }

    const handleChange = () => setSystemColorMode(mediaQuery.matches ? "dark" : "light");

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    applyTheme(themeName, themeMode, resolvedColorMode);
  }, [resolvedColorMode, themeMode, themeName]);

  useEffect(() => {
    syncNativeTheme(themeMode);
  }, [themeMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      setThemeName: (nextThemeName) => void updateSettings({ themeName: nextThemeName }),
      themeNames,
      themeMode,
      setThemeMode: (nextThemeMode) => void updateSettings({ themeMode: nextThemeMode }),
      themeModes,
      resolvedColorMode,
      themeFullName,
    }),
    [resolvedColorMode, themeFullName, themeMode, themeName, updateSettings],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useInklineTheme() {
  const value = useContext(ThemeContext);

  if (value === null) {
    throw new Error("useInklineTheme must be used within ThemeProvider.");
  }

  return value;
}
