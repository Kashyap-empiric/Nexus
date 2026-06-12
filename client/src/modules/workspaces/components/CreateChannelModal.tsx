"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Lock, Hash } from "lucide-react";
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
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const { mutate: createChannel, isPending } = useCreateChannel();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let channelName = name.trim().toLowerCase().replace(/\s+/g, "-");

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

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
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
    </div>,
    document.body
  );
}
