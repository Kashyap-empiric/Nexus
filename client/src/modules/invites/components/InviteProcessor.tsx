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

import { Sparkles, MessageSquare, Hash } from "lucide-react";

interface InviteInfo {
  token: string;
  inviteType: "WORKSPACE" | "CONVERSATION" | "USER";
  entityName: string;
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
      <div className="flex items-center justify-center min-h-dvh bg-background text-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-destructive/20 via-background to-background" />
        <div className="relative z-10 text-center max-w-md px-6 py-8 bg-card/40 backdrop-blur-xl border shadow-2xl rounded-3xl m-4">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 tracking-tight">Invalid or Expired Invite</h2>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            This invitation link is no longer valid. Please ask the sender for a new one.
          </p>
          <Link
            href={APP_ROUTES.HOME}
            className="inline-flex items-center justify-center w-full px-6 py-3 text-sm font-medium rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-all duration-200"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const renderIcon = () => {
    switch (info.inviteType) {
      case "WORKSPACE": return <Sparkles className="w-8 h-8 text-white" />;
      case "CONVERSATION": return <Hash className="w-8 h-8 text-white" />;
      case "USER": return <MessageSquare className="w-8 h-8 text-white" />;
      default: return <span className="text-2xl font-bold text-white">N</span>;
    }
  };

  const renderActionText = () => {
    switch (info.inviteType) {
      case "WORKSPACE": return "has invited you to join";
      case "CONVERSATION": return "has invited you to join the conversation";
      case "USER": return "has invited you to chat directly";
      default: return "has invited you to join";
    }
  };

  return (
    <div className="flex items-center justify-center min-h-dvh bg-zinc-950 text-foreground relative overflow-hidden selection:bg-brand/30">
      {}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src="/images/auth-bg.png" 
          alt="Abstract glowing network"
          className="w-full h-full object-cover opacity-60 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/20 to-zinc-950/80"></div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/10 rounded-full blur-[100px] pointer-events-none" />

      {}
      <div className="absolute top-8 left-8 z-20">
        <img 
          src="/images/Nexus_brandname.png" 
          alt="Nexus Logo" 
          className="h-8 w-auto opacity-80" 
        />
      </div>

      {}
      <div className="relative z-10 w-full max-w-md px-8 py-10 bg-zinc-900/60 backdrop-blur-2xl border border-white/5 shadow-lg rounded-3xl m-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 mb-8 rounded-2xl bg-zinc-800/50 shadow-md flex items-center justify-center ring-1 ring-white/10 hover:scale-105 transition-transform duration-300">
            <img 
              src="/images/Logo.png" 
              alt="Nexus" 
              className="w-12 h-12 object-contain"
            />
          </div>
          
          <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-8 h-px bg-border/50"></span>
            You&apos;re invited
            <span className="w-8 h-px bg-border/50"></span>
          </h2>

          <p className="text-muted-foreground text-base mb-3">
            <span className="text-white font-semibold">{info.inviterName}</span> {renderActionText()}
          </p>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-10 tracking-tight">
            {info.entityName}
          </h1>

          <div className="w-full flex flex-col gap-3">
            <Link
              href={APP_ROUTES.AUTH.LOGIN}
              onClick={handleLogin}
              className="w-full py-3.5 px-6 text-sm font-semibold rounded-xl bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm hover:shadow hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            >
              Log In to Accept
            </Link>
            <Link
              href={APP_ROUTES.AUTH.REGISTER}
              onClick={handleRegister}
              className="w-full py-3.5 px-6 text-sm font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 flex items-center justify-center"
            >
              Create New Account
            </Link>
          </div>

          {info.expiresAt && (
            <p className="mt-8 text-xs font-medium text-muted-foreground/60">
              Invitation expires on {new Date(info.expiresAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          )}
        </div>
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

  if (isLoading || !infoLoaded) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-zinc-950 text-foreground relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src="/images/auth-bg.png" alt="" className="w-full h-full object-cover opacity-60 mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/20 to-zinc-950/80"></div>
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-zinc-400 font-medium animate-pulse">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-zinc-950 text-foreground relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src="/images/auth-bg.png" alt="" className="w-full h-full object-cover opacity-60 mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/20 to-zinc-950/80"></div>
        </div>
        <div className="relative z-10 text-center max-w-md px-6 py-8 bg-zinc-900/60 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl m-4">
          <p className="text-sm text-zinc-400">No invite token found.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <InviteLandingPage info={inviteInfo} token={token} />;
  }

  return (
    <div className="flex items-center justify-center min-h-dvh bg-zinc-950 text-foreground relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img src="/images/auth-bg.png" alt="" className="w-full h-full object-cover opacity-60 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/20 to-zinc-950/80"></div>
      </div>
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-zinc-400 font-medium animate-pulse">Processing invite...</p>
      </div>
    </div>
  );
}
