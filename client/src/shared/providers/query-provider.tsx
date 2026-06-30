"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error: unknown) => {
              const status = typeof error === 'object' && error !== null && 'response' in error 
                ? (error as { response?: { status?: number } }).response?.status 
                : undefined;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
            staleTime: 5 * 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

