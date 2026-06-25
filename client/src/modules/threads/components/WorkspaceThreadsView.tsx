"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceThreads } from "@/modules/messages/hooks/useThreads";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { formatRelativeTime } from "@/shared/lib/utils";
import { MessageSquare, Hash, Loader2 } from "lucide-react";
import { useWorkspaceChannelsQuery } from "@/modules/workspaces/hooks/useWorkspaceChannels";
import { useThreadStore } from "@/modules/threads/store/threadStore";
import { useEffect } from "react";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { useLayoutUI } from "@/shared/components/layout/AppLayoutShell";

interface WorkspaceThreadsViewProps {
  workspaceId: string;
}

export function WorkspaceThreadsView({ workspaceId }: WorkspaceThreadsViewProps) {
  const router = useRouter();
  
  const { data: threads, isLoading, isError } = useWorkspaceThreads(workspaceId);
  const { data: channels } = useWorkspaceChannelsQuery(workspaceId);
  const { openThread } = useThreadStore();
  const { setInfoPanelOpen, setInfoPanelView } = useLayoutUI();
  const setHeaderInfo = useChatStore((state) => state.setHeaderInfo);

  useEffect(() => {
    setHeaderInfo({
      title: "Threads",
      isChannel: false,
      totalUnreadCount: 0,
      memberPanelOpen: false,
    });
    return () => setHeaderInfo(null);
  }, [setHeaderInfo]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-medium">Loading threads...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        <p className="text-destructive font-medium">Failed to load threads.</p>
      </div>
    );
  }

  if (!threads || threads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background text-center max-w-md mx-auto">
        <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-6">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">No threads yet</h2>
        <p className="text-muted-foreground">
          You don&apos;t have any active threads in this workspace. 
          When you reply to a message or someone replies to you, it will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-12 xl:px-24">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Threads</h1>
            <p className="text-muted-foreground mt-1">
              Conversations you&apos;re participating in.
            </p>
          </div>

          <div className="space-y-4">
            {threads.map((thread) => {
              const channel = channels?.find(c => c.id === thread.conversationId);
              const channelName = channel?.name || "Unknown channel";

              return (
                <button
                  key={thread.threadRootId}
                  onClick={() => {
                    // Navigate to channel and open thread
                    router.push(`/workspaces/${workspaceId}/channels/${thread.conversationId}`);
                    // Setting a slight timeout to ensure the channel loads before opening the thread
                    setTimeout(() => {
                      openThread(thread.threadRootId);
                      setInfoPanelView('thread');
                      setInfoPanelOpen(true);
                    }, 50);
                  }}
                  className="w-full text-left p-4 rounded-xl border border-border/50 bg-card hover:border-brand/30 hover:shadow-sm transition-all flex flex-col group relative"
                >
                  <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    <span className="hover:underline">{channelName}</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={thread.rootAuthor.username}
                      src={thread.rootAuthor.avatarUrl}
                      className="h-10 w-10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-foreground">{thread.rootAuthor.username}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(thread.lastReplyAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">
                        {thread.rootMessagePreview}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/40 pl-[52px]">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold shrink-0">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                    </div>
                    {thread.lastReplyPreview && (
                      <span className="text-sm text-muted-foreground truncate">
                        {thread.lastReplyPreview}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
