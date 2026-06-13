import * as z from "zod";

export const themeNames = ["default", "inkline"] as const;
export const themeModes = ["system", "light", "dark"] as const;
export const colorModes = ["light", "dark"] as const;
export const themeFullNames = ["light", "dark", "inkline-light", "inkline-dark"] as const;
export const settingsLanguages = ["zh-CN", "en-US"] as const;
export const closeBehaviors = ["hide-to-tray", "exit"] as const;

export const themeNameSchema = z.enum(themeNames);
export const themeModeSchema = z.enum(themeModes);
export const colorModeSchema = z.enum(colorModes);
export const themeFullNameSchema = z.enum(themeFullNames);
export const settingsLanguageSchema = z.enum(settingsLanguages);
export const closeBehaviorSchema = z.enum(closeBehaviors);

export const appSettingsSchema = z.object({
  themeName: themeNameSchema,
  themeMode: themeModeSchema,
  language: settingsLanguageSchema,
  closeBehavior: closeBehaviorSchema,
});

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseOr = <T>(schema: z.ZodType<T>, value: unknown, fallback: T): T => {
  const result = schema.safeParse(value);

  return result.success ? result.data : fallback;
};

export const resolveThemeName = (value: unknown): ThemeName =>
  parseOr(themeNameSchema, value, defaultSettings.themeName);

export const resolveThemeMode = (value: unknown): ThemeMode =>
  parseOr(themeModeSchema, value, defaultSettings.themeMode);

export const resolveSettingsLanguage = (value: unknown): SettingsLanguage =>
  parseOr(settingsLanguageSchema, value, defaultSettings.language);

export const resolveCloseBehavior = (value: unknown): CloseBehavior =>
  parseOr(closeBehaviorSchema, value, defaultSettings.closeBehavior);

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

export const parseAppSettings = (value: unknown): AppSettings => appSettingsSchema.parse(value);

export const safeParseAppSettings = (value: unknown) => appSettingsSchema.safeParse(value);

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
