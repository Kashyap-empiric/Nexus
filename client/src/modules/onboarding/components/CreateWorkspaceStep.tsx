

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Loader2, Hash, Camera } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { toast } from "sonner";

interface CreateWorkspaceStepProps {
  onCreate: (data: { workspaceName?: string; workspaceSlug?: string; workspaceDescription?: string; workspaceIconFile?: File | null; skipWorkspace?: boolean }) => void;
  isLoading: boolean;
  initialName?: string;
  defaultFullName: string;
}

export function CreateWorkspaceStep({ onCreate, isLoading, initialName, defaultFullName }: CreateWorkspaceStepProps) {
  const [workspaceName, setWorkspaceName] = useState(initialName || (defaultFullName ? `${defaultFullName}'s Workspace` : ""));
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [description, setDescription] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  
  useEffect(() => {
    if (!slugEdited) {
      const generatedSlug = workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      requestAnimationFrame(() => {
        setWorkspaceSlug(generatedSlug);
      });
    }
    
  }, [workspaceName, slugEdited]);
  

  const handleIconSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    if (iconPreview) URL.revokeObjectURL(iconPreview);
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (workspaceName.trim() && workspaceSlug.trim()) {
      setIsSkipping(false);
      onCreate({ 
        workspaceName: workspaceName.trim(), 
        workspaceSlug: workspaceSlug.trim().toLowerCase(),
        workspaceDescription: description.trim() || undefined,
        workspaceIconFile: iconFile,
      });
    }
  };

  const handleSkip = () => {
    setIsSkipping(true);
    onCreate({ skipWorkspace: true });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8 animate-in fade-in slide-in-from-right-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Create your workspace</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          A workspace is where you and your team collaborate.
        </p>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border/40 shadow-lg rounded-3xl p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspaceName">Workspace Name</Label>
            <Input
              id="workspaceName"
              placeholder="e.g. Acme Corp"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
              className="bg-background/50 focus:bg-background transition-colors"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspaceSlug">Workspace URL</Label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted/50 text-muted-foreground sm:text-sm">
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
                className="rounded-l-none bg-background/50 focus:bg-background transition-colors focus-visible:z-10"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">This will be your workspace&apos;s unique address.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspaceDescription">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="workspaceDescription"
              placeholder="What is this workspace about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none bg-background/50 focus:bg-background transition-colors"
              rows={2}
              disabled={isLoading}
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
                className="relative h-14 w-14 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors border-muted-foreground/25 bg-background/50"
              >
                {iconPreview ? (
                  <Image src={iconPreview} alt="" fill className="rounded-xl object-cover" unoptimized />
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
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Square image, max 5MB</p>
            </div>
            {iconFile && (
              <Button type="button" variant="outline" size="sm" onClick={() => {
                if (iconPreview) URL.revokeObjectURL(iconPreview);
                setIconFile(null);
                setIconPreview(null);
              }} disabled={isLoading}>
                Remove
              </Button>
            )}
          </div>
        </div>
        
        <div className="bg-muted/30 rounded-xl p-4 flex gap-3 items-start border border-border/40">
          <div className="mt-0.5 bg-brand/10 p-1.5 rounded-lg shadow-sm">
            <Hash className="w-4 h-4 text-brand" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We&apos;ll automatically create a <span className="font-medium text-foreground">#general</span> channel for your team to get started.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleSkip}
          disabled={isLoading}
          className="w-full sm:w-1/3 h-11 text-base font-medium shadow-sm hover:bg-muted/50 transition-colors"
        >
          {isLoading && isSkipping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Skipping...
            </>
          ) : (
            "Skip for now"
          )}
        </Button>
        <Button
          type="submit"
          disabled={!workspaceName.trim() || !workspaceSlug.trim() || isLoading}
          className="w-full sm:w-2/3 h-11 text-base font-medium shadow-sm hover:shadow transition-all"
        >
          {isLoading && !isSkipping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Workspace"
          )}
        </Button>
      </div>
    </form>
  );
}
