"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/shared/lib/supabase";
import { APP_ROUTES } from "@/config/url";
import { getAuthActions } from "@/modules/auth/store/useAuthStore";
import { handleSignIn, handleSignOut } from "@/modules/auth/lib/auth-orchestrator";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const routerRef = useRef(router);
  const pathnameRef = useRef(pathname);

  // Keep refs synced with latest route changes
  useEffect(() => {
    routerRef.current = router;
    pathnameRef.current = pathname;
  }, [router, pathname]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const { setUser, setInitialized } = getAuthActions();

      switch (event) {
        case "INITIAL_SESSION":
          setUser(session?.user || null);
          setInitialized(true);
          if (session?.user) handleSignIn();
          break;

        case "SIGNED_IN":
          setUser(session?.user || null);
          if (session?.user) handleSignIn();
          // Only redirect if they are currently on auth routes
          if (pathnameRef.current?.startsWith("/auth")) {
            routerRef.current.push(APP_ROUTES.CONVERSATIONS.INDEX);
          }
          break;

        case "SIGNED_OUT":
          setUser(null);
          setInitialized(true);
          handleSignOut(queryClient);
          
          // Only redirect to login if they are currently on a protected route
          const isPublicRoute = pathnameRef.current === "/" || pathnameRef.current?.startsWith("/auth");
          if (!isPublicRoute) {
            routerRef.current.push(APP_ROUTES.AUTH.LOGIN);
          }
          break;

        case "USER_UPDATED":
          setUser(session?.user || null);
          break;

        case "TOKEN_REFRESHED":
          setUser(session?.user || null);
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return <>{children}</>;
}
