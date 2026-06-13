import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { type Locale, supportedLocales } from "../../i18n";

const localeLabelKeys = {
  "zh-CN": "language.chinese",
  "en-US": "language.english",
} as const satisfies Record<Locale, string>;

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLocale = i18n.resolvedLanguage;

  return (
    <fieldset className="control-group">
      <legend className="sr-only">{t("language.label")}</legend>
      {supportedLocales.map((locale) => (
        <Button
          className="control-button"
          data-active={currentLocale === locale}
          key={locale}
          onPress={() => void i18n.changeLanguage(locale)}
          size="sm"
        >
          {t(localeLabelKeys[locale])}
        </Button>
      ))}
    </fieldset>
  );
}
