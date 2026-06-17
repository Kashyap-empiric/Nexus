"use client";

import { useState, useRef } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/shared/components/ui/dialog";
import { useCreateWorkspace } from "../hooks/useWorkspaces";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { uploadWorkspaceIcon } from "@/shared/lib/upload";
import { toast } from "sonner";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace();
  const setMode = useChatStore((state) => state.setMode);
  const setActiveWorkspaceId = useChatStore((state) => state.setActiveWorkspaceId);

  const handleIconSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    if (iconPreview) URL.revokeObjectURL(iconPreview);
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      let iconPath: string | undefined;
      if (iconFile) {
        iconPath = await uploadWorkspaceIcon(slug.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), iconFile);
      }

      const workspace = await createWorkspace({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        iconPath,
      });

      if (iconPreview) URL.revokeObjectURL(iconPreview);
      setName("");
      setSlug("");
      setDescription("");
      setIconFile(null);
      setIconPreview(null);
      onClose();
      setMode("WORKSPACE");
      setActiveWorkspaceId(workspace.slug);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create workspace");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Create a new workspace to collaborate with your team.
          </DialogDescription>
        </DialogHeader>

        <form id="create-workspace-form" onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="workspace-description">Description <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea
                  id="workspace-description"
                  placeholder="What is this workspace about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Icon <span className="text-muted-foreground">(optional)</span></Label>
                <div className="flex items-center gap-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => iconInputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") iconInputRef.current?.click(); }}
                    className="relative h-14 w-14 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors border-muted-foreground/25 shrink-0"
                  >
                    {iconPreview ? (
                      <img src={iconPreview} alt="" className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <Camera className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleIconSelect(file);
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">Workspace Icon</p>
                    <p className="text-xs text-muted-foreground">Square image, max 5MB</p>
                  </div>
                </div>
                {iconFile && (
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    if (iconPreview) URL.revokeObjectURL(iconPreview);
                    setIconFile(null);
                    setIconPreview(null);
                  }}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </DialogBody>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="create-workspace-form" disabled={!name.trim() || isPending}>
            {isPending ? "Creating..." : "Create Workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
