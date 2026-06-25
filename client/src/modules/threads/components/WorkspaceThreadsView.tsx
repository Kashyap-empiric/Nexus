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

const MAX_VISIBLE_PARTICIPANTS = 3;

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
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 md:px-10 lg:px-16 py-6" style={{ maxWidth: 920 }}>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Threads</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Conversations you&apos;re participating in
            </p>
          </div>

          <div>
            {threads.map((thread, index) => {
              const channel = channels?.find(c => c.id === thread.conversationId);
              const channelName = channel?.name || "unknown";

              return (
                <div key={thread.threadRootId}>
                  {index > 0 && <div className="border-t border-border/40" />}
                  <button
                    onClick={() => {
                      router.push(`/workspaces/${workspaceId}/channels/${thread.conversationId}`);
                      setTimeout(() => {
                        openThread(thread.threadRootId);
                        setInfoPanelView("thread");
                        setInfoPanelOpen(true);
                      }, 50);
                    }}
                    className="w-full text-left px-1 py-4 hover:bg-accent/30 transition-colors flex items-start gap-3 group cursor-pointer"
                  >
                    <UserAvatar
                      name={thread.rootAuthor.username}
                      src={thread.rootAuthor.avatarUrl}
                      className="h-10 w-10 shrink-0 mt-0.5"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Hash className="h-3 w-3 shrink-0" />
                          <span className="font-medium hover:underline">{channelName}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground/60">
                          {formatRelativeTime(thread.lastReplyAt)}
                        </span>
                      </div>

                      <div className="mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          {thread.rootAuthor.username}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1.5">
                          started a thread
                        </span>
                      </div>

                      <p className="text-sm text-foreground/80 line-clamp-1 mb-2">
                        {thread.rootMessagePreview}
                      </p>

                      {thread.lastReplyPreview && thread.lastReplyAuthor && (
                        <div className="flex items-start gap-2 mb-2 pl-0">
                          <div className="relative shrink-0 mt-0.5">
                            <UserAvatar
                              name={thread.lastReplyAuthor.username}
                              src={thread.lastReplyAuthor.avatarUrl}
                              className="h-5 w-5"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-[1px]">
                              <MessageSquare className="h-2.5 w-2.5 text-brand" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-foreground">
                              {thread.lastReplyAuthor.username}
                            </span>
                            <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                              {thread.lastReplyPreview}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          <span className="font-medium">
                            {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                          </span>
                        </div>

                        {(thread.participants?.length ?? 0) > 0 && (
                          <div className="flex items-center">
                            <div className="flex -space-x-1.5 mr-2">
                              {(thread.participants ?? []).slice(0, MAX_VISIBLE_PARTICIPANTS).map((p) => (
                                <UserAvatar
                                  key={p.id}
                                  name={p.username}
                                  src={p.avatarUrl}
                                  className="h-5 w-5 border-2 border-background"
                                />
                              ))}
                            </div>
                            {(thread.participants?.length ?? 0) > MAX_VISIBLE_PARTICIPANTS && (
                              <span className="text-[11px] text-muted-foreground">
                                +{(thread.participants?.length ?? 0) - MAX_VISIBLE_PARTICIPANTS}
                              </span>
                            )}
                          </div>
                        )}

                        <span className="text-[11px] font-medium text-brand/70">
                          Active
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
