"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, ExternalLink, Reply, Mail, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/shared/lib/api";
import { API_ROUTES, APP_ROUTES } from "@/config/url";
import { useNotifications, useUnreadCount, useMarkAllAsRead, useMarkAsRead } from "../hooks/useNotifications";
import { timeAgo, formatNotificationTime, NotificationIcon } from "../utils/notifications-ui";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";
import { friendlyError } from "@/shared/lib/friendly-error";
import type { Notification } from "../types/notification";
import { presetNavigationFromLink } from "@/shared/lib/navigation";

type Tab = "replies" | "invites";

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isDeclined, setIsDeclined] = useState(false);

  const isInvite = notification.type === "INVITE_RECEIVED";
  const inviteToken = isInvite
    ? (notification.metadata as Record<string, unknown> | null)?.token as string | undefined
    : undefined;
  const isAccepted = isInvite && (notification.metadata as Record<string, unknown> | null)?.accepted === true;

  const handleClick = () => {
    if (isAccepted || isDeclined) return;
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    if (notification.link) {
      presetNavigationFromLink(notification.link);
      router.push(notification.link);
    }
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inviteToken) return;

    setActionLoading("accept");
    try {
      const res = await api.post(API_ROUTES.INVITES.RESOLVE, { token: inviteToken });
      if (!notification.read) onMarkRead(notification.id);
      if (res.data.alreadyMember) {
        toast.info("You're already a member of this workspace");
      }
      if (res.data.redirectUrl) {
        router.push(res.data.redirectUrl);
      }
    } catch (err: unknown) {
      toast.error(friendlyError(err, "Failed to accept invite"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inviteToken) return;

    setActionLoading("decline");
    try {
      await api.post(API_ROUTES.INVITES.DECLINE, { token: inviteToken });
      if (!notification.read) onMarkRead(notification.id);
      setIsDeclined(true);
      toast.success("Invite declined");
    } catch (err: unknown) {
      toast.error(friendlyError(err, "Failed to decline invite"));
    } finally {
      setActionLoading(null);
    }
  };

  const isReply = notification.type === "MESSAGE_REPLIED";

  return (
    <div
      className={cn(
        "w-full text-left px-3 py-2.5 transition-colors",
        !notification.read && (isReply ? "bg-brand/10" : "bg-brand/5"),
        isReply && !notification.read && "border-l-2 border-brand",
        !isAccepted && !isDeclined && "hover:bg-muted/50",
        (isAccepted || isDeclined) && "opacity-60"
      )}
    >
      <button
        onClick={handleClick}
        disabled={isAccepted || isDeclined}
        className={cn(
          "w-full text-left flex items-start gap-2",
          (isAccepted || isDeclined) && "cursor-default"
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
            <span className="mx-1">·</span>
            {formatNotificationTime(notification.createdAt)}
          </p>
        </div>
        {!notification.read && (
          <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />
        )}
      </button>

      {isInvite && inviteToken && !isAccepted && (
        <div className="flex items-center gap-2 mt-2 ml-8">
          <button
            onClick={handleAccept}
            disabled={actionLoading !== null}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-brand text-brand-foreground hover:bg-brand/90 transition-colors disabled:opacity-50"
          >
            {actionLoading === "accept" ? (
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Accept
          </button>
          <button
            onClick={handleDecline}
            disabled={actionLoading !== null}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors disabled:opacity-50"
          >
            {actionLoading === "decline" ? (
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
            Decline
          </button>
        </div>
      )}
      {isInvite && isAccepted && (
        <div className="flex items-center gap-2 mt-2 ml-8">
          <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-brand/10 text-brand">
            <Check className="h-3 w-3" />
            Accepted
          </span>
        </div>
      )}
      {isInvite && isDeclined && (
        <div className="flex items-center gap-2 mt-2 ml-8">
          <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-destructive/10 text-destructive">
            <X className="h-3 w-3" />
            Declined
          </span>
        </div>
      )}
    </div>
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
  const [activeTab, setActiveTab] = useState<Tab>("invites");
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const INVITE_TYPES = "INVITE_RECEIVED,INVITE_ACCEPTED,INVITE_DECLINED,MEMBER_JOINED,CHANNEL_CREATED,CHANNEL_MEMBER_ADDED,CHANNEL_MEMBER_REMOVED,MEMBER_REMOVED,ROLE_CHANGED,WORKSPACE_DELETED";

  const { data: unreadCount = 0 } = useUnreadCount();
  const {
    data: repliesData,
    fetchNextPage: fetchMoreReplies,
    hasNextPage: hasMoreReplies,
    isFetchingNextPage: isLoadingMoreReplies,
    isError: isRepliesError,
  } = useNotifications("MESSAGE_REPLIED");
  const {
    data: invitesData,
    fetchNextPage: fetchMoreInvites,
    hasNextPage: hasMoreInvites,
    isFetchingNextPage: isLoadingMoreInvites,
    isError: isInvitesError,
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

  const notificationMap: Record<Tab, Notification[]> = {
    replies,
    invites,
  };

  const activeNotifications = notificationMap[activeTab];
  const fetchMoreMap: Record<Tab, () => void> = {
    replies: fetchMoreReplies,
    invites: fetchMoreInvites,
  };
  const hasMoreMap: Record<Tab, boolean> = {
    replies: hasMoreReplies ?? false,
    invites: hasMoreInvites ?? false,
  };
  const isLoadingMoreMap: Record<Tab, boolean> = {
    replies: isLoadingMoreReplies,
    invites: isLoadingMoreInvites,
  };

  const activeFetchMore = fetchMoreMap[activeTab];
  const activeHasMore = hasMoreMap[activeTab];
  const activeIsLoadingMore = isLoadingMoreMap[activeTab];
  const isError = activeTab === "replies" ? isRepliesError : isInvitesError;

  const repliesUnread = useMemo(
    () => replies.filter((n) => !n.read).length,
    [replies]
  );
  const invitesUnread = useMemo(
    () => invites.filter((n) => !n.read).length,
    [invites]
  );

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
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1" style={{ color: '#ffffff' }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-80 bg-popover border rounded-xl shadow-xl overflow-hidden z-50"
        >
          {}
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

            </div>
          </div>

          {}
          <div className="flex items-center gap-1 px-3 pt-2.5 pb-2 border-b">
            <TabButton
              active={activeTab === "invites"}
              label="Invites"
              icon={<Mail className="h-3.5 w-3.5" />}
              count={invitesUnread}
              onClick={() => setActiveTab("invites")}
            />
            <TabButton
              active={activeTab === "replies"}
              label="Replies"
              icon={<Reply className="h-3.5 w-3.5" />}
              count={repliesUnread}
              onClick={() => setActiveTab("replies")}
            />
          </div>

          {}
          <div className="max-h-80 overflow-y-auto">
            {isError && (
              <div className="px-3 py-2 text-xs text-destructive bg-destructive/10">
                Failed to load notifications.
              </div>
            )}
            {!isError && activeNotifications.length === 0 ? (
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

          {}
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
