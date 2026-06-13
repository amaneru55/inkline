import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const themeNameStorageKey = "inkline.theme.name";
const themeModeStorageKey = "inkline.theme.mode";
const legacyThemeStorageKey = "inkline.theme";

const themeNames = ["default", "inkline"] as const;
const themeModes = ["system", "light", "dark"] as const;
const colorModes = ["light", "dark"] as const;
const themeFullNames = ["light", "dark", "inkline-light", "inkline-dark"] as const;

const fallbackThemeName: ThemeName = "inkline";
const fallbackThemeMode: ThemeMode = "system";
const fallbackColorMode: ColorMode = "light";

export type ThemeName = (typeof themeNames)[number];
export type ThemeMode = (typeof themeModes)[number];
export type ColorMode = (typeof colorModes)[number];
export type ThemeFullName = (typeof themeFullNames)[number];

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

const isThemeName = (value: string | null): value is ThemeName =>
  value !== null && themeNames.some((themeName) => themeName === value);

const isThemeMode = (value: string | null): value is ThemeMode =>
  value !== null && themeModes.some((themeMode) => themeMode === value);

export const resolveStoredThemeName = (storedThemeName: string | null): ThemeName =>
  isThemeName(storedThemeName) ? storedThemeName : fallbackThemeName;

export const resolveStoredThemeMode = (storedThemeMode: string | null): ThemeMode =>
  isThemeMode(storedThemeMode) ? storedThemeMode : fallbackThemeMode;

export const resolveColorMode = (themeMode: ThemeMode, prefersDark: boolean): ColorMode => {
  if (themeMode === "system") {
    return prefersDark ? "dark" : "light";
  }

  return themeMode;
};

export const getThemeFullName = (
  themeName: ThemeName,
  resolvedColorMode: ColorMode,
): ThemeFullName =>
  themeName === "default" ? resolvedColorMode : `${themeName}-${resolvedColorMode}`;

const getSystemColorMode = (): ColorMode =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : fallbackColorMode;

const getStoredThemeName = (): ThemeName => {
  const storedThemeName = window.localStorage.getItem(themeNameStorageKey);

  if (storedThemeName !== null) {
    return resolveStoredThemeName(storedThemeName);
  }

  const legacyTheme = window.localStorage.getItem(legacyThemeStorageKey);
  return legacyTheme === "light" || legacyTheme === "dark"
    ? "default"
    : resolveStoredThemeName(legacyTheme);
};

const getStoredThemeMode = (): ThemeMode => {
  const storedThemeMode = window.localStorage.getItem(themeModeStorageKey);

  if (storedThemeMode !== null) {
    return resolveStoredThemeMode(storedThemeMode);
  }

  const legacyTheme = window.localStorage.getItem(legacyThemeStorageKey);
  return legacyTheme === "light" || legacyTheme === "dark" ? legacyTheme : fallbackThemeMode;
};

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
  const [themeName, setThemeName] = useState<ThemeName>(getStoredThemeName);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);
  const [systemColorMode, setSystemColorMode] = useState<ColorMode>(getSystemColorMode);
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
    window.localStorage.setItem(themeNameStorageKey, themeName);
    window.localStorage.setItem(themeModeStorageKey, themeMode);
  }, [resolvedColorMode, themeMode, themeName]);

  useEffect(() => {
    syncNativeTheme(themeMode);
  }, [themeMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      setThemeName,
      themeNames,
      themeMode,
      setThemeMode,
      themeModes,
      resolvedColorMode,
      themeFullName,
    }),
    [resolvedColorMode, themeFullName, themeMode, themeName],
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
