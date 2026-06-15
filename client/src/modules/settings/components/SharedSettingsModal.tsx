"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogHeader } from "@/shared/components/ui/dialog";
import { ProfileSettings } from "./ProfileSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { NotificationSettings } from "@/modules/notifications/components/NotificationSettings";
import { User, Monitor, Bell } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type SettingsView = 'profile' | 'appearance' | 'notifications';

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Monitor },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;

interface SharedSettingsModalProps {
  isOpen: boolean;
  currentTab: SettingsView;
  setTab: (tab: SettingsView) => void;
  closeSettings: () => void;
}

export const SharedSettingsModal = ({ isOpen, currentTab, setTab, closeSettings }: SharedSettingsModalProps) => {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeSettings();
    }
  };

  const activeTab = currentTab || "profile";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-full h-[100dvh] p-0 rounded-none sm:rounded-xl sm:max-w-4xl sm:h-[80vh] md:w-[95vw] flex flex-col md:flex-row overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your account settings</DialogDescription>
        </DialogHeader>
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-muted/30 border-b md:border-b-0 md:border-r border-border p-4 pr-14 md:pr-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id as SettingsView)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-2xl w-full">
            {activeTab === "profile" && <ProfileSettings />}
            {activeTab === "appearance" && <AppearanceSettings />}
            {activeTab === "notifications" && <NotificationSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
