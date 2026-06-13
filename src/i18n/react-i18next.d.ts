import type { TranslationResource } from "./locales";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: TranslationResource;
    returnNull: false;
  }
}
