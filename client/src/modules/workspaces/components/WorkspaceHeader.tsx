import React from "react";
import type { Workspace } from "../types/workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ChevronDown, UserPlus } from "lucide-react";
import { useInviteModal } from "@/modules/invites/hooks/useInviteModal";

interface WorkspaceHeaderProps {
  workspace: Workspace;
  onInviteClick?: () => void;
  rightElement?: React.ReactNode;
}

export function WorkspaceHeader({ workspace, onInviteClick, rightElement }: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center h-14 border-b shadow-sm bg-background z-10 sticky top-0 shrink-0 w-full">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex-1 h-full flex items-center justify-between px-4 font-semibold text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group min-w-0">
          <span className="truncate">{workspace.name}</span>
          <div className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0 ml-2">
            <ChevronDown className="h-4 w-4 shrink-0 text-foreground opacity-70 group-hover:opacity-100" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuItem
          onClick={onInviteClick}
          className="text-primary focus:text-primary focus:bg-primary/10 cursor-pointer"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite People
        </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {rightElement && (
        <div className="shrink-0 flex items-center pr-2">
          {rightElement}
        </div>
      )}
    </div>
  );
}
