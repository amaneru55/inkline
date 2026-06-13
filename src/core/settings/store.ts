import type { AppSettings } from "./schema";
import { defaultSettings, normalizeAppSettings } from "./schema";

export type AppSettingsStore = {
  load: () => Promise<AppSettings>;
  save: (settings: AppSettings) => Promise<AppSettings>;
};

export const createMemorySettingsStore = (
  initialSettings: AppSettings = defaultSettings,
): AppSettingsStore => {
  let currentSettings = normalizeAppSettings(initialSettings);

  return {
    async load() {
      return currentSettings;
    },
    async save(settings) {
      currentSettings = normalizeAppSettings(settings);
      return currentSettings;
    },
  };
};
