"use client";

import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { InfoPanelView } from "@/shared/components/layout/AppLayoutShell";
import { MemberListPanel } from "@/modules/workspaces/components/MemberListPanel";

interface InfoPanelProps {
  workspaceId?: string;
  view: InfoPanelView;
  setInfoPanelView: (view: InfoPanelView) => void;
  onClose: () => void;
}

export function InfoPanel({ workspaceId, view, setInfoPanelView, onClose }: InfoPanelProps) {
  return (
    <div className="flex flex-col w-80 bg-background shadow-xl border-l h-full shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h2 className="font-semibold text-lg text-foreground">Details</h2>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex px-4 border-b shrink-0">
        <button
          onClick={() => setInfoPanelView('about')}
          className={cn(
            "flex-1 pb-2 pt-3 text-sm font-medium text-center border-b-2 transition-colors",
            view === 'about' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          About
        </button>
        <button
          onClick={() => setInfoPanelView('members')}
          className={cn(
            "flex-1 pb-2 pt-3 text-sm font-medium text-center border-b-2 transition-colors",
            view === 'members' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Members
        </button>
        <button
          onClick={() => setInfoPanelView('pins')}
          className={cn(
            "flex-1 pb-2 pt-3 text-sm font-medium text-center border-b-2 transition-colors",
            view === 'pins' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Pins
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {view === 'about' && (
          <div className="p-4 text-sm text-muted-foreground">
            No description available.
          </div>
        )}
        
        {view === 'members' && workspaceId && (
          <MemberListPanel workspaceId={workspaceId} />
        )}
        
        {view === 'members' && !workspaceId && (
          <div className="p-4 text-sm text-muted-foreground text-center mt-4">
            Members not available.
          </div>
        )}

        {view === 'pins' && (
          <div className="p-4 text-sm text-muted-foreground text-center mt-4">
            No pinned items yet.
          </div>
        )}
      </div>
    </div>
  );
}
