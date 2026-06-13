export const themeNames = ["default", "inkline"] as const;
export const themeModes = ["system", "light", "dark"] as const;
export const colorModes = ["light", "dark"] as const;
export const themeFullNames = ["light", "dark", "inkline-light", "inkline-dark"] as const;
export const settingsLanguages = ["zh-CN", "en-US"] as const;
export const closeBehaviors = ["hide-to-tray", "exit"] as const;

export type ThemeName = (typeof themeNames)[number];
export type ThemeMode = (typeof themeModes)[number];
export type ColorMode = (typeof colorModes)[number];
export type ThemeFullName = (typeof themeFullNames)[number];
export type SettingsLanguage = (typeof settingsLanguages)[number];
export type CloseBehavior = (typeof closeBehaviors)[number];

export type AppSettings = {
  themeName: ThemeName;
  themeMode: ThemeMode;
  language: SettingsLanguage;
  closeBehavior: CloseBehavior;
};

export const defaultSettings = {
  themeName: "inkline",
  themeMode: "system",
  language: "zh-CN",
  closeBehavior: "hide-to-tray",
} as const satisfies AppSettings;

const isOneOf = <T extends readonly string[]>(value: unknown, values: T): value is T[number] =>
  typeof value === "string" && values.some((candidate) => candidate === value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const resolveThemeName = (value: unknown): ThemeName =>
  isOneOf(value, themeNames) ? value : defaultSettings.themeName;

export const resolveThemeMode = (value: unknown): ThemeMode =>
  isOneOf(value, themeModes) ? value : defaultSettings.themeMode;

export const resolveSettingsLanguage = (value: unknown): SettingsLanguage =>
  isOneOf(value, settingsLanguages) ? value : defaultSettings.language;

export const resolveCloseBehavior = (value: unknown): CloseBehavior =>
  isOneOf(value, closeBehaviors) ? value : defaultSettings.closeBehavior;

export const normalizeAppSettings = (value: unknown): AppSettings => {
  if (!isRecord(value)) {
    return defaultSettings;
  }

  return {
    themeName: resolveThemeName(value.themeName),
    themeMode: resolveThemeMode(value.themeMode),
    language: resolveSettingsLanguage(value.language),
    closeBehavior: resolveCloseBehavior(value.closeBehavior),
  };
};

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
