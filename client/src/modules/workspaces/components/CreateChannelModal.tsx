"use client";

import { useState } from "react";
import { Lock, Hash } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { useCreateChannel } from "../hooks/useWorkspaces";
import { useRouter } from "next/navigation";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function CreateChannelModal({ isOpen, onClose, workspaceId }: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const { mutate: createChannel, isPending } = useCreateChannel();
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const channelName = name.trim().toLowerCase().replace(/\s+/g, "-");

    createChannel(
      { workspaceId, name: channelName, visibility },
      {
        onSuccess: (channel) => {
          setName("");
          setVisibility("PUBLIC");
          onClose();
          router.push(`/conversations/${channel.id}`);
        },
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent size="sm" elevation="md">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            Channels are where your team communicates. They&apos;re best when organized around a topic.
          </DialogDescription>
        </DialogHeader>

        <form id="create-channel-form" onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              {/* Channel Name */}
              <div className="space-y-2">
                <Label htmlFor="channel-name">Channel Name</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                    {visibility === "PUBLIC" ? <Hash className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <Input
                    id="channel-name"
                    placeholder="e.g. frontend"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    maxLength={30}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex gap-2">
                  <div
                    onClick={() => setVisibility("PUBLIC")}
                    className={`flex-1 border rounded-lg p-3 cursor-pointer transition-colors ${visibility === "PUBLIC" ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="h-4 w-4" />
                      <span className="font-medium text-sm">Public</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Anyone in the workspace can join</p>
                  </div>
                  <div
                    onClick={() => setVisibility("PRIVATE")}
                    className={`flex-1 border rounded-lg p-3 cursor-pointer transition-colors ${visibility === "PRIVATE" ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="h-4 w-4" />
                      <span className="font-medium text-sm">Private</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Only specific people can join</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogBody>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="create-channel-form" disabled={!name.trim() || isPending}>
            {isPending ? "Creating..." : "Create Channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
