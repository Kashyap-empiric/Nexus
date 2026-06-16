'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { APP_ROUTES } from '@/config/url';

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Protected route error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 h-full">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            We encountered an error loading this page. Please try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center h-9 px-5 rounded-md bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-medium transition-colors gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href={APP_ROUTES.CONVERSATIONS.INDEX}
            className="inline-flex items-center justify-center h-9 px-5 rounded-md border border-border hover:bg-muted text-sm font-medium transition-colors gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center h-9 px-5 rounded-md border border-border hover:bg-muted text-sm font-medium transition-colors gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
