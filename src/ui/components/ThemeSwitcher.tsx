import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { type ThemeMode, type ThemeName, useInklineTheme } from "../theme/theme";

const themeNameLabelKeys = {
  default: "theme.name.default",
  inkline: "theme.name.inkline",
} as const satisfies Record<ThemeName, string>;

const themeModeLabelKeys = {
  system: "theme.mode.system",
  light: "theme.mode.light",
  dark: "theme.mode.dark",
} as const satisfies Record<ThemeMode, string>;

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const {
    resolvedColorMode,
    setThemeMode,
    setThemeName,
    themeMode,
    themeModes,
    themeName,
    themeNames,
  } = useInklineTheme();

  return (
    <>
      <fieldset className="control-group">
        <legend className="sr-only">{t("theme.name.label")}</legend>
        {themeNames.map((name) => (
          <Button
            className="control-button"
            data-active={themeName === name}
            key={name}
            onPress={() => setThemeName(name)}
            size="sm"
          >
            {t(themeNameLabelKeys[name])}
          </Button>
        ))}
      </fieldset>
      <fieldset className="control-group">
        <legend className="sr-only">{t("theme.mode.label")}</legend>
        {themeModes.map((mode) => (
          <Button
            aria-label={
              mode === "system"
                ? t("theme.mode.systemWithResolved", {
                    mode: t(themeModeLabelKeys[resolvedColorMode]),
                  })
                : undefined
            }
            className="control-button"
            data-active={themeMode === mode}
            key={mode}
            onPress={() => setThemeMode(mode)}
            size="sm"
          >
            {t(themeModeLabelKeys[mode])}
          </Button>
        ))}
      </fieldset>
    </>
  );
}
