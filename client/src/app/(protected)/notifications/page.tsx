"use client";

import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/config/url";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/modules/notifications/hooks/useNotifications";
import { timeAgo, NotificationIcon } from "@/modules/notifications/utils/notifications-ui";
import type { Notification } from "@/modules/notifications/types/notification";
import { cn } from "@/shared/lib/utils";

function NotificationCard({
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

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left flex items-start gap-3 p-4 rounded-lg border transition-colors hover:bg-muted/50",
        !notification.read ? "bg-primary/5 border-primary/20" : "bg-card border-border"
      )}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm", !notification.read && "font-semibold")}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
          )}
        </div>
        {notification.body && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1.5">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const allNotifications = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={APP_ROUTES.CONVERSATIONS.INDEX}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors -ml-1.5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Notifications</h1>
          </div>
        </div>
        <button
          onClick={() => markAllAsRead.mutate()}
          disabled={markAllAsRead.isPending || allNotifications.length === 0}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse w-8 h-8 rounded-full bg-primary/20" />
          </div>
        ) : allNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-xs mt-1">Messages and invites will appear here</p>
          </div>
        ) : (
          <div className="p-4 space-y-2 max-w-2xl mx-auto">
            {allNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => markAsRead.mutate(id)}
              />
            ))}
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full py-3 text-sm text-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
