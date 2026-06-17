"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogHeader } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/shared/components/ui/alert-dialog";
import { useUpdateChannel, useDeleteChannel } from "@/modules/workspaces/hooks/useWorkspaces";
import { ChevronDown, AlertTriangle, Trash, Info } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Switch } from "@/shared/components/ui/switch";

const channelSchema = z.object({
  name: z.string().min(1, "Channel name is required").max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
});

type ChannelFormValues = z.infer<typeof channelSchema>;

interface ChannelSettingsModalProps {
  isOpen: boolean;
  workspaceId: string | null;
  channel: {
    id: string;
    name: string | null;
    description?: string | null;
    visibility?: "PUBLIC" | "PRIVATE";
  } | null;
  onClose: () => void;
}

export function ChannelSettingsModal({ isOpen, workspaceId, channel, onClose }: ChannelSettingsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const { mutateAsync: updateChannel, isPending: isUpdating } = useUpdateChannel();
  const { mutateAsync: deleteChannel, isPending: isDeleting } = useDeleteChannel();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ChannelFormValues>({
    resolver: zodResolver(channelSchema),
    defaultValues: { name: "", description: "", visibility: "PUBLIC" },
  });

  useEffect(() => {
    if (channel) {
      reset({
        name: channel.name || "",
        description: channel.description || "",
        visibility: channel.visibility,
      });
    }
  }, [channel, reset]);

  const currentVisibility = watch("visibility");
  const isChangingToPrivate = currentVisibility === "PRIVATE" && channel?.visibility === "PUBLIC";

  const onSubmit = async (data: ChannelFormValues) => {
    if (!workspaceId || !channel) return;
    try {
      await updateChannel({ workspaceId, channelId: channel.id, data });
      toast.success("Channel updated");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to update channel");
    }
  };

  const handleDelete = async () => {
    if (!workspaceId || !channel) return;
    try {
      await deleteChannel({ workspaceId, channelId: channel.id });
      toast.success("Channel deleted");
      setShowDeleteConfirm(false);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete channel");
    }
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

  if (!isOpen || !channel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-full h-[100dvh] p-0 rounded-none sm:rounded-xl sm:max-w-lg sm:h-auto bg-background">
        <DialogHeader className="sr-only">
          <DialogTitle>Channel Settings</DialogTitle>
          <DialogDescription>Manage channel settings</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Channel Identity */}
          <div>
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-3">CHANNEL IDENTITY</p>
            <hr className="border-border mb-4" />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ch-name">Name</Label>
                <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-ring">
                  <span className="pl-3 text-muted-foreground select-none text-sm">#</span>
                  <Input id="ch-name" {...register("name")} className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pl-2" />
                </div>
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ch-description">Description</Label>
                <Textarea id="ch-description" {...register("description")} className="resize-none" rows={3} />
                <p className="text-xs text-muted-foreground text-right">{watch("description")?.length || 0} / 500</p>
              </div>

              <div className="space-y-3">
                <Label>Visibility</Label>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {currentVisibility === "PUBLIC" ? "Public" : "Private"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentVisibility === "PUBLIC"
                        ? "Anyone in the workspace can find and join this channel"
                        : "Only invited members can see and join this channel"}
                    </p>
                  </div>
                  <Switch
                    checked={currentVisibility === "PRIVATE"}
                    onCheckedChange={(checked) => setValue("visibility", checked ? "PRIVATE" : "PUBLIC", { shouldDirty: true })}
                  />
                </div>
                {isChangingToPrivate && (
                  <div className="flex items-start gap-2 bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Existing members keep access. New members must be added manually.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!isDirty || isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
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
                  Deleting this channel is irreversible. All messages will be permanently removed.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger
                    disabled={isDeleting}
                    render={
                      <Button variant="destructive">
                        <Trash className="h-4 w-4 mr-2" />
                        {isDeleting ? "Deleting..." : "Delete Channel"}
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogTitle>Delete Channel</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action is irreversible. Type <strong>{channel?.name}</strong> to confirm.
                    </AlertDialogDescription>
                    <div className="space-y-4">
                      <Input
                        value={deleteConfirmName}
                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                        placeholder={channel?.name ?? ""}
                      />
                      <div className="flex justify-end gap-2">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deleteConfirmName !== channel?.name || isDeleting}
                          onClick={handleDelete}
                        >
                          {isDeleting ? "Deleting..." : "Delete Channel"}
                        </AlertDialogAction>
                      </div>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
