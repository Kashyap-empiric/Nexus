"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { api } from "@/shared/lib/api";
import { API_ROUTES, APP_ROUTES } from "@/config/url";
import { toast } from "sonner";
import { safeRedirect } from "@/shared/lib/utils";

interface InviteInfo {
  token: string;
  workspaceName: string;
  inviterName: string;
  inviterAvatar: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  isExpired: boolean;
  isValid: boolean;
}

function InviteLandingPage({ info, token }: { info: InviteInfo | null; token: string }) {
  const handleLogin = () => {
    sessionStorage.setItem("nexus_invite", token);
  };

  const handleRegister = () => {
    sessionStorage.setItem("nexus_invite", token);
  };

  if (!info || !info.isValid) {
    return (
      <div className="flex items-center justify-center h-dvh bg-neutral-900 text-white">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Invalid or Expired Invite</h2>
          <p className="text-neutral-400 text-sm mb-6">
            This invitation link is no longer valid. Please ask the workspace admin for a new one.
          </p>
          <Link
            href={APP_ROUTES.HOME}
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-dvh bg-neutral-900 text-white">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">N</span>
        </div>
        <h2 className="text-xl font-semibold mb-1">You&apos;re invited!</h2>
        <p className="text-neutral-400 text-sm mb-2">
          <span className="text-white font-medium">{info.inviterName}</span> has invited you to join
        </p>
        <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-6">
          {info.workspaceName}
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href={APP_ROUTES.AUTH.LOGIN}
            onClick={handleLogin}
            className="w-full py-2.5 px-6 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all text-center block"
          >
            Log In to Accept
          </Link>
          <Link
            href={APP_ROUTES.AUTH.REGISTER}
            onClick={handleRegister}
            className="w-full py-2.5 px-6 text-sm font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors text-center block"
          >
            Create Account
          </Link>
        </div>

        {info.expiresAt && (
          <p className="mt-6 text-xs text-neutral-500">
            This invitation expires on {new Date(info.expiresAt).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

export function InviteProcessor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useUser();
  const { isLoading } = useAuth();
  const resolvedRef = useRef(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [infoLoaded, setInfoLoaded] = useState(false);

  const token = searchParams.get("token");

  // Fetch invite info on mount
  useEffect(() => {
    if (!token) return;

    api.get(`${API_ROUTES.INVITES.INFO}?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setInviteInfo(res.data.data);
      })
      .catch(() => {
        setInviteInfo(null);
      })
      .finally(() => {
        setInfoLoaded(true);
      });
  }, [token]);

  // Resolve invite when authenticated
  useEffect(() => {
    if (isLoading || !infoLoaded) return;
    if (resolvedRef.current) return;

    if (!token) {
      safeRedirect(router, APP_ROUTES.HOME);
      return;
    }

    if (user) {
      resolvedRef.current = true;
      api.post(API_ROUTES.INVITES.RESOLVE, { token })
        .then((res) => {
          if (res.data.alreadyMember) {
            toast.info("You're already a member of this workspace");
          }
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
    }
  }, [searchParams, router, user, isLoading, infoLoaded, token]);

  // Loading state
  if (isLoading || !infoLoaded) {
    return (
      <div className="flex items-center justify-center h-dvh bg-neutral-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-neutral-400 font-medium">Loading invite...</p>
        </div>
      </div>
    );
  }

  // No token
  if (!token) {
    return (
      <div className="flex items-center justify-center h-dvh bg-neutral-900 text-white">
        <p className="text-sm text-neutral-400">No invite token found.</p>
      </div>
    );
  }

  // Unauthenticated — show landing page
  if (!user) {
    return <InviteLandingPage info={inviteInfo} token={token} />;
  }

  // Authenticated — waiting for resolve redirect (spinner shown during resolution)
  return (
    <div className="flex items-center justify-center h-dvh bg-neutral-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-neutral-400 font-medium">Processing invite...</p>
      </div>
    </div>
  );
}
