import { describe, expect, it } from "vitest";
import {
  defaultSettings,
  getThemeFullName,
  normalizeAppSettings,
  parseAppSettings,
  resolveCloseBehavior,
  resolveColorMode,
  resolveSettingsLanguage,
  resolveThemeMode,
  resolveThemeName,
} from "./schema";

describe("settings schema", () => {
  it("normalizes invalid settings to defaults", () => {
    expect(normalizeAppSettings(null)).toEqual(defaultSettings);
    expect(
      normalizeAppSettings({
        themeName: "unknown",
        themeMode: "dark",
        language: "ja-JP",
        closeBehavior: "exit",
      }),
    ).toEqual({
      ...defaultSettings,
      themeMode: "dark",
      closeBehavior: "exit",
    });
  });

  it("parses trusted settings payloads and rejects invalid boundary data", () => {
    expect(parseAppSettings(defaultSettings)).toEqual(defaultSettings);
    expect(() => parseAppSettings({ ...defaultSettings, themeMode: "sepia" })).toThrow();
  });

  it("resolves individual setting values", () => {
    expect(resolveThemeName("default")).toBe("default");
    expect(resolveThemeName("unknown")).toBe("inkline");
    expect(resolveThemeMode("light")).toBe("light");
    expect(resolveThemeMode("unknown")).toBe("system");
    expect(resolveSettingsLanguage("en-US")).toBe("en-US");
    expect(resolveSettingsLanguage("unknown")).toBe("zh-CN");
    expect(resolveCloseBehavior("exit")).toBe("exit");
    expect(resolveCloseBehavior("unknown")).toBe("hide-to-tray");
  });

  it("resolves effective theme names", () => {
    expect(resolveColorMode("system", true)).toBe("dark");
    expect(resolveColorMode("system", false)).toBe("light");
    expect(resolveColorMode("dark", false)).toBe("dark");
    expect(getThemeFullName("default", "light")).toBe("light");
    expect(getThemeFullName("inkline", "dark")).toBe("inkline-dark");
  });
});
