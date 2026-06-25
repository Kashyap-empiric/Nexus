

import { MessagesSquare, Plus, Settings } from "lucide-react";
import { APP_ROUTES } from "@/config/url";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRouteState } from "@/shared/hooks/useRouteState";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { useWorkspaces } from "@/modules/workspaces/hooks/useWorkspaces";
import { useConversationsQuery } from "@/modules/conversations/hooks/useConversations";
import { CreateWorkspaceModal } from "@/modules/workspaces/components/CreateWorkspaceModal";
import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";
import { getPublicUrl } from "@/shared/lib/upload";
import { fetchWorkspaceChannels } from "@/modules/workspaces/api/workspaces.api";
import type { Workspace } from "@/modules/workspaces/types/workspace";

interface NavigationRailProps {
  openSettings: (view: 'profile' | 'appearance') => void;
}

export function NavigationRail({ openSettings }: NavigationRailProps) {
  const router = useRouter();
  const { mode, activeWorkspaceId } = useRouteState();
  const lastVisitedChannels = useChatStore((state) => state.lastVisitedChannels);
  const { data: workspaces = [] } = useWorkspaces();
  const { data: conversations = [] } = useConversationsQuery();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigatingRef = useRef(false);

  const handleWorkspaceClick = useCallback(async (workspace: Workspace) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;

    try {
      const savedChannelId = lastVisitedChannels[workspace.slug];
      if (savedChannelId) {
        router.push(`/workspaces/${workspace.slug}/channels/${savedChannelId}`);
        return;
      }

      const channels = await fetchWorkspaceChannels(workspace.slug);
      const targetChannel = channels.find((c) => c.name === "general") || channels[0];
      if (targetChannel) {
        router.push(`/workspaces/${workspace.slug}/channels/${targetChannel.id}`);
        return;
      }

      // Fallback to DM view if no channels found
      router.push(APP_ROUTES.CONVERSATIONS.INDEX);
    } catch (err) {
      console.warn("[NavigationRail] Failed to navigate to workspace:", err);
      router.push(APP_ROUTES.CONVERSATIONS.INDEX);
    } finally {
      navigatingRef.current = false;
    }
  }, [lastVisitedChannels, router]);

  const dmConversations = conversations.filter(c => c.type === "DM");
  const dmUnreadCount = dmConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const latestDm = [...dmConversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const dmHref = latestDm ? `/conversations/${latestDm.id}` : APP_ROUTES.CONVERSATIONS.INDEX;

  return (
    <>
      <aside className="w-[60px] border-r flex flex-col items-center justify-between shrink-0 bg-workspace-rail py-3 gap-3 overflow-y-auto hide-scrollbar">
        <div className="flex flex-col items-center gap-3 w-full">
          <Link
            href={dmHref}
            className={cn(
              "relative w-[40px] h-[40px] rounded-2xl bg-muted text-muted-foreground flex items-center justify-center transition-all duration-200 hover:rounded-xl hover:bg-accent hover:text-accent-foreground",
              mode === "DM" ? "bg-brand text-brand-foreground rounded-xl shadow-sm" : ""
            )}
            title="Direct Messages"
            onClick={() => { }}
          >
            <MessagesSquare size={20} />
            {dmUnreadCount > 0 && mode !== "DM" && (
              <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-[10px] font-bold leading-none border-2 border-workspace-rail shadow-sm z-10 pointer-events-none" style={{ color: '#ffffff' }}>
                {dmUnreadCount > 99 ? '99+' : dmUnreadCount}
              </div>
            )}
          </Link>

          <div className="w-8 h-[2px] bg-border rounded-full shrink-0" />

          {workspaces.map((workspace) => {
            const unreadCount = workspace.unreadCount || 0;
            const isActive = mode === "WORKSPACE" && activeWorkspaceId === workspace.slug;

            return (
              <button
                key={workspace.id}
                onClick={() => handleWorkspaceClick(workspace)}
                title={workspace.name}
                className={cn(
                  "w-[40px] h-[40px] rounded-2xl bg-muted text-muted-foreground flex items-center justify-center transition-all duration-200 hover:rounded-xl hover:bg-accent hover:text-accent-foreground font-semibold text-lg relative",
                  isActive
                    ? "bg-brand text-brand-foreground rounded-xl shadow-sm"
                    : ""
                )}
              >
                {workspace.iconPath ? (
                  <Image src={getPublicUrl("avatars", workspace.iconPath) || ""} alt={workspace.name} fill className="object-cover rounded-[inherit]" sizes="40px" />
                ) : workspace.imageUrl ? (
                  <Image src={workspace.imageUrl} alt={workspace.name} fill className="object-cover rounded-[inherit]" sizes="40px" />
                ) : (
                  workspace.name.substring(0, 2).toUpperCase()
                )}

                {isActive && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-brand rounded-r-full" />
                )}

                {unreadCount > 0 && !isActive && (
                  <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-[10px] font-bold leading-none border-2 border-workspace-rail shadow-sm z-10" style={{ color: '#ffffff' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </button>
            );
          })}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-[40px] h-[40px] rounded-2xl border border-dashed border-border text-muted-foreground flex items-center justify-center transition-all duration-200 hover:rounded-xl hover:bg-accent hover:text-accent-foreground hover:border-transparent"
            title="Create Workspace"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="mt-auto">
          <button
            onClick={() => openSettings('profile')}
            className="w-[40px] h-[40px] rounded-2xl text-muted-foreground flex items-center justify-center transition-all duration-200 hover:rounded-xl hover:bg-accent hover:text-accent-foreground"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </aside>

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
