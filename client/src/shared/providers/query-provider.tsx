"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Don't retry on client errors (4xx) — these are auth/not-found errors,
            // not transient network failures. Only retry on 5xx / network errors.
            retry: (failureCount, error: unknown) => {
              const status = typeof error === 'object' && error !== null && 'response' in error 
                ? (error as { response?: { status?: number } }).response?.status 
                : undefined;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
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

