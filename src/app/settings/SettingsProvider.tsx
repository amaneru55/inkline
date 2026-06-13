import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AppSettings } from "../../core/settings/schema";
import { defaultSettings, normalizeAppSettings } from "../../core/settings/schema";
import type { AppSettingsStore } from "../../core/settings/store";
import { createDefaultSettingsStore } from "./settingsStore";

type SettingsStatus = "loading" | "ready" | "error";

type SettingsContextValue = {
  settings: AppSettings;
  status: SettingsStatus;
  error: string | null;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

type SettingsProviderProps = {
  children: ReactNode;
  store?: AppSettingsStore;
};

export function SettingsProvider({ children, store: providedStore }: SettingsProviderProps) {
  const [store] = useState<AppSettingsStore>(() => providedStore ?? createDefaultSettingsStore());
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [status, setStatus] = useState<SettingsStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void store
      .load()
      .then((loadedSettings) => {
        if (!isMounted) {
          return;
        }

        setSettings(normalizeAppSettings(loadedSettings));
        setStatus("ready");
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!isMounted) {
          return;
        }

        setStatus("error");
        setError(cause instanceof Error ? cause.message : "Failed to load settings.");
      });

    return () => {
      isMounted = false;
    };
  }, [store]);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const nextSettings = normalizeAppSettings({ ...settings, ...patch });
      setSettings(nextSettings);
      setStatus("ready");
      setError(null);

      try {
        const savedSettings = await store.save(nextSettings);
        setSettings(normalizeAppSettings(savedSettings));
      } catch (cause) {
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "Failed to save settings.");
      }
    },
    [settings, store],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      status,
      error,
      updateSettings,
    }),
    [error, settings, status, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useInklineSettings() {
  const value = useContext(SettingsContext);

  if (value === null) {
    throw new Error("useInklineSettings must be used within SettingsProvider.");
  }

  return value;
}
