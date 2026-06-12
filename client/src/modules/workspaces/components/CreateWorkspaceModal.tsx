"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useCreateWorkspace } from "../hooks/useWorkspaces";
import { useChatStore } from "@/modules/chat/store/chatStore";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { mutate: createWorkspace, isPending } = useCreateWorkspace();
  const setMode = useChatStore((state) => state.setMode);
  const setActiveWorkspaceId = useChatStore((state) => state.setActiveWorkspaceId);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createWorkspace(
      { name: name.trim(), slug: slug.trim() },
      {
        onSuccess: (workspace) => {
          setName("");
          setSlug("");
          onClose();
          setMode("WORKSPACE");
          setActiveWorkspaceId(workspace.slug);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border shadow-lg rounded-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Workspace</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Create a new workspace to collaborate with your team.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g. Acme Corp"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
                  }
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-slug">Workspace URL</Label>
              <div className="flex items-center">
                <span className="text-muted-foreground bg-muted px-3 py-2 border border-r-0 rounded-l-md text-sm">
                  nexus.app/
                </span>
                <Input
                  id="workspace-slug"
                  placeholder="e.g. acme-corp"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ""))}
                  className="rounded-l-none"
                  maxLength={50}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t mt-6">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isPending}>
                {isPending ? "Creating..." : "Create Workspace"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
