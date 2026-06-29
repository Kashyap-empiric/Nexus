"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { UserAvatar } from "@/shared/components/ui/user-avatar";

export interface MentionUser {
  id: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

interface MentionListProps {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
}

export interface MentionListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Reset selection when items change
    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.username });
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) return null;

    return (
      <div className="z-50 min-w-[180px] max-w-[260px] overflow-hidden rounded-lg border border-border bg-popover shadow-xl animate-in fade-in zoom-in-95 duration-100">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
              index === selectedIndex ? "bg-accent text-accent-foreground" : "text-popover-foreground"
            }`}
            onClick={() => selectItem(index)}
            type="button"
          >
            <UserAvatar
              name={item.username}
              src={item.avatarUrl}
              className="h-6 w-6 text-[10px] shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate">@{item.username}</span>
              {item.fullName && (
                <span className="text-xs text-muted-foreground truncate">{item.fullName}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";
