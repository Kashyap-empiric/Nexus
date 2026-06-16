'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root error:', error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-destructive/20 rounded-full animate-pulse blur-xl" />
          <AlertTriangle className="w-12 h-12 text-destructive relative z-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/50 font-mono mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-medium shadow transition-colors gap-2 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-10 px-6 rounded-md border border-border hover:bg-muted text-sm font-medium transition-colors gap-2 whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center h-10 px-6 rounded-md border border-border hover:bg-muted text-sm font-medium transition-colors gap-2 whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
