"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/modules/conversations/components/Sidebar";
import { NavigationRail } from "@/modules/chat/components/NavigationRail";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { BellPopover } from "@/modules/notifications/components/BellPopover";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { cn } from "@/shared/lib/utils";
import { Menu, Hash, Users, X, ArrowLeft } from "lucide-react";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
import Link from "next/link";
import { APP_ROUTES } from "@/config/url";

export function AppLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const headerInfo = useChatStore((state) => state.headerInfo);
  const setMemberPanelOpen = useChatStore((state) => state.setMemberPanelOpen);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Consider conversation active if we are deep in a conversation or channel route
  const isConversationActive = 
    pathname?.includes("/conversations/") || 
    pathname?.includes("/channels/");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isChannel = mounted ? (headerInfo?.isChannel ?? false) : false;
  const memberPanelOpen = mounted ? (headerInfo?.memberPanelOpen ?? false) : false;

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-transparent md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar area — toggled by button on mobile */}
      <div className={cn(
        "shrink-0 flex transition-transform duration-300 ease-in-out",
        isConversationActive
          ? "fixed inset-y-0 left-0 z-50 w-screen bg-background md:w-auto md:relative md:z-auto" +
            (mobileSidebarOpen ? " translate-x-0" : " -translate-x-full md:translate-x-0")
          : "relative w-full md:w-auto"
      )}>
        <NavigationRail />
        <div className={cn(
          "flex-1 md:flex-initial",
          isConversationActive ? "flex" : "flex flex-1 min-w-0 md:w-auto"
        )}>
          <Sidebar onNavigate={closeMobileSidebar} />
        </div>
      </div>

      <main className={cn("flex-1 flex-col min-w-0 bg-background h-full", !isConversationActive ? "hidden md:flex" : "flex")}>
        {/* Global header bar */}
        <div className="h-14 border-b flex items-center justify-between px-[15px] md:px-4 shrink-0 bg-background shadow-sm">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            {/* Back/Sidebar toggle (mobile only) */}
            {mounted && headerInfo && (
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="md:hidden relative p-2 -ml-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
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
                <div className="flex flex-col min-w-0">
                  <h2 className="text-base font-bold text-foreground leading-none truncate">{headerInfo.title}</h2>
                  {headerInfo.subtitle && (
                    <span className="text-[12px] text-muted-foreground leading-tight truncate">
                      {headerInfo.subtitle}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
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
                <h2 className="text-base font-bold text-foreground leading-none truncate">{headerInfo.title}</h2>
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <BellPopover />
            </div>
            {mounted && isChannel && (
              <button
                onClick={() => setMemberPanelOpen(!memberPanelOpen)}
                className={`p-2 rounded-md transition-colors ${memberPanelOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"} md:hidden`}
                title="Toggle Member List"
              >
                <Users className="h-5 w-5" />
              </button>
            )}
            {mounted && isChannel && (
              <button
                onClick={() => setMemberPanelOpen(!memberPanelOpen)}
                className={`p-2 rounded-md transition-colors ${memberPanelOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"} hidden md:block`}
                title="Toggle Member List"
              >
                <Users className="h-5 w-5" />
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}
