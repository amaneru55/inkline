import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "../../core/settings/schema";
import { normalizeAppSettings } from "../../core/settings/schema";
import type { AppSettingsStore } from "../../core/settings/store";

export const createTauriSettingsStore = (): AppSettingsStore => ({
  async load() {
    return normalizeAppSettings(await invoke<unknown>("get_app_settings"));
  },
  async save(settings: AppSettings) {
    return normalizeAppSettings(await invoke<unknown>("set_app_settings", { settings }));
  },
});
