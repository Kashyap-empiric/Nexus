import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { MessageGroup } from "../utils/groupMessages";

export function MessageGroupItem({ group }: { group: MessageGroup }) {
  const { user, messages } = group;

  return (
    <div className="mt-2 mb-1">
      {messages.map((msg, index) => {
        const isFirst = index === 0;

        const time = new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(msg.createdAt));

        return (
          <div
            key={msg.id}
            className={`group/row flex hover:bg-black/5 dark:hover:bg-white-[0.03] px-4 ${isFirst ? "pt-2 pb-0.5" : "py-0.5"} ${msg.optimistic ? "opacity-70" : ""}`}
          >
            {/* Gutter: Avatar or Hover Timestamp */}
            <div className="w-[50px] shrink-0 flex justify-center items-start relative select-none">
              {isFirst ? (
                <Avatar className="h-9 w-9 mt-0.5 absolute left-1 rounded-md">
                  <AvatarImage src={user?.avatarUrl || undefined} className="rounded-md" />
                  <AvatarFallback className="bg-primary/20 text-primary rounded-md font-medium">
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
                    {user?.username || "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground leading-none">
                    {time}
                  </span>
                </div>
              )}
              <div className="text-[15px] text-foreground whitespace-pre-wrap break-words leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
