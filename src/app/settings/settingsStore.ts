import type { AppSettingsStore } from "../../core/settings/store";
import { createMemorySettingsStore } from "../../core/settings/store";
import { createTauriSettingsStore } from "../../infrastructure/settings/tauriSettingsStore";

const isTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const createDefaultSettingsStore = (): AppSettingsStore =>
  isTauriRuntime() ? createTauriSettingsStore() : createMemorySettingsStore();
