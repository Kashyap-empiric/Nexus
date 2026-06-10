import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import type { MessageGroup } from "../utils/groupMessages";
import { MessageStatus } from "./MessageStatus";

interface MessageGroupItemProps {
  group: MessageGroup;
  currentUserId?: string | null;
  partnerLastReadMessageId?: string | null;
}

export function MessageGroupItem({ group, currentUserId, partnerLastReadMessageId }: MessageGroupItemProps) {
  const { user, messages } = group;

  return (
    <div className="mt-2 mb-1">
      {messages.map((msg, index) => {
        const isFirst = index === 0;
        const isMyMessage = msg.userId === currentUserId;

        const time = new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(msg.createdAt));

        return (
          <div
            key={msg.id}
            className={`group/row flex hover:bg-black/5 dark:hover:bg-white-[0.03] px-4 animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out ${isFirst ? "pt-2 pb-0.5" : "py-0.5"} ${msg.optimistic || msg.pending ? "opacity-70" : ""}`}
          >
            {/* Gutter: Avatar or Hover Timestamp */}
            <div className="w-[50px] shrink-0 flex justify-center items-start relative select-none">
              {isFirst ? (
                <Avatar className="h-9 w-9 mt-0.5 absolute left-1">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-medium pt-[1px]">
                    {user?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span className="text-[10px] text-muted-foreground opacity-0 group-hover/row:opacity-100 mt-[5px] absolute right-2 leading-none">
                  {time}
                </span>
              )}
            </div>

            {/* Content: Header (if first) + Message Body */}
            <div className="flex-1 min-w-0">
              {isFirst && (
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-bold text-foreground hover:underline cursor-pointer leading-none">
                    {user?.username || "Deleted user"}
                  </span>
                  <span className="text-xs text-muted-foreground leading-none">
                    {time}
                  </span>
                  {isMyMessage && (
                    <MessageStatus
                      messageId={msg.id}
                      isPending={msg.pending}
                      partnerLastReadMessageId={partnerLastReadMessageId}
                      className="ml-1"
                    />
                  )}
                </div>
              )}
              <div className="text-[15px] text-foreground whitespace-pre-wrap break-words leading-relaxed flex items-center justify-between group/msg">
                <span>{msg.content}</span>
                {!isFirst && isMyMessage && (
                  <MessageStatus
                    messageId={msg.id}
                    isPending={msg.pending}
                    partnerLastReadMessageId={partnerLastReadMessageId}
                    className="ml-2"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
