"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { RightPanelView, useLayoutUI } from "@/shared/components/layout/AppLayoutShell";
import { PinnedMessagesPanel } from "@/modules/messages/components/PinnedMessagesPanel";
import { ThreadPanel } from "@/modules/threads/components/ThreadPanel";
import { ChannelThreadsBrowser } from "@/modules/threads/components/ChannelThreadsBrowser";
import { AboutPanel } from "./AboutPanel";
import { useUser } from "@/modules/auth/store/useAuthStore";
import type { User } from "@/modules/conversations/types/conversation";

interface RightPanelProps {
  conversationId: string;
  workspaceId?: string;
  channelId?: string;
  userId?: string;
  channelName?: string | null;
  description?: string | null;
  visibility?: "PUBLIC" | "PRIVATE" | null;
  createdAt?: string;
  view: RightPanelView;
  onClose: () => void;
}

export function RightPanel(props: RightPanelProps) {
  const { view, onClose, conversationId, workspaceId, channelId, userId, channelName, description, visibility, createdAt } = props;
  const isDM = !!userId;
  const currentUser = useUser();
  const { setRightPanelView } = useLayoutUI();

  const panelWidthRef = useRef(320);
  const isResizing = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('nexus-right-panel-width');
    if (saved) {
      panelWidthRef.current = parseInt(saved, 10);
      document.documentElement.style.setProperty('--right-panel-width', `${panelWidthRef.current}px`);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 280 && newWidth < 800) {
        panelWidthRef.current = newWidth;
        document.documentElement.style.setProperty('--right-panel-width', `${newWidth}px`);
      }
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        document.getElementById('right-panel-portal-target')?.style.removeProperty('transition');
        localStorage.setItem('nexus-right-panel-width', panelWidthRef.current.toString());
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  type NonNullView = Exclude<RightPanelView, null>;
  const PANEL_VIEWS: Record<NonNullView, React.ElementType> = {
    about: AboutPanel,
    pins: PinnedMessagesPanel,
    threads: ChannelThreadsBrowser,
    thread: ThreadPanel,
  };

  const Component = view ? PANEL_VIEWS[view] : null;

  const getComponentProps = () => {
    if (view === 'about') {
      return { isDM, userId, channelName, description, visibility, createdAt, workspaceId, channelId };
    }
    if (view === 'pins') {
      return { conversationId };
    }
    if (view === 'threads') {
      return { conversationId, setRightPanelView, onOpenThread: undefined };
    }
    if (view === 'thread') {
      return {
        conversationId,
        currentUser: (currentUser as unknown) as User | undefined,
        // Clicking back in thread panel goes to the threads browser, not close
        onBack: () => setRightPanelView('threads'),
      };
    }
    return {};
  };

  const getHeaderTitle = () => {
    switch (view) {
      case 'about': return isDM ? 'Profile' : 'Channel Info';
      case 'pins': return 'Pinned Messages';
      case 'threads': return 'Threads';
      default: return 'Details';
    }
  };

  return (
    <div
      className="flex flex-col bg-details-panel shadow-xl h-full shrink-0 relative w-full"
    >
      {/* Resize handle — desktop only */}
      <div
        className="hidden md:block absolute left-0 top-0 bottom-0 w-1.5 -ml-[0.75px] cursor-col-resize hover:bg-brand z-50 transition-colors"
        onMouseDown={() => {
          isResizing.current = true;
          document.body.style.cursor = 'col-resize';
          document.getElementById('right-panel-portal-target')?.style.setProperty('transition', 'none', 'important');
        }}
      />

      {/* Header — hidden for thread detail (has its own header with back button) */}
      {view && view !== 'thread' && (
        <div className="h-14 flex items-center justify-between px-4 border-b shrink-0 bg-details-panel">
          <h2 className="text-base font-bold text-foreground leading-none truncate pr-2">{getHeaderTitle()}</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-md hover:bg-muted text-muted-foreground transition-colors shrink-0"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {Component ? <Component {...getComponentProps()} /> : null}
      </div>
    </div>
  );
}
