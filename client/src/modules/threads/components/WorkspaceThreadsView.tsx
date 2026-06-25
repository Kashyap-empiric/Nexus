"use client";

import { useState } from "react";
import { useWorkspaceThreads } from "@/modules/messages/hooks/useThreads";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { formatRelativeTime } from "@/shared/lib/utils";
import { MessageSquare, Hash, Loader2, MessagesSquare } from "lucide-react";
import { useWorkspaceChannelsQuery } from "@/modules/workspaces/hooks/useWorkspaceChannels";
import { useThreadStore } from "@/modules/threads/store/threadStore";
import { useEffect } from "react";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { ThreadPanel } from "./ThreadPanel";
import { useUser } from "@/modules/auth/store/useAuthStore";
import type { User } from "@/modules/conversations/types/conversation";
import { cn } from "@/shared/lib/utils";

interface WorkspaceThreadsViewProps {
  workspaceId: string;
}

interface SelectedThread {
  threadRootId: string;
  conversationId: string;
}

const MAX_VISIBLE_PARTICIPANTS = 4;

export function WorkspaceThreadsView({ workspaceId }: WorkspaceThreadsViewProps) {
  const [selectedThread, setSelectedThread] = useState<SelectedThread | null>(null);

  const { data: threads, isLoading, isError } = useWorkspaceThreads(workspaceId);
  const { data: channels } = useWorkspaceChannelsQuery(workspaceId);
  const { openThread } = useThreadStore();
  const setHeaderInfo = useChatStore((state) => state.setHeaderInfo);
  const authUser = useUser();

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
      <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Threads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Conversations you&apos;re participating in</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="h-14 w-14 bg-muted/60 rounded-2xl flex items-center justify-center mb-5">
            <MessagesSquare className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">No threads yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            When you reply to a message or someone replies to you, it will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      {/* Page header */}
      <div className="px-6 pt-5 pb-3.5 border-b border-border/50 shrink-0">
        <h1 className="text-lg font-bold text-foreground tracking-tight">Threads</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Conversations you&apos;re participating in</p>
      </div>

      {/* Two-pane body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* ── Left pane: thread list ── */}
        <div className="w-[380px] shrink-0 border-r border-border/50 flex flex-col overflow-y-auto">
          <div className="flex flex-col gap-3 p-4">
            {threads.map((thread) => {
              const channel = channels?.find((c) => c.id === thread.conversationId);
              const channelName = channel?.name ?? "unknown";
              const isSelected = selectedThread?.threadRootId === thread.threadRootId;

              return (
                <div
                  key={thread.threadRootId}
                  className={cn(
                    "rounded-xl border bg-card shadow-sm overflow-hidden transition-all duration-100",
                    isSelected
                      ? "border-brand/50 ring-1 ring-brand/20"
                      : "border-border/60 hover:border-border"
                  )}
                >
                  <button
                    onClick={() => {
                      openThread(thread.threadRootId);
                      setSelectedThread({
                        threadRootId: thread.threadRootId,
                        conversationId: thread.conversationId,
                      });
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3.5 transition-colors duration-100 cursor-pointer",
                      isSelected ? "bg-brand/5" : "hover:bg-accent/40"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        name={thread.rootAuthor.username}
                        src={thread.rootAuthor.avatarUrl}
                        className="h-8 w-8 shrink-0 mt-0.5"
                      />

                      <div className="min-w-0 flex-1">
                        {/* Author + channel + timestamp */}
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-sm font-semibold text-foreground leading-none">
                            {thread.rootAuthor.username}
                          </span>
                          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/70 rounded px-1.5 py-0.5">
                            <Hash className="h-2.5 w-2.5 shrink-0" />
                            <span className="font-medium">{channelName}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">
                            {formatRelativeTime(thread.lastReplyAt)}
                          </span>
                        </div>

                        {/* Root message preview */}
                        <p className="text-[13px] text-foreground/75 line-clamp-1 mb-2 leading-relaxed">
                          {thread.rootMessagePreview}
                        </p>

                        {/* Latest reply preview */}
                        {thread.lastReplyPreview && thread.lastReplyAuthor && (
                          <div className="flex items-center gap-1.5 mb-2 bg-muted/30 rounded px-2 py-1">
                            <UserAvatar
                              name={thread.lastReplyAuthor.username}
                              src={thread.lastReplyAuthor.avatarUrl}
                              className="h-3.5 w-3.5 shrink-0"
                            />
                            <span className="text-[11px] font-medium text-foreground shrink-0">
                              {thread.lastReplyAuthor.username}:
                            </span>
                            <span className="text-[11px] text-muted-foreground line-clamp-1">
                              {thread.lastReplyPreview}
                            </span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center gap-2.5">
                          {(thread.participants?.length ?? 0) > 0 && (
                            <div className="flex -space-x-1.5">
                              {(thread.participants ?? [])
                                .slice(0, MAX_VISIBLE_PARTICIPANTS)
                                .map((p) => (
                                  <UserAvatar
                                    key={p.id}
                                    name={p.username}
                                    src={p.avatarUrl}
                                    className="h-4 w-4 border-2 border-background"
                                  />
                                ))}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MessageSquare className="h-3 w-3 shrink-0" />
                            <span className="font-medium">
                              {thread.replyCount}{" "}
                              {thread.replyCount === 1 ? "reply" : "replies"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right pane: thread detail ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
          {selectedThread ? (
            <ThreadPanel
              conversationId={selectedThread.conversationId}
              currentUser={authUser as unknown as User | undefined}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-12 w-12 bg-muted/50 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Select a thread to read it</p>
              <p className="text-[13px] text-muted-foreground/60 mt-1">
                Replies will appear here
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
