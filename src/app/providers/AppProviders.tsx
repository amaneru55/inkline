import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { i18next } from "../../i18n";
import { ThemeProvider } from "../../ui/theme/theme";
import { SettingsProvider, useInklineSettings } from "../settings/SettingsProvider";

type AppProvidersProps = {
  children: React.ReactNode;
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  });

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AppSettingsEffects />
        <ThemeProvider>{children}</ThemeProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

function AppSettingsEffects() {
  const { settings } = useInklineSettings();

  useEffect(() => {
    if (i18next.resolvedLanguage !== settings.language) {
      void i18next.changeLanguage(settings.language);
    }
  }, [settings.language]);

  return null;
}
