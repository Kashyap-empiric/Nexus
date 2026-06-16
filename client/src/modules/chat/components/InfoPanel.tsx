"use client";

import { useQuery } from "@tanstack/react-query";
import { X, CalendarDays, Pin } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { InfoPanelView } from "@/shared/components/layout/AppLayoutShell";
import { MemberListPanel } from "@/modules/workspaces/components/MemberListPanel";
import { PinnedMessagesPanel } from "@/modules/messages/components/PinnedMessagesPanel";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
import { getPublicProfile } from "@/modules/users/api/users.api";
import Link from "next/link";
import { useUser } from "@/modules/auth/store/useAuthStore";

interface InfoPanelProps {
  conversationId: string;
  workspaceId?: string;
  channelId?: string;
  userId?: string;
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

export function InfoPanel({ conversationId, workspaceId, channelId, userId, view, setInfoPanelView, onClose }: InfoPanelProps) {
  const user = useUser();
  const currentUserId = user?.id || null;
  const isChannel = !!workspaceId;
  const isDM = !!userId;

  const { data: userProfile } = useQuery({
    queryKey: ["users", "profile", userId],
    queryFn: () => getPublicProfile(userId!),
    enabled: isDM,
  });

  const formatJoinDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="flex flex-col w-80 bg-background shadow-xl border-l h-full shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h2 className="font-semibold text-lg text-foreground">Details</h2>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex px-4 border-b shrink-0">
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
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {view === 'about' && isDM && userProfile && (
          <div className="p-6 space-y-6">
            {/* Avatar + Name */}
            <Link href={`/users/${userProfile.id}`} className="flex flex-col items-center gap-3 group">
              <div className="relative">
                <UserAvatar
                  name={userProfile.username}
                  src={userProfile.avatarUrl}
                  avatarPath={userProfile.avatarPath}
                  className="w-20 h-20 text-2xl shadow-md border"
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

            {/* Status */}
            {userProfile.status && (
              <div className="flex items-center gap-2 text-sm">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUS_LABELS[userProfile.status]?.dotClass || "bg-muted-foreground")} />
                <span>{STATUS_LABELS[userProfile.status]?.label || userProfile.status}</span>
                {userProfile.statusText && (
                  <span className="text-muted-foreground">— {userProfile.statusText}</span>
                )}
              </div>
            )}

            {/* Bio */}
            {userProfile.bio && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bio</h4>
                <p className="text-sm text-foreground whitespace-pre-wrap">{userProfile.bio}</p>
              </div>
            )}

            {/* Joined date */}
            {userProfile.createdAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>Joined {formatJoinDate(userProfile.createdAt)}</span>
              </div>
            )}
          </div>
        )}

        {view === 'about' && isDM && !userProfile && (
          <div className="p-4 text-sm text-muted-foreground text-center mt-4 animate-pulse">
            Loading profile...
          </div>
        )}

        {view === 'about' && !isDM && (
          <div className="p-4 text-sm text-muted-foreground">
            No description available.
          </div>
        )}

        {view === 'members' && workspaceId && (
          <MemberListPanel workspaceId={workspaceId} channelId={channelId} />
        )}

        {view === 'pins' && (
          <PinnedMessagesPanel conversationId={conversationId} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
}
