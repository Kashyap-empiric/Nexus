"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { APP_ROUTES } from "@/config/url";
import { useNotificationPreferences } from "@/modules/notifications/hooks/useNotifications";

export default function NotificationSettingsPage() {
  const { preferences, isLoading, update, isUpdating } = useNotificationPreferences();

  const handleToggle = (key: "pushEnabled" | "dmNotifications" | "mentionNotifications" | "channelNotifications") => {
    if (preferences) {
      update({ [key]: !preferences[key] });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="animate-pulse w-8 h-8 rounded-full bg-primary/20" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <Link
          href={APP_ROUTES.CONVERSATIONS.INDEX}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors -ml-1.5"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Notification Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
        <div className="space-y-6">
          {/* Desktop Notifications toggle */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Desktop Notifications
            </h2>
            <div className="border rounded-lg divide-y">
              <ToggleRow
                label="Enable Desktop Notifications"
                description="Receive notifications when you get new messages or invites"
                checked={preferences?.pushEnabled ?? false}
                disabled={isUpdating}
                onChange={() => handleToggle("pushEnabled")}
              />
            </div>
          </div>

          {/* Notification Type toggles (next level) */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Notification Types
            </h2>
            <div className="border rounded-lg divide-y">
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
            </div>
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
