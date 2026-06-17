"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublicProfile } from "../api/users.api";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
import { Button } from "@/shared/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { api } from "@/shared/lib/api";

export function UserProfilePage({ userId }: { userId: string }) {
  const router = useRouter();
  const currentAuthUser = useUser();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["users", "profile", userId],
    queryFn: () => getPublicProfile(userId),
  });

  const handleMessage = async () => {
    try {
      const response = await api.post<{ data: { id: string } }>("/conversations", {
        type: "DM",
        userIds: [userId],
      });
      router.push(`/conversations/${response.data.data.id}`);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center text-muted-foreground animate-pulse">Loading profile...</div>;
  }

  if (error || !profile) {
    return <div className="p-8 flex justify-center text-destructive">Failed to load profile.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start gap-6">
        <div className="relative">
<UserAvatar
              name={profile.fullName || profile.username}
              src={profile.avatarUrl}
              className="h-24 w-24 md:h-28 md:w-28 mb-4 text-4xl"
              fallbackClassName="bg-primary/20 text-primary font-medium"
            />
          <PresenceIndicator userId={profile.id} status={profile.status} className="w-5 h-5 border-4" />
        </div>
        
        <div className="flex-1 space-y-4 mt-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {profile.fullName || profile.username}
            </h1>
            <p className="text-muted-foreground font-medium">@{profile.username}</p>
          </div>

          {currentAuthUser?.id !== profile.id && (
            <Button onClick={handleMessage} className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Message
            </Button>
          )}
        </div>
      </div>

      {(profile.bio || profile.statusText) && (
        <div className="bg-muted/30 rounded-lg p-6 space-y-6">
          {profile.statusText && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current Status</h3>
              <p className="text-foreground">{profile.statusText}</p>
            </div>
          )}
          {profile.bio && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">About Me</h3>
              <p className="text-foreground whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
