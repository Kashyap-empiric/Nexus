"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, ExternalLink, Settings, Reply, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/config/url";
import { useNotifications, useUnreadCount, useMarkAllAsRead, useMarkAsRead } from "../hooks/useNotifications";
import { timeAgo, NotificationIcon } from "../utils/notifications-ui";
import { cn } from "@/shared/lib/utils";
import type { Notification } from "../types/notification";

type Tab = "replies" | "invites";

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const isReply = notification.type === "MESSAGE_REPLIED";

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors hover:bg-muted/50",
        !notification.read && (isReply ? "bg-brand/10" : "bg-brand/5"),
        isReply && !notification.read && "border-l-2 border-brand"
      )}
    >
      <NotificationIcon type={notification.type} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm truncate", !notification.read && "font-semibold")}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {notification.body}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      {!notification.read && (
        <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />
      )}
    </button>
  );
}

function TabButton({
  active,
  label,
  icon,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-bold bg-brand/15 text-brand rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export function BellPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("replies");
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const INVITE_TYPES = "INVITE_RECEIVED,INVITE_ACCEPTED,MEMBER_JOINED,CHANNEL_CREATED,MEMBER_REMOVED";

  const { data: unreadCount = 0 } = useUnreadCount();
  const {
    data: repliesData,
    fetchNextPage: fetchMoreReplies,
    hasNextPage: hasMoreReplies,
    isFetchingNextPage: isLoadingMoreReplies,
  } = useNotifications("MESSAGE_REPLIED");
  const {
    data: invitesData,
    fetchNextPage: fetchMoreInvites,
    hasNextPage: hasMoreInvites,
    isFetchingNextPage: isLoadingMoreInvites,
  } = useNotifications(INVITE_TYPES);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const replies = useMemo(
    () => repliesData?.pages.flatMap((page) => page.data) ?? [],
    [repliesData]
  );
  const invites = useMemo(
    () => invitesData?.pages.flatMap((page) => page.data) ?? [],
    [invitesData]
  );

  const activeNotifications = activeTab === "replies" ? replies : invites;
  const activeFetchMore = activeTab === "replies" ? fetchMoreReplies : fetchMoreInvites;
  const activeHasMore = activeTab === "replies" ? hasMoreReplies : hasMoreInvites;
  const activeIsLoadingMore = activeTab === "replies" ? isLoadingMoreReplies : isLoadingMoreInvites;

  // Compute unread counts per tab
  const repliesUnread = useMemo(
    () => replies.filter((n) => !n.read).length,
    [replies]
  );
  const invitesUnread = useMemo(
    () => invites.filter((n) => !n.read).length,
    [invites]
  );

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-lg hover:bg-muted transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-80 bg-popover border rounded-xl shadow-xl overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              <Link
                href={APP_ROUTES.NOTIFICATIONS.INDEX}
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                title="View all"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
              <Link
                href={APP_ROUTES.SETTINGS.NOTIFICATIONS}
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                title="Notification settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 pt-2.5 pb-2 border-b">
            <TabButton
              active={activeTab === "replies"}
              label="Replies"
              icon={<Reply className="h-3.5 w-3.5" />}
              count={repliesUnread}
              onClick={() => setActiveTab("replies")}
            />
            <TabButton
              active={activeTab === "invites"}
              label="Invites"
              icon={<Mail className="h-3.5 w-3.5" />}
              count={invitesUnread}
              onClick={() => setActiveTab("invites")}
            />
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {activeNotifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {activeTab === "replies"
                  ? "No replies yet"
                  : "No invites yet"}
              </div>
            ) : (
              <>
                {activeNotifications.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={(id) => markAsRead.mutate(id)}
                  />
                ))}
                {activeHasMore && (
                  <button
                    onClick={() => activeFetchMore()}
                    disabled={activeIsLoadingMore}
                    className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {activeIsLoadingMore ? "Loading..." : "Load more"}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {unreadCount > 0 && (
            <div className="border-t p-2">
              <button
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                className="w-full py-1.5 text-xs text-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              >
                {markAllAsRead.isPending ? "Marking..." : "Mark all as read"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
