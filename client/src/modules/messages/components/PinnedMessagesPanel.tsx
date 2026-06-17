"use client";

import { usePinnedMessages, useUnpinMessage } from "@/modules/messages/hooks/usePinnedMessages";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { Button } from "@/shared/components/ui/button";
import { Pin, Trash, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useLayoutUI } from "@/shared/components/layout/AppLayoutShell";
import { scrollToMessage } from "@/shared/lib/dom";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

interface PinnedMessagesPanelProps {
  conversationId: string;
  currentUserId?: string | null;
  workspaceId?: string | null;
}

export function PinnedMessagesPanel({ conversationId, currentUserId }: PinnedMessagesPanelProps) {
  const { data: pins, isLoading, isError } = usePinnedMessages(conversationId);
  const unpinMutation = useUnpinMessage(conversationId);
  const { closeInfoPanel } = useLayoutUI();
  const isMobile = useMediaQuery("(max-width: 767px)")

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-red-500 p-4 text-center">
        Failed to load pinned messages.
      </div>
    );
  }

  if (!pins || pins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Pin className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground font-medium">No pinned messages</p>
        <p className="text-xs text-muted-foreground mt-1">
          Pin messages to keep them here for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {pins.map((pin) => (
        <button
          key={pin.id}
          type="button"
          onClick={() => {
            // Only close the info panel on mobile/tablet (less space)
            if (isMobile) {
              closeInfoPanel();
              // Small delay to let the info panel close animation start
              setTimeout(() => scrollToMessage(pin.messageId), 50);
            } else {
              scrollToMessage(pin.messageId);
            }
          }}
          className="group flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 border border-border/50 transition-colors text-left w-full"
        >
          <UserAvatar
            name={pin.message.user?.username}
            src={pin.message.user?.avatarUrl}
            
            className="h-8 w-8 shrink-0 mt-0.5"
            fallbackClassName="bg-primary/20 text-primary font-medium"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">
                {pin.message.user?.username || "Deleted user"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(pin.createdAt))}
              </span>
            </div>
            <div className="text-sm text-foreground mt-0.5 line-clamp-3">
              <MarkdownRenderer content={pin.message.content} />
            </div>
          </div>
          {currentUserId === pin.pinnedBy && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                unpinMutation.mutate(pin.messageId);
              }}
              title="Unpin"
              disabled={unpinMutation.isPending}
            >
              <Trash className="h-3.5 w-3.5" />
            </Button>
          )}
        </button>
      ))}
    </div>
  );
}
