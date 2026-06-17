"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/shared/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/shared/components/ui/dropdown-menu";
import { useWorkspaceDetails, useWorkspaceMembersQuery, useUpdateWorkspaceMutation, useDeleteWorkspaceMutation, useLeaveWorkspaceMutation, useUpdateMemberRole, useRemoveMember } from "../hooks/useWorkspaces";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { Camera, Loader2, ChevronDown, AlertTriangle, ArrowLeftFromLine, Trash, Shield, ShieldCheck, User as UserIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { WorkspaceRole, WorkspaceMember } from "../types/workspace";
import { uploadWorkspaceIcon, getPublicUrl, deleteFile } from "@/shared/lib/upload";

const workspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

const ROLE_BADGE_STYLES: Record<WorkspaceRole, string> = {
  OWNER: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  ADMIN: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  MEMBER: "bg-muted text-muted-foreground",
};

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    setValue,
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
      setShowDeleteConfirm(false);
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to leave workspace"));
    }
  };

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

  const nameValue = watch("name");
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isSlugManuallyEdited.current && nameValue) {
      const derived = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setValue("slug", derived, { shouldDirty: true });
    }
  }, [nameValue, setValue]);

  const handleOpenChange = (open: boolean) => {
    if (!open && isDirty) {
      if (window.confirm("You have unsaved changes. Discard them?")) {
        onClose();
      }
      return;
    }
    if (!open) onClose();
  };

  const ROLE_OPTIONS: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER"];

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
      <DialogContent className="w-full max-w-full h-[100dvh] p-0 rounded-none sm:rounded-xl sm:max-w-2xl sm:h-[80vh] flex flex-col bg-background">
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
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
                {/* Preview */}
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
                        <img
                          src={getPublicUrl("avatars", workspace.iconPath) || ""}
                          alt=""
                          className="h-full w-full rounded-xl object-cover"
                        />
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
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleIconSelect(file);
                      }}
                    />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Workspace Icon</p>
                      <p className="text-xs text-muted-foreground">Square image, at least 256×256px. Max 5MB.</p>
                      {iconFile && (
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          if (iconPreview) URL.revokeObjectURL(iconPreview);
                          setIconFile(null);
                          setIconPreview(null);
                        }}>
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
                      <Input
                        id="ws-name"
                        {...register("name")}
                        onKeyDown={() => {
                          isSlugManuallyEdited.current = false;
                        }}
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ws-slug">Slug</Label>
                      <Input
                        id="ws-slug"
                        {...register("slug", {
                          onChange: () => {
                            isSlugManuallyEdited.current = true;
                          },
                        })}
                        className={cn("font-mono text-sm", !isSlugManuallyEdited.current && "opacity-60")}
                      />
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
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showDeleteConfirm && "rotate-180")} />
                    Show danger zone
                  </button>
                  {showDeleteConfirm && (
                    <div className="mt-4 border border-destructive/30 rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <h4 className="font-medium">Danger Zone</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Deleting the workspace is irreversible. All channels, messages, and data will be permanently removed.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={handleLeave} disabled={isLeaving} className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50">
                          <ArrowLeftFromLine className="h-4 w-4 mr-2" />
                          {isLeaving ? "Leaving..." : "Leave Workspace"}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            disabled={isDeleting}
                            render={
                              <Button variant="destructive">
                                <Trash className="h-4 w-4 mr-2" />
                                {isDeleting ? "Deleting..." : "Delete Workspace"}
                              </Button>
                            }
                          />
                          <AlertDialogContent>
                            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action is irreversible. Type <strong>{workspace?.name}</strong> to confirm.
                            </AlertDialogDescription>
                            <div className="space-y-4">
                              <Input
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder={workspace?.name}
                              />
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={deleteConfirmName !== workspace?.name || isDeleting}
                                  onClick={handleDelete}
                                >
                                  {isDeleting ? "Deleting..." : "Delete Workspace"}
                                </AlertDialogAction>
                              </div>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            ) : (
              /* Members Tab */
              <div className="space-y-4 max-w-xl">
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
                      const canManage = currentUser?.role === "OWNER" || currentUser?.role === "ADMIN";

                      return (
                        <div key={member.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                          <UserAvatar
                            name={member.user?.username}
                            src={member.user?.avatarUrl}
                            className="h-10 w-10"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.user?.fullName || member.user?.username || "Unknown"}
                              {isCurrentUser && <span className="text-muted-foreground font-normal ml-1">(you)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">@{member.user?.username}</p>
                          </div>
                          {canManage && role !== "OWNER" ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors", ROLE_BADGE_STYLES[role])}>
                                <RoleIcon className="h-3 w-3" />
                                {role}
                                <ChevronDown className="h-3 w-3" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {ROLE_OPTIONS.filter(r => r !== role && r !== "OWNER").map((r) => {
                                  const Icon = ROLE_ICONS[r];
                                  return (
                                    <DropdownMenuItem key={r} onClick={() => handleRoleChange(member.userId, r)}>
                                      <Icon className="h-4 w-4 mr-2" />
                                      {r}
                                    </DropdownMenuItem>
                                  );
                                })}
                                <DropdownMenuItem onClick={() => handleRemoveMember(member.userId)} className="text-destructive">
                                  <Trash className="h-4 w-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", ROLE_BADGE_STYLES[role])}>
                              <RoleIcon className="h-3 w-3" />
                              {role}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

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
