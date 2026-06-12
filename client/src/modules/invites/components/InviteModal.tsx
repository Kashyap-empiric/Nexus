"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Loader2, Link as LinkIcon } from "lucide-react";
import type { InviteType } from "../types/invites";
import { useInviteLink } from "../hooks/useInviteLink";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: InviteType;
  entityId?: string;
}

export function InviteModal({ isOpen, onClose, type, entityId }: InviteModalProps) {
  const { inviteUrl, expiresAt, isLoading, error, generate, reset } = useInviteLink();
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    // We only want to run this once when the modal opens with a valid type
    if (isOpen && type && !inviteUrl && !isLoading && !error) {
      generate(type, entityId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, entityId]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        reset();
        setIsCopied(false);
      }, 300); // Wait for exit animation
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!inviteUrl) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        // Fallback for older browsers / non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = inviteUrl;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
        } catch (err) {
          console.error("Fallback copy failed", err);
          throw new Error("Copy not supported");
        } finally {
          textArea.remove();
        }
      }
      
      setIsCopied(true);
      toast.success("Link copied to clipboard");
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy link to clipboard");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border shadow-lg rounded-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Invite Someone</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <LinkIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <h3 className="text-center font-medium text-lg mb-2">Share this link</h3>
          <p className="text-center text-muted-foreground text-sm mb-6">
            Anyone with this link can join the conversation.
          </p>

          {!type ? (
            <div className="text-center py-4 text-sm text-amber-500 bg-amber-500/10 rounded-md border border-amber-500/20">
              Please select a target to invite someone to.
              <br />
              (General workspace invites coming soon)
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating secure link...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  value={inviteUrl || ""} 
                  readOnly 
                  className="bg-muted font-mono text-xs focus-visible:ring-0" 
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button 
                  onClick={handleCopy} 
                  variant={isCopied ? "secondary" : "default"}
                  className="shrink-0 w-24 transition-all"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {expiresAt ? `Link expires on ${new Date(expiresAt).toLocaleDateString()}` : "Link does not expire"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
