"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { api } from "@/shared/lib/api";
import { API_ROUTES, APP_ROUTES } from "@/config/url";
import { toast } from "sonner";
import { safeRedirect } from "@/shared/lib/utils";

export function InviteProcessor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useUser();
  const { isLoading } = useAuth();
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (resolvedRef.current) return; // Prevent double-resolution

    const token = searchParams.get("token");

    if (!token) {
      safeRedirect(router, APP_ROUTES.HOME);
      return;
    }

    if (user) {
      // Authenticated -> Resolve directly
      resolvedRef.current = true;
      api.post(API_ROUTES.INVITES.RESOLVE, { token })
        .then((res) => {
          if (res.data.redirectUrl) {
            safeRedirect(router, res.data.redirectUrl);
          } else {
            safeRedirect(router, APP_ROUTES.HOME);
          }
        })
        .catch((err: any) => {
          const errorMsg = err?.response?.data?.error || err?.message || "Failed to join via invite";
          toast.error(errorMsg);
          safeRedirect(router, APP_ROUTES.HOME);
        });
    } else {
      // Unauthenticated -> Store and redirect to login
      sessionStorage.setItem("nexus_invite", token);
      safeRedirect(router, APP_ROUTES.AUTH.LOGIN);
    }
  }, [searchParams, router, user, isLoading]);

  return (
    <div className="flex items-center justify-center h-dvh bg-neutral-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-neutral-400 font-medium">Processing Invite...</p>
      </div>
    </div>
  );
}
