import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import "../../i18n";
import { ThemeProvider } from "../../ui/theme/theme";

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
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
