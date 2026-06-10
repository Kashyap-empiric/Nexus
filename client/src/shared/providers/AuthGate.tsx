"use client";

import { useAuthInitialized, useUser } from "@/modules/auth/store/useAuthStore";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const isInitialized = useAuthInitialized();
  const user = useUser();
  const pathname = usePathname();
  const isPublicRoute = pathname === "/" || pathname?.startsWith("/auth");

  if (!isInitialized && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-sm">Authenticating...</p>
      </div>
    );
  }

  if (isInitialized && !user && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}
