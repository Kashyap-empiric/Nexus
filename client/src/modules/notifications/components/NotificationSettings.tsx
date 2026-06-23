"use client";

import { useState, useEffect } from "react";
import { useNotificationPreferences } from "@/modules/notifications/hooks/useNotifications";
import { subscribeToPush, unsubscribeFromPush } from "@/shared/lib/push";
import type { NotificationPreference } from "../types/notification";

export function NotificationSettings() {
  const { preferences, isLoading, update, updateAsync, isUpdating } = useNotificationPreferences();
  const [actualPushEnabled, setActualPushEnabled] = useState(false);

  
  useEffect(() => {
    let cancelled = false;
    if (preferences?.pushEnabled && typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (cancelled) return;
          setActualPushEnabled(!!(sub && Notification.permission === "granted"));
        }).catch(() => {
          if (!cancelled) setActualPushEnabled(false);
        });
      });
    } else {
      setActualPushEnabled(false);
    }
    return () => { cancelled = true; };
  }, [preferences?.pushEnabled]);
  

  const handleToggle = async (key: keyof NotificationPreference) => {
    if (!preferences) return;

    if (key !== "pushEnabled") {
      update({ [key]: !preferences[key] });
      return;
    }

    if (actualPushEnabled) {
      await unsubscribeFromPush();
      setActualPushEnabled(false);
      await updateAsync({ pushEnabled: false });
    } else {
      const sub = await subscribeToPush();
      if (sub) {
        setActualPushEnabled(true);
        await updateAsync({ pushEnabled: true });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <div className="h-6 w-32 bg-primary/10 rounded mb-2"></div>
          <div className="h-4 w-64 bg-primary/10 rounded"></div>
        </div>

        <div className="space-y-3">
          <div className="h-4 w-40 bg-primary/10 rounded"></div>
          <div className="border rounded-lg divide-y bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-primary/10 rounded"></div>
                <div className="h-3 w-64 bg-primary/10 rounded"></div>
              </div>
              <div className="h-5 w-9 bg-primary/10 rounded-full shrink-0"></div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-4 w-40 bg-primary/10 rounded"></div>
          <div className="border rounded-lg divide-y bg-card">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-primary/10 rounded"></div>
                  <div className="h-3 w-56 bg-primary/10 rounded"></div>
                </div>
                <div className="h-5 w-9 bg-primary/10 rounded-full shrink-0"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Manage how and when you receive alerts.
        </p>
      </div>

      <div className="space-y-6">
        {}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Push Notifications
          </h2>
          <div className="border rounded-lg divide-y bg-card">
            <ToggleRow
              label="Enable Push Notifications"
              description="Receive notifications when you get new messages or invites"
              checked={actualPushEnabled}
              disabled={isUpdating}
              onChange={() => handleToggle("pushEnabled")}
            />
          </div>
        </div>

        {}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Notification Types
          </h2>
          <div className="border rounded-lg divide-y bg-card">
            <ToggleRow
              label="Direct Messages"
              description="Notify me when someone sends me a direct message"
              checked={preferences?.dmNotifications ?? true}
              disabled={isUpdating}
              onChange={() => handleToggle("dmNotifications")}
            />
            <ToggleRow
              label="Mentions"
              description="Notify me when someone mentions me in a channel"
              checked={preferences?.mentionNotifications ?? true}
              disabled={isUpdating}
              onChange={() => handleToggle("mentionNotifications")}
            />
            <ToggleRow
              label="All Channel Messages"
              description="Notify me for every message in channels I'm in"
              checked={preferences?.channelNotifications ?? false}
              disabled={isUpdating}
              onChange={() => handleToggle("channelNotifications")}
            />
            <ToggleRow
              label="Invites"
              description="Notify me when I receive or accept invitations"
              checked={preferences?.inviteNotifications ?? true}
              disabled={isUpdating}
              onChange={() => handleToggle("inviteNotifications")}
            />
            <ToggleRow
              label="Replies"
              description="Notify me when someone replies to my messages"
              checked={preferences?.replyNotifications ?? true}
              disabled={isUpdating}
              onChange={() => handleToggle("replyNotifications")}
            />
            <ToggleRow
              label="Workspace Activity"
              description="Notify me about member joins, role changes, and workspace updates"
              checked={preferences?.workspaceActivityNotifications ?? true}
              disabled={isUpdating}
              onChange={() => handleToggle("workspaceActivityNotifications")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        disabled={disabled}
        className={`
          relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full 
          transition-colors duration-200 ease-in-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${checked ? "bg-primary" : "bg-input"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 
            transition-transform duration-200 ease-in-out
            ${checked ? "translate-x-[18px]" : "translate-x-0.5"}
          `}
        />
      </button>
    </div>
  );
}
