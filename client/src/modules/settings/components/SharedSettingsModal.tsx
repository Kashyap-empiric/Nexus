"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogHeader } from "@/shared/components/ui/dialog";
import { ProfileSettings } from "./ProfileSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { AboutSettings } from "./AboutSettings";
import { NotificationSettings } from "@/modules/notifications/components/NotificationSettings";
import { User, Monitor, Bell, Info, ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type SettingsView = 'profile' | 'appearance' | 'notifications' | 'about';

const TAB_GROUPS = [
  {
    label: "User Settings",
    items: [
      { id: "profile", label: "Profile", icon: User },
    ]
  },
  {
    label: "App Settings",
    items: [
      { id: "appearance", label: "Appearance", icon: Monitor },
      { id: "notifications", label: "Notifications", icon: Bell },
    ]
  },
  {
    label: "Other",
    items: [
      { id: "about", label: "About", icon: Info },
    ]
  }
] as const;

interface SharedSettingsModalProps {
  isOpen: boolean;
  currentTab: SettingsView;
  setTab: (tab: SettingsView) => void;
  closeSettings: () => void;
}

export const SharedSettingsModal = ({ isOpen, currentTab, setTab, closeSettings }: SharedSettingsModalProps) => {
  const [showMobileMenu, setShowMobileMenu] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setShowMobileMenu(true);
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeSettings();
    }
  };

  const activeTab = currentTab || "profile";

  const handleTabClick = (tabId: SettingsView) => {
    setTab(tabId);
    setShowMobileMenu(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent fullscreenMobile size="xl" className="sm:h-[80vh] p-0 bg-background md:flex-row overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your account settings</DialogDescription>
        </DialogHeader>
        
        {}
        <div 
          className={cn(
            "w-full md:w-64 bg-muted/10 md:bg-muted/30 border-r border-border p-0 md:p-4 flex-col overflow-y-auto shrink-0",
            showMobileMenu ? "flex" : "hidden md:flex"
          )}
        >
          {}
          <div className="px-6 pt-12 pb-4 md:hidden">
            <h2 className="text-2xl font-bold">Settings</h2>
          </div>

          <div className="flex flex-col gap-6 p-4 md:p-0">
            {TAB_GROUPS.map((group, groupIdx) => (
              <div key={groupIdx} className="flex flex-col gap-2">
                <h3 className="text-[12px] font-bold tracking-wider text-muted-foreground uppercase px-2 md:px-3">
                  {group.label}
                </h3>
                <div className="flex flex-col bg-card md:bg-transparent border md:border-0 border-border rounded-xl md:rounded-none overflow-hidden divide-y md:divide-y-0 divide-border">
                  {group.items.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id as SettingsView)}
                        className={cn(
                          "group flex items-center justify-between px-4 md:px-3 py-3.5 md:py-2 text-base md:text-sm font-medium transition-colors w-full text-left",
                          isActive && !showMobileMenu
                            ? "bg-brand/10 text-brand md:rounded-md"
                            : "text-foreground md:text-muted-foreground hover:bg-muted/50 md:hover:bg-muted hover:text-foreground md:rounded-md"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 md:h-4 md:w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          {tab.label}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 md:hidden" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {}
        <div 
          className={cn(
            "flex-1 p-6 md:p-8 overflow-y-auto bg-background",
            !showMobileMenu ? "block" : "hidden md:block"
          )}
        >
          <div className="max-w-2xl w-full mx-auto md:mx-0">
            <button 
              onClick={() => setShowMobileMenu(true)} 
              className="md:hidden flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground -ml-2 p-2 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Settings</span>
            </button>
            
            {activeTab === "profile" && <ProfileSettings />}
            {activeTab === "appearance" && <AppearanceSettings />}
            {activeTab === "notifications" && <NotificationSettings />}
            {activeTab === "about" && <AboutSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
