"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/shared/constants/api_routes";
import { toast } from "sonner";

export function InviteProcessor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useUser();
  const { isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const token = searchParams.get("token");

    if (!token) {
      router.push("/");
      return;
    }

    if (user) {
      // Authenticated -> Resolve directly
      api.post(API_ROUTES.INVITES.RESOLVE, { token })
        .then((res) => {
          if (res.data.redirectUrl) {
            router.push(res.data.redirectUrl);
          } else {
            router.push("/");
          }
        })
        .catch(() => {
          toast.error("Failed to join via invite");
          router.push("/");
        });
    } else {
      // Unauthenticated -> Store and redirect to login
      sessionStorage.setItem("nexus_invite", token);
      router.push("/login");
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
