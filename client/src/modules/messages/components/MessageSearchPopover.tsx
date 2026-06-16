"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Hash, MessageSquare, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMessageSearchQuery } from "../hooks/useMessageSearch";
import { APP_ROUTES } from "@/config/url";
import { timeAgo } from "@/modules/notifications/utils/notifications-ui";
import type { MessageSearchResult } from "../api/messages.api";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function MessageSearchPopover() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const { data: results, isLoading } = useMessageSearchQuery(debouncedQuery, open);

  const handleResultClick = (result: MessageSearchResult) => {
    setOpen(false);
    setQuery("");
    const url =
      result.conversation.type === "CHANNEL" && result.conversation.workspaceId
        ? APP_ROUTES.WORKSPACES.CHANNEL(result.conversation.workspaceId, result.conversation.id)
        : APP_ROUTES.CONVERSATIONS.DETAIL(result.conversation.id);
    router.push(url);
  };

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title="Search messages"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-[400px] bg-popover border rounded-xl shadow-xl overflow-hidden z-50"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Clear
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && debouncedQuery && results?.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No messages found
              </div>
            )}

            {!isLoading &&
              results?.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0"
                >
                  <div className="mt-0.5 shrink-0 text-muted-foreground">
                    {result.conversation.type === "CHANNEL" ? (
                      <Hash className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">
                      {result.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.conversation.type === "CHANNEL"
                        ? `#${result.conversation.name ?? "unknown"}`
                        : `DM with ${result.user.username}`}
                      {" · "}
                      {result.user.fullName ?? result.user.username}
                      {" · "}
                      {timeAgo(result.createdAt)}
                    </p>
                  </div>
                </button>
              ))}

            {!debouncedQuery && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Start typing to search messages
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
