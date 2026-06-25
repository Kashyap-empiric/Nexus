"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { X, CalendarDays, Hash, Globe, Lock } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { InfoPanelView } from "@/shared/components/layout/AppLayoutShell";
import { MemberListPanel } from "@/modules/workspaces/components/MemberListPanel";
import { PinnedMessagesPanel } from "@/modules/messages/components/PinnedMessagesPanel";
import { ThreadPanel } from "@/modules/threads/components/ThreadPanel";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
import { getPublicProfile } from "@/modules/users/api/users.api";
import { useUser } from "@/modules/auth/store/useAuthStore";
import Link from "next/link";
import type { User } from "@/modules/conversations/types/conversation";

interface InfoPanelProps {
  conversationId: string;
  workspaceId?: string;
  channelId?: string;
  userId?: string;
  channelName?: string | null;
  description?: string | null;
  visibility?: "PUBLIC" | "PRIVATE" | null;
  createdAt?: string;
  view: InfoPanelView;
  setInfoPanelView: (view: InfoPanelView) => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; dotClass: string }> = {
  AVAILABLE: { label: "Available", dotClass: "bg-status-online" },
  AWAY: { label: "Away", dotClass: "bg-status-away" },
  DND: { label: "Do Not Disturb", dotClass: "bg-status-dnd" },
  INVISIBLE: { label: "Offline", dotClass: "bg-status-offline" },
};

export function InfoPanel({ conversationId, workspaceId, channelId, userId, channelName, description, visibility, createdAt, view, setInfoPanelView, onClose }: InfoPanelProps) {
  const isChannel = !!workspaceId;
  const isDM = !!userId;
  const currentUser = useUser();

  const { data: userProfile, isError: isProfileError } = useQuery({
    queryKey: ["users", "profile", userId],
    queryFn: () => getPublicProfile(userId!),
    enabled: isDM,
  });

  const formatJoinDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const [panelWidth, setPanelWidth] = useState(320);
  const isResizing = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('nexus-info-panel-width');
    if (saved) {
      setTimeout(() => setPanelWidth(parseInt(saved, 10)), 0);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 280 && newWidth < 800) {
        setPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        localStorage.setItem('nexus-info-panel-width', panelWidth.toString());
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [panelWidth]);

  return (
    <div
      className="flex flex-col bg-details-panel shadow-xl border-l h-full shrink-0 relative w-full md:w-[var(--panel-width)]"
      style={{ '--panel-width': `${panelWidth}px` } as React.CSSProperties}
    >
      <div
        className="hidden md:block absolute left-0 top-0 bottom-0 w-1.5 -ml-[0.75px] cursor-col-resize hover:bg-brand z-50 transition-colors"
        onMouseDown={() => {
          isResizing.current = true;
          document.body.style.cursor = 'col-resize';
        }}
      />
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h2 className="font-semibold text-lg text-foreground">Context</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-1 px-4 border-b shrink-0">
        <button
          onClick={() => setInfoPanelView('about')}
          className={cn(
            "flex-1 pb-2 pt-3 text-sm font-medium text-center border-b-2 transition-colors",
            view === 'about' ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {isDM ? "Profile" : "About"}
        </button>
        {isChannel && (
          <button
            onClick={() => setInfoPanelView('members')}
            className={cn(
              "flex-1 pb-2 pt-3 text-sm font-medium text-center border-b-2 transition-colors",
              view === 'members' ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Members
          </button>
        )}
        <button
          onClick={() => setInfoPanelView('pins')}
          className={cn(
            "flex-1 pb-2 pt-3 text-sm font-medium text-center border-b-2 transition-colors",
            view === 'pins' ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Pins
        </button>
        <button
          onClick={() => setInfoPanelView(view === 'thread' ? 'about' : 'thread')}
          className={cn(
            "flex-1 pb-2 pt-3 text-sm font-medium text-center border-b-2 transition-colors",
            view === 'thread' ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Thread
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {view === 'about' && isDM && userProfile && (
          <div className="p-6 space-y-6">
            { }
            <Link href={`/users/${userProfile.id}`} className="flex flex-col items-center gap-3 group">
              <div className="relative">
                <UserAvatar
                  name={userProfile.fullName || userProfile.username}
                  src={userProfile.avatarUrl}
                  className="h-20 w-20 mb-3"
                  fallbackClassName="bg-primary/20 text-primary font-medium text-3xl"
                />
                <PresenceIndicator userId={userProfile.id} status={userProfile.status} className="w-4 h-4 border-[3px]" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground group-hover:underline">
                  {userProfile.fullName || userProfile.username}
                </h3>
                <p className="text-sm text-muted-foreground">@{userProfile.username}</p>
              </div>
            </Link>

            { }
            {userProfile.status && (
              <div className="flex items-center gap-2 text-sm">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUS_LABELS[userProfile.status]?.dotClass || "bg-muted-foreground")} />
                <span>{STATUS_LABELS[userProfile.status]?.label || userProfile.status}</span>
                {userProfile.statusText && (
                  <span className="text-muted-foreground">— {userProfile.statusText}</span>
                )}
              </div>
            )}

            { }
            {userProfile.bio && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bio</h4>
                <p className="text-sm text-foreground whitespace-pre-wrap">{userProfile.bio}</p>
              </div>
            )}

            { }
            {userProfile.createdAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>Joined {formatJoinDate(userProfile.createdAt)}</span>
              </div>
            )}
          </div>
        )}

        {view === 'about' && isDM && isProfileError && (
          <div className="p-4 text-sm text-destructive">Failed to load profile. Try again later.</div>
        )}

        {view === 'about' && isDM && !userProfile && !isProfileError && (
          <div className="p-4 text-sm text-muted-foreground text-center mt-4 animate-pulse">
            Loading profile...
          </div>
        )}

        {view === 'about' && !isDM && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-2xl bg-brand/10 flex items-center justify-center">
                <Hash className="h-8 w-8 text-brand" />
              </div>
              <h3 className="text-xl font-bold text-foreground text-center">
                {channelName || "Untitled"}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                  visibility === "PRIVATE"
                    ? "bg-muted text-muted-foreground border-border"
                    : "bg-primary/10 text-primary border-primary/20"
                )}
              >
                {visibility === "PRIVATE" ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Globe className="h-3 w-3" />
                )}
                {visibility === "PRIVATE" ? "Private" : "Public"}
              </span>
            </div>

            {description ? (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Description
                </h4>
                <p className="text-sm text-foreground whitespace-pre-wrap">{description}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center italic">
                No description
              </p>
            )}

            {createdAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>Created {formatJoinDate(createdAt)}</span>
              </div>
            )}
          </div>
        )}

        {view === 'members' && workspaceId && (
          <MemberListPanel workspaceId={workspaceId} channelId={channelId} />
        )}

        {view === 'pins' && (
          <PinnedMessagesPanel conversationId={conversationId} />
        )}

        {view === 'thread' && (
          <ThreadPanel
            conversationId={conversationId}
            currentUser={(currentUser as unknown) as User | undefined}
          />
        )}
      </div>
    </div>
  );
}
