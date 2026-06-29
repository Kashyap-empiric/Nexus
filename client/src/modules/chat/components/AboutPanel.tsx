"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Hash, Globe, Lock } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
import { getPublicProfile } from "@/modules/users/api/users.api";
import { MemberListPanel } from "@/modules/workspaces/components/MemberListPanel";
import Link from "next/link";

interface AboutPanelProps {
  isDM: boolean;
  userId?: string;
  channelName?: string | null;
  description?: string | null;
  visibility?: "PUBLIC" | "PRIVATE" | null;
  createdAt?: string;
  workspaceId?: string;
  channelId?: string;
}

const STATUS_LABELS: Record<string, { label: string; dotClass: string }> = {
  AVAILABLE: { label: "Available", dotClass: "bg-status-online" },
  AWAY: { label: "Away", dotClass: "bg-status-away" },
  DND: { label: "Do Not Disturb", dotClass: "bg-status-dnd" },
  INVISIBLE: { label: "Offline", dotClass: "bg-status-offline" },
};

export function AboutPanel({ isDM, userId, channelName, description, visibility, createdAt, workspaceId, channelId }: AboutPanelProps) {
  const { data: userProfile, isError: isProfileError } = useQuery({
    queryKey: ["users", "profile", userId],
    queryFn: () => getPublicProfile(userId!),
    enabled: isDM,
  });

  const formatJoinDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  if (isDM) {
    if (isProfileError) {
      return <div className="p-4 text-sm text-destructive">Failed to load profile. Try again later.</div>;
    }
    if (!userProfile) {
      return <div className="p-4 text-sm text-muted-foreground text-center mt-4 animate-pulse">Loading profile...</div>;
    }

    return (
      <div className="p-6 space-y-6">
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

        {userProfile.status && (
          <div className="flex items-center gap-2 text-sm">
            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUS_LABELS[userProfile.status]?.dotClass || "bg-muted-foreground")} />
            <span>{STATUS_LABELS[userProfile.status]?.label || userProfile.status}</span>
            {userProfile.statusText && (
              <span className="text-muted-foreground">— {userProfile.statusText}</span>
            )}
          </div>
        )}

        {userProfile.bio && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bio</h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">{userProfile.bio}</p>
          </div>
        )}

        {userProfile.createdAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>Joined {formatJoinDate(userProfile.createdAt)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
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

      {workspaceId && (
        <div>
          <div className="border-t mx-4 mb-3" />
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Members
          </h4>
          <MemberListPanel workspaceId={workspaceId} channelId={channelId} />
        </div>
      )}
    </div>
  );
}
