import { MessagesSquare, Plus } from "lucide-react";
import { APP_ROUTES } from "@/config/url";
import Link from "next/link";
import { useChatStore } from "../store/chatStore";
import { useWorkspaces } from "@/modules/workspaces/hooks/useWorkspaces";
import { CreateWorkspaceModal } from "@/modules/workspaces/components/CreateWorkspaceModal";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";

export function NavigationRail() {
  const { mode, activeWorkspaceId, setMode, setActiveWorkspaceId } = useChatStore();
  const { data: workspaces = [] } = useWorkspaces();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <aside className="w-[60px] border-r flex flex-col items-center shrink-0 bg-background dark:bg-zinc-950 py-3 gap-3 overflow-y-auto hide-scrollbar">
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

        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            onClick={() => {
              setMode("WORKSPACE");
              setActiveWorkspaceId(workspace.slug);
            }}
            title={workspace.name}
            className={cn(
              "w-[40px] h-[40px] rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center transition-all duration-200 hover:rounded-xl font-semibold text-lg overflow-hidden relative",
              mode === "WORKSPACE" && activeWorkspaceId === workspace.slug
                ? "bg-primary text-primary-foreground rounded-xl"
                : "text-foreground"
            )}
          >
            {workspace.imageUrl ? (
              <img src={workspace.imageUrl} alt={workspace.name} className="w-full h-full object-cover" />
            ) : (
              workspace.name.substring(0, 2).toUpperCase()
            )}
            
            {mode === "WORKSPACE" && activeWorkspaceId === workspace.slug && (
              <div className="absolute -left-1 w-2 h-10 bg-primary rounded-r-md" />
            )}
          </button>
        ))}

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-[40px] h-[40px] rounded-2xl border border-dashed border-border text-muted-foreground flex items-center justify-center transition-all duration-200 hover:rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Create Workspace"
        >
          <Plus size={20} />
        </button>
      </aside>

      <CreateWorkspaceModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </>
  );
}
