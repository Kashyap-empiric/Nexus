"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/modules/auth";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/socket/socketClient";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useProfile } from "@/modules/users/hooks/useProfile";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { deleteAccount } from "@/modules/users/api/users.api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

export function AccountSettings() {
  const router = useRouter();
  const { logout } = useAuth();
  const user = useUser();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = async () => {
    try { await logout(); } catch { }
    queryClient.clear();
    socket.disconnect();
    setShowSignOutConfirm(false);
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmation) {
      setDeleteError("Please type the confirmation text.");
      return;
    }
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount(deleteConfirmation);
      try { await logout(); } catch { }
      queryClient.clear();
      socket.disconnect();
      router.push("/login");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmation("");
    setDeleteError("");
    setIsDeleting(false);
  };

  const displayName = profile?.username || user?.user_metadata?.username || "Signed in";
  const avatarSrc = profile?.avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.avatarUrl;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Account</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account and sign out.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-3">SESSION</p>
        <hr className="border-border mb-4" />
        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 flex items-center gap-4">
            <UserAvatar name={displayName} src={avatarSrc} className="h-10 w-10 shrink-0" fallbackClassName="bg-brand/10 text-brand font-medium" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => setShowSignOutConfirm(true)}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold tracking-wider text-destructive uppercase mb-3">DANGER ZONE</p>
        <hr className="border-border mb-4" />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5">
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all owned workspaces. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to log in again to access your messages and workspaces.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => { if (!open && !isDeleting) closeDeleteConfirm(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all workspaces you own. Your messages will be anonymized but preserved.
            </AlertDialogDescription>
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">Type <span className="font-mono font-bold text-foreground">DELETE {user?.email}</span> to confirm</Label>
              <Input
                id="delete-confirmation"
                type="text"
                placeholder={`DELETE ${user?.email}`}
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                disabled={isDeleting}
              />
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || !deleteConfirmation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
