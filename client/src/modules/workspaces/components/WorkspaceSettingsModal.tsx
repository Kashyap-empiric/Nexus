"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogHeader } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogHeader, AlertDialogFooter, AlertDialogMedia } from "@/shared/components/ui/alert-dialog";
import { useWorkspaceDetails, useWorkspaceMembersQuery, useUpdateWorkspaceMutation, useDeleteWorkspaceMutation, useLeaveWorkspaceMutation, useUpdateMemberRole, useRemoveMember } from "../hooks/useWorkspaces";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useParams, useRouter } from "next/navigation";
import { Camera, ArrowLeftFromLine, Trash, Shield, ShieldCheck, User as UserIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { WorkspaceRole, WorkspaceMember } from "../types/workspace";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { uploadWorkspaceIcon, getPublicUrl, deleteFile } from "@/shared/lib/upload";
import { CustomRoleDropdown, ROLE_BADGE_STYLES } from "./CustomRoleDropdown";

const workspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

const ROLE_ICONS: Record<WorkspaceRole, typeof Shield> = {
  OWNER: ShieldCheck,
  ADMIN: Shield,
  MEMBER: UserIcon,
};

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  workspaceId: string | null;
  onClose: () => void;
}

export function WorkspaceSettingsModal({ isOpen, workspaceId, onClose }: WorkspaceSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "members">("general");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const { data: workspaceData, isLoading: workspaceLoading } = useWorkspaceDetails(workspaceId);
  const { data: members, isLoading: membersLoading } = useWorkspaceMembersQuery(workspaceId);
  const { mutateAsync: updateWorkspace, isPending: isUpdating } = useUpdateWorkspaceMutation();
  const { mutateAsync: deleteWorkspace, isPending: isDeleting } = useDeleteWorkspaceMutation();
  const { mutateAsync: leaveWorkspace, isPending: isLeaving } = useLeaveWorkspaceMutation();
  const { mutateAsync: updateRole } = useUpdateMemberRole();
  const { mutateAsync: removeMember } = useRemoveMember();

  const workspace = workspaceData?.workspace;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  useEffect(() => {
    if (workspace) {
      reset({
        name: workspace.name || "",
        slug: workspace.slug || "",
        description: workspace.description || "",
      });
    }
  }, [workspace, reset]);

  const onSubmit = async (data: WorkspaceFormValues) => {
    if (!workspaceId) return;
    try {
      setIsUploadingIcon(true);

      if (iconFile) {
        const newIconPath = await uploadWorkspaceIcon(workspaceId, iconFile);
        await updateWorkspace({ workspaceId, iconPath: newIconPath, ...data });
        if (workspace?.iconPath) {
          await deleteFile("avatars", workspace.iconPath);
        }
      } else {
        await updateWorkspace({ workspaceId, ...data });
      }

      if (iconPreview) URL.revokeObjectURL(iconPreview);
      setIconFile(null);
      setIconPreview(null);

      reset(data);

      if (data.slug && data.slug !== workspace?.slug) {
        setActiveWorkspaceId(data.slug);
        const channelId = params?.channelId as string | undefined;
        if (channelId) {
          router.push(`/workspaces/${data.slug}/channels/${channelId}`);
        } else {
          router.push(`/workspaces/${data.slug}`);
        }
      }

      toast.success("Workspace updated");
    } catch (error: unknown) {
      if (getErrorMessage(error, "").includes("Slug already taken")) {
        toast.error("Slug is already taken. Please choose another one.");
      } else {
        toast.error(getErrorMessage(error, "Failed to update workspace"));
      }
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleDelete = async () => {
    if (!workspaceId) return;
    try {
      await deleteWorkspace({ workspaceId });
      toast.success("Workspace deleted");
      onClose();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete workspace"));
    }
  };

  const handleLeave = async () => {
    if (!workspaceId) return;
    try {
      await leaveWorkspace({ workspaceId });
      toast.success("Left workspace");
      onClose();
      setActiveWorkspaceId(null);
      useChatStore.getState().setMode("DM");
      router.push("/conversations");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to leave workspace"));
    }
  };

  const [pendingOwnerPromotion, setPendingOwnerPromotion] = useState<{ userId: string; username: string } | null>(null);

  const handleRoleChange = async (userId: string, role: WorkspaceRole) => {
    if (!workspaceId) return;
    try {
      await updateRole({ workspaceId, userId, role });
      toast.success("Role updated");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update role"));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspaceId) return;
    try {
      await removeMember({ workspaceId, userId });
      toast.success("Member removed");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to remove member"));
    }
  };

  const authUser = useUser();
  const currentUser = (members || []).find((m: WorkspaceMember) => m.userId === authUser?.id);
  const setActiveWorkspaceId = useChatStore((state) => state.setActiveWorkspaceId);
  const params = useParams();
  const router = useRouter();
  const isSlugManuallyEdited = useRef(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const handleIconSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    if (iconPreview) URL.revokeObjectURL(iconPreview);
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && isDirty) {
      if (window.confirm("You have unsaved changes. Discard them?")) {
        onClose();
      }
      return;
    }
    if (!open) onClose();
  };

  function getErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === "object" && "response" in error) {
      const resp = (error as { response?: { data?: { error?: string } } }).response;
      return resp?.data?.error || fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent fullscreenMobile size="2xl" style={{ maxWidth: '1200px' }} className="sm:h-[80vh] p-0 bg-background">
        <DialogHeader className="sr-only">
          <DialogTitle>Workspace Settings</DialogTitle>
          <DialogDescription>Manage workspace settings</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-full sm:w-48 bg-muted/10 sm:bg-muted/30 border-r border-border p-4 flex sm:flex-col gap-1 shrink-0">
            <button onClick={() => setActiveTab("general")} className={cn("text-left px-3 py-2 rounded-md text-sm font-medium transition-colors", activeTab === "general" ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
              General
            </button>
            <button onClick={() => setActiveTab("members")} className={cn("text-left px-3 py-2 rounded-md text-sm font-medium transition-colors", activeTab === "members" ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
              Members
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {workspaceLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-8 w-1/3 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
              </div>
            ) : activeTab === "general" ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <p className="text-xs text-muted-foreground">
                  Preview: <span className="font-medium text-foreground">{watch("name") || "Untitled"}</span>
                </p>

                {/* Icon Upload */}
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-3">BRANDING</p>
                  <hr className="border-border mb-4" />
                  <div className="flex items-center gap-4">
                    <div
                      role="button"
                      tabIndex={0}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleIconSelect(file);
                      }}
                      onClick={() => iconInputRef.current?.click()}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") iconInputRef.current?.click(); }}
                      className={cn(
                        "relative h-20 w-20 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors",
                        isDragOver ? "border-brand bg-brand/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
                      )}
                    >
                      {iconPreview ? (
                        <img src={iconPreview} alt="" className="h-full w-full rounded-xl object-cover" />
                      ) : workspace?.iconPath ? (
                        <img src={getPublicUrl("avatars", workspace.iconPath) || ""} alt="" className="h-full w-full rounded-xl object-cover" />
                      ) : workspace?.imageUrl ? (
                        <img src={workspace.imageUrl} alt="" className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        <Camera className="h-6 w-6 text-muted-foreground/50" />
                      )}
                    </div>
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleIconSelect(file); }}
                    />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Workspace Icon</p>
                      <p className="text-xs text-muted-foreground">Square image, at least 256×256px. Max 5MB.</p>
                      {iconFile && (
                        <Button type="button" variant="outline" size="sm" onClick={() => { if (iconPreview) URL.revokeObjectURL(iconPreview); setIconFile(null); setIconPreview(null); }}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-3">WORKSPACE IDENTITY</p>
                  <hr className="border-border mb-4" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ws-name">Name</Label>
                      <Input id="ws-name" {...register("name")} />
                      {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ws-slug">Slug</Label>
                      <Input id="ws-slug" {...register("slug", { onChange: () => { isSlugManuallyEdited.current = true; } })} className="font-mono text-sm" />
                      {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
                      {watch("slug") && (
                        <p className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          nexus.app/workspace/{watch("slug")}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ws-description">Description</Label>
                      <Textarea id="ws-description" {...register("description")} className="resize-none" rows={3} />
                      <p className="text-xs text-muted-foreground text-right">{watch("description")?.length || 0} / 500</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={(!isDirty && !iconFile) || isUpdating || isUploadingIcon}>
                    {isUpdating || isUploadingIcon ? "Saving..." : "Save Changes"}
                  </Button>
                </div>

                {/* Danger Zone */}
                <div className="pt-8">
                  <p className="text-[11px] font-bold tracking-wider text-destructive uppercase mb-3">DANGER ZONE</p>
                  <hr className="border-border mb-4" />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={handleLeave} disabled={isLeaving} className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50">
                      <ArrowLeftFromLine className="h-4 w-4 mr-2" />
                      {isLeaving ? "Leaving..." : "Leave Workspace"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger disabled={isDeleting} render={<Button variant="destructive"><Trash className="h-4 w-4 mr-2" />{isDeleting ? "Deleting..." : "Delete Workspace"}</Button>} />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogMedia><Trash className="size-5 text-destructive" /></AlertDialogMedia>
                          <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action is irreversible. Type <strong>{workspace?.name}</strong> to confirm.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="px-5 pb-2">
                          <Input value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} placeholder={workspace?.name} />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" disabled={deleteConfirmName !== workspace?.name || isDeleting} onClick={handleDelete}>
                            {isDeleting ? "Deleting..." : "Delete Workspace"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </form>
            ) : (
              /* Members Tab */
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Members</h3>
                {membersLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-1/3 bg-muted rounded" />
                          <div className="h-3 w-1/4 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {(members || []).map((member: WorkspaceMember) => {
                      const role = member.role as WorkspaceRole;
                      const RoleIcon = ROLE_ICONS[role];
                      const isCurrentUser = member.userId === currentUser?.userId;
                      const canManage = currentUser?.role === "OWNER";

                      return (
                        <div key={member.userId} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/50 bg-card/30 hover:bg-muted/40 transition-colors group">
                          <UserAvatar name={member.user?.username} src={member.user?.avatarUrl} className="h-10 w-10 ring-2 ring-background" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate flex items-center gap-1.5">
                              {member.user?.fullName || member.user?.username || "Unknown"}
                              {isCurrentUser && <span className="text-xs text-muted-foreground font-normal">(you)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">@{member.user?.username}</p>
                          </div>
                          {canManage && role !== "OWNER" ? (
                            <CustomRoleDropdown
                              role={role}
                              memberId={member.userId}
                              memberUsername={member.user?.username || "Unknown"}
                              canPromote={currentUser?.role === "OWNER"}
                              onRoleChange={handleRoleChange}
                              onRemove={handleRemoveMember}
                              onPromote={(id, name) => setPendingOwnerPromotion({ userId: id, username: name })}
                            />
                          ) : (
                            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border select-none", ROLE_BADGE_STYLES[role])}>
                              <RoleIcon className="h-3.5 w-3.5" />
                              {role}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Promote to owner confirmation */}
                <AlertDialog open={!!pendingOwnerPromotion} onOpenChange={(open) => { if (!open) setPendingOwnerPromotion(null); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogMedia><Shield className="size-5 text-amber-500" /></AlertDialogMedia>
                      <AlertDialogTitle>Promote to Owner</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to make <strong>{pendingOwnerPromotion?.username}</strong> an owner?
                        They will have full control over the workspace, including the ability to manage members, channels, and settings.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction disabled={!pendingOwnerPromotion} onClick={() => { if (pendingOwnerPromotion) { handleRoleChange(pendingOwnerPromotion.userId, "OWNER"); } setPendingOwnerPromotion(null); }}>
                        Promote to Owner
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="pt-4">
                  <Button variant="outline" onClick={handleLeave} disabled={isLeaving} className="text-destructive hover:text-destructive">
                    <ArrowLeftFromLine className="h-4 w-4 mr-2" />
                    {isLeaving ? "Leaving..." : "Leave Workspace"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
