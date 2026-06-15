"use client";

import { useAuthInitialized, useUser } from "@/modules/auth/store/useAuthStore";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { handleInviteContinuation } from "@/modules/invites/lib/handleInvite";
import { APP_ROUTES } from "@/config/url";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const isInitialized = useAuthInitialized();
  const user = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = pathname === APP_ROUTES.HOME || pathname === APP_ROUTES.AUTH.LOGIN || pathname === APP_ROUTES.AUTH.REGISTER || pathname === APP_ROUTES.INVITE.INDEX;

  useEffect(() => {
    if (isInitialized && user) {
      handleInviteContinuation(router);
    }
  }, [isInitialized, user, router]);

  if (!isInitialized && !isPublicRoute) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center space-y-4">
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
