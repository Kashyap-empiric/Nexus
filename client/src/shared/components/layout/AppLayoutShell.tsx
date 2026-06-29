"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/modules/conversations/components/Sidebar";
import { NavigationRail } from "@/modules/chat/components/NavigationRail";
import { BellPopover } from "@/modules/notifications/components/BellPopover";
import { MessageSearchPopover } from "@/modules/messages/components/MessageSearchPopover";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { useRouteState } from "@/shared/hooks/useRouteState";
import { useWorkspaceMembersQuery } from "@/modules/workspaces/hooks/useWorkspaces";
import { cn } from "@/shared/lib/utils";
import { Hash, Users, ArrowLeft } from "lucide-react";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
import { APP_ROUTES } from "@/config/url";
import { InviteModalProvider, useInviteModalContext } from "@/modules/invites/context/InviteModalContext";
import dynamic from "next/dynamic";

const InviteModal = dynamic(() => import("@/modules/invites").then(mod => mod.InviteModal), { ssr: false });
const SharedSettingsModal = dynamic(() => import("@/modules/settings").then(mod => mod.SharedSettingsModal), { ssr: false });
const WorkspaceSettingsModal = dynamic(() => import("@/modules/workspaces").then(mod => mod.WorkspaceSettingsModal), { ssr: false });
import { Info, Pin } from "lucide-react";
import { ThreadIcon } from "@/shared/components/ui/thread-icon";
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
    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md border border-border/40 select-none">
      <Users className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-medium tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

export type RightPanelView = 'about' | 'pins' | 'threads' | 'thread' | null;

