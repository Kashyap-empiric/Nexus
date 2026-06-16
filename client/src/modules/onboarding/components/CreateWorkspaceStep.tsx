import { useState, useEffect } from "react";
import { Loader2, Hash } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface CreateWorkspaceStepProps {
  onCreate: (data: { workspaceName?: string; workspaceSlug?: string; skipWorkspace?: boolean }) => void;
  isLoading: boolean;
  initialName?: string;
  defaultFullName: string;
}

export function CreateWorkspaceStep({ onCreate, isLoading, initialName, defaultFullName }: CreateWorkspaceStepProps) {
  const [workspaceName, setWorkspaceName] = useState(initialName || (defaultFullName ? `${defaultFullName}'s Workspace` : ""));
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!slugEdited) {
      const generatedSlug = workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setWorkspaceSlug(generatedSlug);
    }
  }, [workspaceName, slugEdited]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (workspaceName.trim() && workspaceSlug.trim()) {
      onCreate({ 
        workspaceName: workspaceName.trim(), 
        workspaceSlug: workspaceSlug.trim().toLowerCase() 
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8 animate-in fade-in slide-in-from-right-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Create your workspace</h2>
        <p className="text-muted-foreground text-sm sm:text-base">A workspace is where you and your team collaborate.</p>
      </div>

      <div className="bg-card border shadow-sm rounded-xl p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspaceName">Workspace Name</Label>
            <Input
              id="workspaceName"
              placeholder="e.g. Acme Corp"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
              className="bg-background"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspaceSlug">Workspace URL</Label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground sm:text-sm">
                nexus.app/
              </span>
              <Input
                id="workspaceSlug"
                placeholder="acme-corp"
                value={workspaceSlug}
                onChange={(e) => {
                  setWorkspaceSlug(e.target.value);
                  setSlugEdited(true);
                }}
                required
                className="rounded-l-none bg-background focus-visible:z-10"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">This will be your workspace's unique address.</p>
          </div>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-4 flex gap-3 items-start border border-border/50">
          <div className="mt-0.5 bg-brand/10 p-1 rounded">
            <Hash className="w-4 h-4 text-brand" />
          </div>
          <p className="text-sm text-muted-foreground">
            We'll automatically create a <span className="font-medium text-foreground">#general</span> channel for your team to get started.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          type="submit"
          disabled={!workspaceName.trim() || !workspaceSlug.trim() || isLoading}
          className="w-full h-11 text-base font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Workspace...
            </>
          ) : (
            "Create Workspace"
          )}
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          disabled={isLoading}
          onClick={() => onCreate({ skipWorkspace: true })}
          className="w-full h-11 text-muted-foreground"
        >
          Skip for now
        </Button>
      </div>
    </form>
  );
}
