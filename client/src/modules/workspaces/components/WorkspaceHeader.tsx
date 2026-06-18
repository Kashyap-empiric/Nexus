"use client";

import React from "react";
import type { Workspace } from "../types/workspace";
import { ChevronDown, UserPlus, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface WorkspaceHeaderProps {
  workspace: Workspace;
  onInviteClick?: () => void;
  onSettingsClick?: () => void;
  rightElement?: React.ReactNode;
}

export function WorkspaceHeader({ workspace, onInviteClick, onSettingsClick, rightElement }: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center h-14 border-b bg-sidebar z-10 sticky top-0 shrink-0 w-full">
      <div className="flex-1 h-full min-w-0">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full h-full items-center justify-between px-4 font-semibold text-lg hover:bg-accent/60 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-0 touch-manipulation">
            <span className="truncate">{workspace.name}</span>
            <div className="flex items-center justify-center w-6 h-6 rounded-md shrink-0 ml-2">
              <ChevronDown className="h-4 w-4 shrink-0 text-foreground opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem
              onClick={() => onSettingsClick?.()}
              className="gap-2 cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              Workspace Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onInviteClick?.()}
              className="gap-2 cursor-pointer text-brand focus:text-brand"
            >
              <UserPlus className="h-4 w-4" />
              Invite People
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {rightElement && (
        <div className="shrink-0 flex items-center pr-2">
          {rightElement}
        </div>
      )}
    </div>
  );
}
