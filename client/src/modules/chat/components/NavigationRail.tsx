import { MessagesSquare, Plus, Settings } from "lucide-react";
import { APP_ROUTES } from "@/config/url";
import Link from "next/link";
import { useChatStore } from "../store/chatStore";
import { useWorkspaces } from "@/modules/workspaces/hooks/useWorkspaces";
import { CreateWorkspaceModal } from "@/modules/workspaces/components/CreateWorkspaceModal";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";

interface NavigationRailProps {
  openSettings: (view: 'profile' | 'appearance') => void;
}

export function NavigationRail({ openSettings }: NavigationRailProps) {
  const { mode, activeWorkspaceId, setMode, setActiveWorkspaceId } = useChatStore();
  const { data: workspaces = [] } = useWorkspaces();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <aside className="w-[60px] border-r flex flex-col items-center justify-between shrink-0 bg-background dark:bg-zinc-950 py-3 gap-3 overflow-y-auto hide-scrollbar">
        <div className="flex flex-col items-center gap-3 w-full">
          <Link
            href={APP_ROUTES.CONVERSATIONS.INDEX}
            className={cn(
              "w-[40px] h-[40px] rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-200 hover:rounded-xl",
              mode === "DM" ? "bg-primary text-primary-foreground rounded-xl" : ""
            )}
            title="Direct Messages"
            onClick={() => {
              setMode("DM");
              setActiveWorkspaceId(null);
            }}
          >
            <MessagesSquare size={20} />
          </Link>

          <div className="w-8 h-[2px] bg-border rounded-full shrink-0" />

        {workspaces.map((workspace) => {
          const unreadCount = workspace.unreadCount || 0;
          const isActive = mode === "WORKSPACE" && activeWorkspaceId === workspace.slug;
          
          return (
            <button
              key={workspace.id}
              onClick={() => {
                setMode("WORKSPACE");
                setActiveWorkspaceId(workspace.slug);
              }}
              title={workspace.name}
              className={cn(
                "w-[40px] h-[40px] rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center transition-all duration-200 hover:rounded-xl font-semibold text-lg overflow-hidden relative",
                isActive
                  ? "bg-primary text-primary-foreground rounded-xl"
                  : "text-foreground"
              )}
            >
              {workspace.imageUrl ? (
                <img src={workspace.imageUrl} alt={workspace.name} className="w-full h-full object-cover" />
              ) : (
                workspace.name.substring(0, 2).toUpperCase()
              )}
              
              {isActive && (
                <div className="absolute -left-1 w-2 h-10 bg-primary rounded-r-md" />
              )}

              {unreadCount > 0 && !isActive && (
                <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none border-2 border-background">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </button>
          );
        })}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-[40px] h-[40px] rounded-2xl border border-dashed border-border text-muted-foreground flex items-center justify-center transition-all duration-200 hover:rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Create Workspace"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="mt-auto">
          <button
            onClick={() => openSettings('profile')}
            className="w-[40px] h-[40px] rounded-2xl text-muted-foreground flex items-center justify-center transition-all duration-200 hover:rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
