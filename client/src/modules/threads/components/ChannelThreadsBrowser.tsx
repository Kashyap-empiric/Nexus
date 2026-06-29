import { useChannelThreads } from "@/modules/messages/hooks/useThreads";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { formatRelativeTime } from "@/shared/lib/utils";
import { ThreadIcon } from "@/shared/components/ui/thread-icon";
import type { RightPanelView } from "@/shared/components/layout/AppLayoutShell";

import { useThreadStore } from "@/modules/threads/store/threadStore";

interface ChannelThreadsBrowserProps {
  conversationId: string;
  setRightPanelView: (view: RightPanelView) => void;
  onOpenThread?: (threadRootId: string) => void;
}

export function ChannelThreadsBrowser({ conversationId, setRightPanelView, onOpenThread }: ChannelThreadsBrowserProps) {
  const { data: threads, isLoading, isError } = useChannelThreads(conversationId);
  const { openThread } = useThreadStore();

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col bg-background/50">
        <div className="p-4 flex-1 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full text-left p-3 rounded-xl border border-border/50 bg-card flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 py-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-2.5 w-12 bg-muted/60 rounded animate-pulse shrink-0" />
                  </div>
                  <div className="h-3 w-[95%] bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 w-[80%] bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 pl-10">
                <div className="h-5 w-16 bg-muted/50 rounded-full animate-pulse" />
                <div className="h-3 w-1/3 bg-muted/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-destructive">
        <span className="text-sm">Failed to load threads.</span>
      </div>
    );
  }

  if (!threads || threads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <ThreadIcon className="h-8 w-8 text-muted-foreground mb-3" />
        <h3 className="font-medium text-foreground mb-1">No active threads</h3>
        <p className="text-sm text-muted-foreground">
          Reply to any message to start a thread.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col bg-background/50">
      <div className="p-4 flex-1">
        <div className="space-y-3">
          {threads.map((thread) => (
            <button
              key={thread.threadRootId}
              onClick={() => {
                if (onOpenThread) {
                  onOpenThread(thread.threadRootId);
                } else {
                  openThread(thread.threadRootId);
                  setRightPanelView('thread');
                }
              }}
              className="w-full text-left p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-colors flex flex-col gap-2 group"
            >
              <div className="flex items-start gap-2">
                <UserAvatar
                  name={thread.rootAuthor.username}
                  src={thread.rootAuthor.avatarUrl}
                  className="h-8 w-8 shrink-0 mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate">{thread.rootAuthor.username}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatRelativeTime(thread.lastReplyAt)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2 leading-snug">
                    {thread.rootMessagePreview}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 pl-10">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium">
                  <ThreadIcon className="h-3 w-3" />
                  {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                </div>
                {thread.lastReplyPreview && (
                  <span className="text-xs text-muted-foreground truncate">
                    {thread.lastReplyPreview}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
