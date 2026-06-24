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
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogHeader, AlertDialogFooter, AlertDialogMedia } from "@/shared/components/ui/alert-dialog";
import { useWorkspaceDetails, useWorkspaceMembersQuery, useUpdateWorkspaceMutation, useDeleteWorkspaceMutation, useLeaveWorkspaceMutation, useUpdateMemberRole, useRemoveMember } from "../hooks/useWorkspaces";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useParams, useRouter } from "next/navigation";
import { Camera, ArrowLeftFromLine, Trash, Shield, ShieldCheck, User as UserIcon, Settings, Users, ChevronRight, ArrowLeft, UserMinus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { WorkspaceRole, WorkspaceMember } from "../types/workspace";
import { uploadWorkspaceIcon, getPublicUrl, deleteFile } from "@/shared/lib/upload";
import { friendlyError } from "@/shared/lib/friendly-error";
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

const TAB_GROUPS = [
  {
    label: "Workspace Settings",
    items: [
      { id: "general", label: "General", icon: Settings },
      { id: "members", label: "Members", icon: Users },
    ]
  }
] as const;

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  workspaceId: string | null;
  onClose: () => void;
}

export function WorkspaceSettingsModal({ isOpen, workspaceId, onClose }: WorkspaceSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "members">("general");
  const [showMobileMenu, setShowMobileMenu] = useState(true);
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
    formState: { errors, isDirty },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  const [previewName, setPreviewName] = useState("");
  const [descLength, setDescLength] = useState(0);
  const [currentSlug, setCurrentSlug] = useState("");

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setShowMobileMenu(true);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (workspace) {
      reset({
        name: workspace.name || "",
        slug: workspace.slug || "",
        description: workspace.description || "",
      });
      requestAnimationFrame(() => {
        setPreviewName(workspace.name || "");
        setCurrentSlug(workspace.slug || "");
        setDescLength(workspace.description?.length || 0);
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
      toast.success("You left the workspace.");
      onClose();
      router.push("/conversations");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to leave workspace"));
    }
  };

  const [pendingOwnerPromotion, setPendingOwnerPromotion] = useState<{ userId: string; username: string } | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{ userId: string; username: string } | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  
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
  const params = useParams();
  
  const router = useRouter();
  
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const handleIconBrowse = useCallback(() => {
    iconInputRef.current?.click();
  }, []);

  const handleIconKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      iconInputRef.current?.click();
    }
  }, []);

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
      setShowDiscardDialog(true);
      return;
    }
    if (!open) onClose();
  };

  function getErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === "object" && "response" in error) {
      const resp = (error as { response?: { data?: { error?: string } } }).response;
      return friendlyError(resp?.data?.error || error, fallback);
    }
    return friendlyError(error, fallback);
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent fullscreenMobile size="2xl" className="w-[90vw] md:!w-[800px] lg:!w-[1000px] sm:h-[80vh] p-0 bg-background md:flex-row overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Workspace Settings</DialogTitle>
          <DialogDescription>Manage workspace settings</DialogDescription>
        </DialogHeader>

        {/* Sidebar */}
        <div
          className={cn(
            "w-full md:w-64 bg-muted/10 md:bg-muted/30 border-r border-border p-0 md:p-4 flex-col overflow-y-auto shrink-0",
            showMobileMenu ? "flex" : "hidden md:flex"
          )}
        >
          {/* Mobile Header */}
          <div className="px-6 pt-12 pb-4 md:hidden">
            <h2 className="text-2xl font-bold">Workspace Settings</h2>
          </div>

          <div className="flex flex-col gap-6 p-4 md:p-0">
            {TAB_GROUPS.map((group, groupIdx) => (
              <div key={groupIdx} className="flex flex-col gap-2">
                <h3 className="text-[12px] font-bold tracking-wider text-muted-foreground uppercase px-2 md:px-3">
                  {group.label}
                </h3>
                <div className="flex flex-col bg-card md:bg-transparent border md:border-0 border-border rounded-xl md:rounded-none overflow-hidden divide-y md:divide-y-0 divide-border">
                  {group.items.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as "general" | "members");
                          setShowMobileMenu(false);
                        }}
                        className={cn(
                          "group flex items-center justify-between px-4 md:px-3 py-3.5 md:py-2 text-base md:text-sm font-medium transition-colors w-full text-left",
                          isActive
                            ? "bg-brand/10 text-brand md:rounded-md"
                            : "text-foreground md:text-muted-foreground hover:bg-muted/50 md:hover:bg-muted hover:text-foreground md:rounded-md"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 md:h-4 md:w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          {tab.label}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 md:hidden" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div
          className={cn(
            "flex-1 p-6 md:p-8 overflow-y-auto bg-background",
            !showMobileMenu ? "block" : "hidden md:block"
          )}
        >
          <div className="max-w-4xl w-full mx-auto md:mx-0">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground -ml-2 p-2 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Settings</span>
            </button>
            {workspaceLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-8 w-1/3 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
              </div>
            ) : activeTab === "general" ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Preview: <span className="font-medium text-foreground">{previewName || "Untitled"}</span>
                </p>

                { }
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
                      onClick={handleIconBrowse}
                      onKeyDown={handleIconKeyDown}
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
                      <Input id="ws-name" {...register("name", {
                        onChange: (e) => setPreviewName(e.target.value),
                      })} />
                      {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ws-slug">Slug</Label>
                      <Input id="ws-slug" {...register("slug", {
                        onChange: (e) => setCurrentSlug(e.target.value),
                      })} className="font-mono text-sm" />
                      {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
                      {currentSlug && (
                        <p className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          nexus.app/workspace/{currentSlug}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ws-description">Description</Label>
                      <Textarea id="ws-description" {...register("description", {
                        onChange: (e) => setDescLength(e.target.value.length),
                      })} className="resize-none" rows={3} />
                      <p className="text-xs text-muted-foreground text-right">{descLength} / 500</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={(!isDirty && !iconFile) || isUpdating || isUploadingIcon}>
                    {isUpdating || isUploadingIcon ? "Saving..." : "Save Changes"}
                  </Button>
                </div>

                { }
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

              <div className="space-y-4 px-2 sm:px-6">
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
                  <div className="space-y-3">
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
                            <div className="flex items-center gap-2">
                              <CustomRoleDropdown
                                role={role}
                                memberId={member.userId}
                                memberUsername={member.user?.username || "Unknown"}
                                canPromote={currentUser?.role === "OWNER"}
                                onRoleChange={handleRoleChange}
                                onPromote={(id, name) => setPendingOwnerPromotion({ userId: id, username: name })}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setPendingRemoval({ userId: member.userId, username: member.user?.username || "Unknown" })}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
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

                <div className="pt-4">
                  <Button variant="outline" onClick={handleLeave} disabled={isLeaving} className="text-destructive hover:text-destructive">
                    <ArrowLeftFromLine className="h-4 w-4 mr-2" />
                    {isLeaving ? "Leaving..." : "Leave Workspace"}
                  </Button>
                </div>
              </div>
            )}

            { }
            {activeTab === "members" && (
              <>
                { }
                <AlertDialog open={!!pendingOwnerPromotion} onOpenChange={(open) => { if (!open) setPendingOwnerPromotion(null); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogMedia><ShieldCheck className="size-5" style={{ color: 'var(--color-role-owner, #059669)' }} /></AlertDialogMedia>
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

                { }
                <AlertDialog open={!!pendingRemoval} onOpenChange={(open) => { if (!open) setPendingRemoval(null); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogMedia><UserMinus className="size-5 text-destructive" /></AlertDialogMedia>
                      <AlertDialogTitle>Remove Member</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove <strong>{pendingRemoval?.username}</strong> from this workspace?
                        They will lose access to all channels and messages.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" disabled={!pendingRemoval} onClick={() => { if (pendingRemoval) { handleRemoveMember(pendingRemoval.userId); } setPendingRemoval(null); }}>
                        Remove Member
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </DialogContent>
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <svg className="size-5 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </AlertDialogMedia>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => { setShowDiscardDialog(false); onClose(); }}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
