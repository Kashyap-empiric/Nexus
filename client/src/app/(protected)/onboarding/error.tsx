'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { APP_ROUTES } from '@/config/url';

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-sm w-full bg-card border rounded-xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">Something went wrong</h3>
          <p className="text-sm text-muted-foreground">
            We couldn't complete the setup. Please try again.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={reset}
            className="w-full h-9 rounded-md bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-medium transition-colors gap-2 inline-flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href={APP_ROUTES.CONVERSATIONS.INDEX}
            className="w-full h-9 rounded-md border border-border hover:bg-muted text-sm font-medium transition-colors inline-flex items-center justify-center"
          >
            Skip to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
