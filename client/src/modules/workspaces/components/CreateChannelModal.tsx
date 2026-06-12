"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useCreateChannel } from "../hooks/useWorkspaces";
import { useRouter } from "next/navigation";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function CreateChannelModal({ isOpen, onClose, workspaceId }: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const { mutate: createChannel, isPending } = useCreateChannel();
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let channelName = name.trim().toLowerCase().replace(/\s+/g, "-");

    createChannel(
      { workspaceId, name: channelName },
      {
        onSuccess: (channel) => {
          setName("");
          onClose();
          router.push(`/conversations/${channel.id}`);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border shadow-lg rounded-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Channel</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Channels are where your team communicates. They're best when organized around a topic.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel Name</Label>
              <Input
                id="channel-name"
                placeholder="e.g. frontend"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={30}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t mt-6">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isPending}>
                {isPending ? "Creating..." : "Create Channel"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
