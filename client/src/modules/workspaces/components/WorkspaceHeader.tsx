"use client";

import React, { useState } from "react";
import type { Workspace } from "../types/workspace";
import { ChevronDown, UserPlus, Settings } from "lucide-react";

interface WorkspaceHeaderProps {
  workspace: Workspace;
  onInviteClick?: () => void;
  onSettingsClick?: () => void;
  rightElement?: React.ReactNode;
}

export function WorkspaceHeader({ workspace, onInviteClick, onSettingsClick, rightElement }: WorkspaceHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTriggerClick = () => {
    setIsOpen((prev) => !prev);
  };

  const handleBackdropClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="flex items-center h-14 border-b shadow-sm bg-background z-10 sticky top-0 shrink-0 w-full">
      <div className="flex-1 h-full relative">
        <button
          type="button"
          onClick={handleTriggerClick}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          className="flex w-full h-full items-center justify-between px-4 font-semibold text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-0 touch-manipulation"
        >
          <span className="truncate">{workspace.name}</span>
          <div className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0 ml-2">
            <ChevronDown className={`h-4 w-4 shrink-0 text-foreground opacity-70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 w-56 z-50 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSettingsClick?.();
              }}
              className="flex w-full items-center gap-1.5 rounded-md px-2 h-9 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <Settings className="h-4 w-4 mr-2" />
              Workspace Settings
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onInviteClick?.();
              }}
              className="flex w-full items-center gap-1.5 rounded-md px-2 h-9 text-sm cursor-pointer text-brand hover:bg-brand/10 hover:text-brand transition-colors [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite People
            </button>
          </div>
        )}

        {/* Backdrop covers whole screen when menu is open — taps on it close the menu */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={handleBackdropClick}
          // onPointerDown={handleBackdropClick}
          />
        )}
      </div>
      {rightElement && (
        <div className="shrink-0 flex items-center pr-2">
          {rightElement}
        </div>
      )}
    </div>
  );
}