export interface LayoutUIContextType {
  rightPanelOpen: boolean;
  rightPanelView: RightPanelView;
  setRightPanelView: (view: RightPanelView) => void;
  closeRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  closeMobileSidebar: () => void;
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
  const { activeWorkspaceId } = useRouteState();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('about');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<'profile' | 'appearance' | 'notifications' | 'account'>('profile');
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false);

  const isContentActive =
    pathname?.includes(APP_ROUTES.CONVERSATIONS.INDEX + "/") ||
    pathname?.includes(APP_ROUTES.WORKSPACES.CHANNELS_PATH + "/") ||
    pathname?.includes("/workspaces/") ||
    pathname?.startsWith(APP_ROUTES.SETTINGS.INDEX + "/");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
      if (window.innerWidth >= 1024) {
        setRightPanelOpen(true);
      }
    });

    if ("serviceWorker" in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE' && event.data.url) {
          try {
            router.push(event.data.url);
          } catch (err) {
            console.error("Failed to parse navigation URL:", err);
          }
        }
      };
      navigator.serviceWorker.addEventListener("message", handleMessage);
      return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
    }
  }, [router]);

  // Close right panel on Escape key
  useEffect(() => {
    if (!rightPanelOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Don't close if user is actively editing (e.g., editing a message, searching)
        // Let the child handler (MessageInput, search popover, etc.) handle it first
        const target = e.target as HTMLElement;
        if (target.closest('[contenteditable="true"], input:not([type="checkbox"]):not([type="radio"]), textarea')) return;
        setRightPanelOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [rightPanelOpen, setRightPanelOpen]);

  const isChannel = mounted ? (headerInfo?.isChannel ?? false) : false;
  const isConversation = mounted ? (isChannel || !!headerInfo?.otherMember) : false;

  const inviteModal = useInviteModalContext();
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  const openSettings = (view: 'profile' | 'appearance' | 'notifications' | 'account') => {
    setSettingsView(view);
    setSettingsOpen(true);
  };

  const toggleRightPanel = (view: RightPanelView) => {
    if (rightPanelOpen && rightPanelView === view) {
      setRightPanelOpen(false);
    } else {
      setRightPanelView(view);
      setRightPanelOpen(true);
    }
  };

  if (pathname?.startsWith('/onboarding')) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      { }
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      { }
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
          <Sidebar
            onNavigate={closeMobileSidebar}
            onOpenWorkspaceSettings={() => setWorkspaceSettingsOpen(true)}
            openSettings={openSettings}
          />
        </div>
      </div>

      <main className={cn("flex-1 flex-row min-w-0 bg-background h-full", !isContentActive ? "hidden lg:flex" : "flex")}>
        <div className="flex-1 flex flex-col min-w-0 h-full">
          { }
          <div className="h-14 border-b flex items-center justify-between px-[15px] md:px-4 xl:px-6 shrink-0 bg-background">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              { }
              {mounted && headerInfo && (
                <button
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                  className="lg:hidden relative p-2 -ml-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Toggle sidebar"
                >
                  <ArrowLeft className="h-5 w-5" />
                  {headerInfo.totalUnreadCount > 0 && (
                    <span className="absolute bottom-0 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-bold text-destructive-foreground shadow-sm ring-2 ring-background">
                      {headerInfo.totalUnreadCount > 99 ? '99+' : headerInfo.totalUnreadCount}
                    </span>
                  )}
                </button>
              )}

              { }
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

            { }
            <div className="flex items-center gap-2 shrink-0">
              {mounted && isChannel && headerInfo?.workspaceId && (
                <MemberCountBadge workspaceId={headerInfo.workspaceId} />
              )}
              <MessageSearchPopover />
              <div className="relative">
                <BellPopover />
              </div>
              {mounted && isConversation && (
                <>
                  <div className="relative">
                    <button
                      onClick={() => toggleRightPanel('pins')}
                      className={cn(
                        "p-2 rounded-md transition-colors relative",
                        rightPanelOpen && rightPanelView === 'pins'
                          ? "bg-brand/10 text-brand"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      title="Pinned Messages"
                    >
                      <Pin className="h-5 w-5" />
                      {rightPanelOpen && rightPanelView === 'pins' && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-brand">
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                            <path d="M5 0L10 6H0L5 0Z" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                  {/* Threads — show for channels */}
                  {isChannel && (
                    <div className="relative">
                      <button
                        onClick={() => toggleRightPanel('threads')}
                        className={cn(
                          "p-2 rounded-md transition-colors relative",
                          rightPanelOpen && (rightPanelView === 'threads' || rightPanelView === 'thread')
                            ? "bg-brand/10 text-brand"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        title="Threads"
                      >
                        <ThreadIcon className="h-5 w-5" />
                        {rightPanelOpen && (rightPanelView === 'threads' || rightPanelView === 'thread') && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-brand">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                              <path d="M5 0L10 6H0L5 0Z" />
                            </svg>
                          </div>
                        )}
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => toggleRightPanel('about')}
                      className={cn(
                        "p-2 rounded-md transition-colors relative",
                        rightPanelOpen && rightPanelView === 'about'
                          ? "bg-brand/10 text-brand"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      title={isChannel ? "Channel Info" : "User Profile"}
                    >
                      <Info className="h-5 w-5" />
                      {rightPanelOpen && rightPanelView === 'about' && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-brand">
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                            <path d="M5 0L10 6H0L5 0Z" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          { }
          <div className="flex-1 min-h-0 flex justify-center">
            <LayoutUIContext.Provider value={{
              rightPanelOpen,
              rightPanelView,
              setRightPanelView,
              closeRightPanel: () => setRightPanelOpen(false),
              setRightPanelOpen,
              closeMobileSidebar,
            }}>
              {children}
            </LayoutUIContext.Provider>
          </div>
        </div>

        {/* Portal Target for RightPanel — always mounted, width animated */}
        <div
          id="right-panel-portal-target"
          className={cn(
            "hidden md:flex flex-col h-full shrink-0 bg-background transition-all duration-200 ease-in-out",
            rightPanelOpen && isConversation ? "border-l" : ""
          )}
          style={{
            width: rightPanelOpen && isConversation ? 'var(--right-panel-width, 320px)' : '0px',
            minWidth: rightPanelOpen && isConversation ? '280px' : '0px',
            overflow: rightPanelOpen && isConversation ? undefined : 'hidden',
          }}
        />
      </main>

      { }
      <InviteModal isOpen={inviteModal.isOpen} onClose={inviteModal.close} type={inviteModal.type} entityId={inviteModal.entityId} />
      <SharedSettingsModal
        isOpen={settingsOpen}
        currentTab={settingsView}
        setTab={setSettingsView}
        closeSettings={() => setSettingsOpen(false)}
      />
      <WorkspaceSettingsModal
        isOpen={workspaceSettingsOpen}
        workspaceId={activeWorkspaceId}
        onClose={() => setWorkspaceSettingsOpen(false)}
      />
    </div>
  );
}
