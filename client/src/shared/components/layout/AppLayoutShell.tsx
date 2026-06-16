"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/modules/conversations/components/Sidebar";
import { NavigationRail } from "@/modules/chat/components/NavigationRail";
import { BellPopover } from "@/modules/notifications/components/BellPopover";
import { MessageSearchPopover } from "@/modules/messages/components/MessageSearchPopover";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { useWorkspaceMembersQuery } from "@/modules/workspaces/hooks/useWorkspaces";
import { cn } from "@/shared/lib/utils";
import { Menu, Hash, Users, X, ArrowLeft } from "lucide-react";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
import Link from "next/link";
import { APP_ROUTES } from "@/config/url";
import { InviteModalProvider, useInviteModalContext } from "@/modules/invites/context/InviteModalContext";
import { InviteModal } from "@/modules/invites/components/InviteModal";
import { SharedSettingsModal, SettingsView } from "@/modules/settings/components/SharedSettingsModal";
import { Info } from "lucide-react";
import React, { createContext, useContext } from "react";
import { useSocketStore } from "@/socket/socketStore";

function HeaderPresenceText({ userId }: { userId: string }) {
  const isOnline = useSocketStore((state) => state.onlineUsers.has(userId));
  return <>{isOnline ? "Online" : "Offline"}</>;
}

function MemberCountBadge({ workspaceId }: { workspaceId: string }) {
  const { data: members } = useWorkspaceMembersQuery(workspaceId);
  const count = members?.length ?? 0;
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded-md border border-border/50 select-none">
      <Users className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">{count}</span>
    </div>
  );
}

export type InfoPanelView = 'about' | 'members' | 'pins';

export interface LayoutUIContextType {
  infoPanelOpen: boolean;
  infoPanelView: InfoPanelView;
  setInfoPanelView: (view: InfoPanelView) => void;
  closeInfoPanel: () => void;
}

const LayoutUIContext = createContext<LayoutUIContextType | null>(null);

export function useLayoutUI() {
  const context = useContext(LayoutUIContext);
  if (!context) throw new Error("useLayoutUI must be used within AppLayoutShell");
  return context;
}

export function AppLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InviteModalProvider>
      <AppLayoutShellInner>
        {children}
      </AppLayoutShellInner>
    </InviteModalProvider>
  );
}

function AppLayoutShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const headerInfo = useChatStore((state) => state.headerInfo);

  // Local UI State (Single Source of Truth)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [infoPanelView, setInfoPanelView] = useState<InfoPanelView>('about');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('profile');

  const isContentActive =
    pathname?.includes(APP_ROUTES.CONVERSATIONS.INDEX + "/") ||
    pathname?.includes(APP_ROUTES.WORKSPACES.CHANNELS_PATH + "/") ||
    pathname?.startsWith(APP_ROUTES.SETTINGS.INDEX + "/");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    
    // Open info panel by default on desktop
    if (window.innerWidth >= 768) {
      setInfoPanelOpen(true);
    }

    if ("serviceWorker" in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE' && event.data.url) {
          router.push(event.data.url);
        }
      };
      navigator.serviceWorker.addEventListener("message", handleMessage);
      return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
    }
  }, [router]);

  const isChannel = mounted ? (headerInfo?.isChannel ?? false) : false;

  const inviteModal = useInviteModalContext();
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  const openSettings = (view: SettingsView) => {
    setSettingsView(view);
    setSettingsOpen(true);
  };

  if (pathname?.startsWith('/onboarding')) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar area — toggled by button on mobile */}
      <div className={cn(
        "shrink-0 flex transition-transform duration-300 ease-in-out",
        isContentActive
          ? "fixed inset-y-0 left-0 z-50 w-screen bg-background lg:w-auto lg:relative lg:z-auto" +
          (mobileSidebarOpen ? " translate-x-0" : " -translate-x-full lg:translate-x-0")
          : "relative w-full lg:w-auto"
      )}>
        <NavigationRail openSettings={openSettings} />
        <div className={cn(
          "flex-1 lg:flex-initial",
          isContentActive ? "flex" : "flex flex-1 min-w-0 lg:w-auto"
        )}>
          <Sidebar onNavigate={closeMobileSidebar} />
        </div>
      </div>

      <main className={cn("flex-1 flex-col min-w-0 bg-background h-full", !isContentActive ? "hidden lg:flex" : "flex")}>
        {/* Global header bar */}
        <div className="h-14 border-b flex items-center justify-between px-[15px] md:px-4 xl:px-6 shrink-0 bg-background shadow-sm">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            {/* Back/Sidebar toggle (mobile only) */}
            {mounted && headerInfo && (
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="lg:hidden relative p-2 -ml-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Toggle sidebar"
              >
                <ArrowLeft className="h-5 w-5" />
                {headerInfo.totalUnreadCount > 0 && (
                  <span className="absolute bottom-0 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-bold text-white shadow-sm ring-2 ring-background">
                    {headerInfo.totalUnreadCount > 99 ? '99+' : headerInfo.totalUnreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Conversation info */}
            {(!mounted || !headerInfo) ? (
              <span className="text-sm text-muted-foreground">Nexus</span>
            ) : isChannel ? (
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="h-6 w-6 text-muted-foreground shrink-0" />
                <div className="flex flex-col gap-1 min-w-0">
                  <h2 className="text-base font-bold text-foreground leading-none truncate">{headerInfo.title}</h2>
                  {headerInfo.subtitle && (
                    <span className="text-[12px] text-muted-foreground leading-tight truncate">
                      {headerInfo.subtitle}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <UserAvatar
                    name={headerInfo.title}
                    src={headerInfo.otherMember?.avatarUrl}
                    avatarPath={headerInfo.otherMember?.avatarPath}
                    className="h-9 w-9"
                    fallbackClassName="bg-primary/20 text-primary font-medium"
                  />
                  {headerInfo.otherMember?.userId && (
                    <PresenceIndicator userId={headerInfo.otherMember.userId} className="-bottom-0.5 -right-0.5" />
                  )}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <h2 className="text-base font-bold text-foreground leading-none truncate">{headerInfo.title}</h2>
                  <span className="text-[11px] text-muted-foreground/60 leading-tight truncate">
                    {headerInfo.otherMember?.userId ? (
                      <HeaderPresenceText userId={headerInfo.otherMember.userId} />
                    ) : "Offline"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 shrink-0">
            {mounted && isChannel && headerInfo?.workspaceId && (
              <MemberCountBadge workspaceId={headerInfo.workspaceId} />
            )}
            <MessageSearchPopover />
            <div className="relative">
              <BellPopover />
            </div>
            {mounted && (
              <button
                onClick={() => setInfoPanelOpen(!infoPanelOpen)}
                className={`p-2 rounded-md transition-colors ${infoPanelOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                title="Toggle Info"
              >
                <Info className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>        
        {/* Content area */}
        <div className="flex-1 min-h-0 flex justify-center">
          <LayoutUIContext.Provider value={{
            infoPanelOpen,
            infoPanelView,
            setInfoPanelView,
            closeInfoPanel: () => setInfoPanelOpen(false),
          }}>
            {children}
          </LayoutUIContext.Provider>
        </div>
      </main>

      {/* Global modals rendered at top level */}
      <InviteModal isOpen={inviteModal.isOpen} onClose={inviteModal.close} type={inviteModal.type} entityId={inviteModal.entityId} />
      <SharedSettingsModal
        isOpen={settingsOpen}
        currentTab={settingsView}
        setTab={setSettingsView}
        closeSettings={() => setSettingsOpen(false)}
      />
    </div>
  );
}
