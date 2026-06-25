"use client";



import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { api } from "@/shared/lib/api";
import { API_ROUTES, APP_ROUTES } from "@/config/url";
import { toast } from "sonner";
import { safeRedirect } from "@/shared/lib/utils";
import Image from "next/image";
import { Loader2 } from "lucide-react";

interface InviteInfo {
  token: string;
  inviteType: "WORKSPACE" | "CONVERSATION" | "USER" | "CHANNEL";
  entityName: string;
  inviterName: string;
  inviterAvatar: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  isExpired: boolean;
  isValid: boolean;
}

function InviteLandingPage({
  info,
  token,
  user,
  onAccept,
  isAccepting,
}: {
  info: InviteInfo | null;
  token: string;
  user: unknown;
  onAccept: () => void;
  isAccepting: boolean;
}) {
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

  const renderActionText = () => {
    switch (info.inviteType) {
      case "WORKSPACE": return "has invited you to join";
      case "CONVERSATION": return "has invited you to join the conversation";
      case "CHANNEL": return "has invited you to join the channel";
      case "USER": return "has invited you to chat directly";
      default: return "has invited you to join";
    }
  };

  return (
    <div className="flex items-center justify-center min-h-dvh bg-background text-foreground relative overflow-hidden selection:bg-brand/30">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/images/auth-bg.png"
          alt="Abstract glowing network"
          fill
          className="object-cover opacity-60 mix-blend-screen"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/20 to-zinc-950/80"></div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="absolute top-8 left-8 z-20">
        <Image
          src="/images/Nexus_brandname.png"
          alt="Nexus Logo"
          width={180}
          height={50}
          className="h-8 w-auto opacity-80"
          priority
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-8 py-10 bg-card/60 backdrop-blur-2xl border border-border/50 shadow-lg rounded-3xl m-4 animate-in fade-in slide-in-from-bottom-8 duration-700">

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 mb-8 rounded-2xl bg-muted/50 shadow-md flex items-center justify-center ring-1 ring-border hover:scale-105 transition-transform duration-300">
            <Image
              src="/images/Logo.png"
              alt="Nexus"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
            />
          </div>

          <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-8 h-px bg-border/50"></span>
            You&apos;re invited
            <span className="w-8 h-px bg-border/50"></span>
          </h2>

          <p className="text-muted-foreground text-base mb-3">
            <span className="text-foreground font-semibold">{info.inviterName}</span> {renderActionText()}
          </p>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-10 tracking-tight">
            {info.entityName}
          </h1>

          <div className="w-full flex flex-col gap-3">
            {user ? (
              <button
                onClick={onAccept}
                disabled={isAccepting}
                className="w-full py-3.5 px-6 text-sm font-semibold rounded-xl bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm hover:shadow hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </button>
            ) : (
              <>
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
                  className="w-full py-3.5 px-6 text-sm font-semibold rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200 flex items-center justify-center"
                >
                  Create New Account
                </Link>
              </>
            )}
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

function friendlyInviteError(err: unknown): string {
  if (!(err && typeof err === "object")) return "Something went wrong. Please try again.";
  const obj = err as { response?: { data?: { error?: string } }; message?: string };
  const msg = obj.response?.data?.error || obj.message || "";
  const lower = msg.toLowerCase();
  if (lower.includes("already a member") || lower.includes("already_member")) return "You are already a member.";
  if (lower.includes("not found") || lower.includes("not_found") || lower.includes("invalid")) return "This invite is invalid or has expired.";
  if (lower.includes("expired")) return "This invite has expired.";
  if (lower.includes("revoked")) return "This invite has been revoked.";
  if (lower.includes("rate limit")) return "Too many requests. Please try again later.";
  if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("timeout")) return "A network error occurred. Please check your connection.";
  return msg || "Something went wrong. Please try again.";
}

function InviteErrorPage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-dvh bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-destructive/20 via-background to-background" />
      <div className="relative z-10 text-center max-w-md px-6 py-8 bg-card/60 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl m-4">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
          <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2 tracking-tight text-foreground">Invite Error</h2>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{message}</p>
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

export function InviteProcessor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useUser();
  const { isLoading } = useAuth();
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [infoLoaded, setInfoLoaded] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const infoFetchAttempted = useRef(false);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token || infoFetchAttempted.current) return;
    infoFetchAttempted.current = true;

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

    if (!token) {
      safeRedirect(router, APP_ROUTES.HOME);
    }
  }, [isLoading, infoLoaded, token, router]);

  const handleAccept = useCallback(async () => {
    if (!token || isAccepting) return;
    setIsAccepting(true);
    try {
      const res = await api.post(API_ROUTES.INVITES.RESOLVE, { token });
      if (res.data.alreadyMember) {
        toast.info("You're already a member");
      }
      if (res.data.redirectUrl) {
        safeRedirect(router, res.data.redirectUrl);
      } else {
        safeRedirect(router, APP_ROUTES.HOME);
      }
    } catch (err: unknown) {
      setResolveError(friendlyInviteError(err));
      setIsAccepting(false);
    }
  }, [token, isAccepting, router]);

  if (resolveError) {
    return <InviteErrorPage message={resolveError} />;
  }

  if (isLoading || !infoLoaded) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-background text-foreground relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image src="/images/auth-bg.png" alt="" fill className="object-cover opacity-60 mix-blend-screen" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/20 to-zinc-950/80"></div>
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-background text-foreground relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image src="/images/auth-bg.png" alt="" fill className="object-cover opacity-60 mix-blend-screen" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/20 to-zinc-950/80"></div>
        </div>
        <div className="relative z-10 text-center max-w-md px-6 py-8 bg-card/60 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl m-4">
          <p className="text-sm text-muted-foreground">No invite token found.</p>
        </div>
      </div>
    );
  }

  return (
    <InviteLandingPage
      info={inviteInfo}
      token={token}
      user={user}
      onAccept={handleAccept}
      isAccepting={isAccepting}
    />
  );
}
