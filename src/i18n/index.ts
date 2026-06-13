import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultLocale, resources, supportedLocales } from "./locales";

void i18next.use(initReactI18next).init({
  resources,
  lng: defaultLocale,
  fallbackLng: "en-US",
  defaultNS: "translation",
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export type { Locale } from "./locales";
export { defaultLocale, i18next, supportedLocales };
