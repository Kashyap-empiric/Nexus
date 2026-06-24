"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspaceChannelsQuery } from "@/modules/workspaces/hooks/useWorkspaceChannels";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { Loader2 } from "lucide-react";

export default function WorkspaceRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { data: channels, isLoading } = useWorkspaceChannelsQuery(slug);
  const lastVisitedChannels = useChatStore((state) => state.lastVisitedChannels);

  useEffect(() => {
    if (!slug || isLoading || !channels || channels.length === 0) return;

    const savedChannelId = lastVisitedChannels[slug];
    const savedChannelExists = savedChannelId && channels.some((c) => c.id === savedChannelId);
    const targetId = savedChannelExists
      ? savedChannelId
      : (channels.find((c) => c.name === "general") || channels[0]).id;

    router.replace(`/workspaces/${slug}/channels/${targetId}`);
  }, [slug, isLoading, channels, lastVisitedChannels, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Loading workspace...</p>
      </div>
    </div>
  );
}
