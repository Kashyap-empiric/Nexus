"use client";



import { useState, useRef } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/shared/components/ui/dialog";
import { useCreateWorkspace } from "../hooks/useWorkspaces";
import { uploadWorkspaceIcon } from "@/shared/lib/upload";
import { toast } from "sonner";
import { friendlyError } from "@/shared/lib/friendly-error";

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

      await createWorkspace({
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
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      const message = friendlyError(axiosError?.response?.data?.error || error, "Failed to create workspace");
      toast.error(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent size="sm" drawer className="sm:max-h-[90vh]" style={{ maxWidth: '960px' }}>
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Create a new workspace to collaborate with your team.
          </DialogDescription>
        </DialogHeader>

        <form id="create-workspace-form" onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-5">
              {}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <span className="text-muted-foreground bg-muted px-3 py-2 border border-r-0 rounded-l-md text-sm shrink-0">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspace-description">Description <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea
                  id="workspace-description"
                  placeholder="What is this workspace about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label>Icon <span className="text-muted-foreground">(optional)</span></Label>
                <div className="flex items-center gap-4">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => iconInputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") iconInputRef.current?.click(); }}
                    className="relative h-16 w-16 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/50 transition-all border-muted-foreground/25 shrink-0 group"
                  >
                    {iconPreview ? (
                      <Image src={iconPreview} alt="" fill className="rounded-xl object-cover" unoptimized />
                    ) : (
                      <Camera className="h-6 w-6 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
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
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Workspace Icon</p>
                    <p className="text-xs text-muted-foreground">Square image, max 5MB. PNG, JPEG, or WebP.</p>
                  </div>
                  {iconFile && (
                    <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => {
                      if (iconPreview) URL.revokeObjectURL(iconPreview);
                      setIconFile(null);
                      setIconPreview(null);
                    }}>
                      Remove
                    </Button>
                  )}
                </div>
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
