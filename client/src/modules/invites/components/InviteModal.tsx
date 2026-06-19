"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check, Loader2, Link as LinkIcon, UserPlus, Mail } from "lucide-react";
import type { InviteType } from "../types/invites";
import { useInviteLink } from "../hooks/useInviteLink";
import { useUsersSearchQuery } from "@/modules/users";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/shared/components/ui/dialog";
import { toast } from "sonner";

interface SelectedUser {
  id: string;
  email: string;
  username: string;
  fullName?: string | null;
  avatarUrl: string | null;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: InviteType;
  entityId?: string;
}

export function InviteModal({ isOpen, onClose, type, entityId }: InviteModalProps) {
  const { inviteUrl, expiresAt, isLoading, error, generate, reset } = useInviteLink();
  const [isCopied, setIsCopied] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [emailInviteInput, setEmailInviteInput] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emailInviteRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(emailInput), 300);
    return () => clearTimeout(timer);
  }, [emailInput]);

  const { data: searchResults, isLoading: isSearching } = useUsersSearchQuery(
    debouncedQuery,
    isOpen && type === "WORKSPACE" && debouncedQuery.length > 0
  );

  const [workspaceMemberIds, setWorkspaceMemberIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && type === "WORKSPACE" && entityId) {
      import("../../workspaces/api/workspaces.api").then(({ fetchWorkspaceMembers }) => {
        fetchWorkspaceMembers(entityId).then((members) => {
          setWorkspaceMemberIds(new Set(members.map((m) => m.userId)));
        }).catch(() => {
          
        });
      });
    } else {
      setWorkspaceMemberIds(new Set());
    }
  }, [isOpen, type, entityId]);

  const filteredResults = searchResults?.filter(
    (u) =>
      !selectedUsers.some((s) => s.id === u.id) &&
      !workspaceMemberIds.has(u.id)
  );

  const addUser = (user: SelectedUser) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setEmailInput("");
    setDebouncedQuery("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !emailInput && selectedUsers.length > 0) {
      removeUser(selectedUsers[selectedUsers.length - 1].id);
    }
    if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) return;

    setIsInviting(true);
    try {
      const { inviteMembers } = await import("../../workspaces/api/workspaces.api");
      const result = await inviteMembers(
        entityId!,
        selectedUsers.map((u) => u.id)
      );

      if (result.invited.length > 0) {
        toast.success(`Invite sent to ${result.invited.length} user(s)`);
      }
      if (result.skipped.length > 0) {
        const reasons = result.skipped.map((s) => s.reason).join(", ");
        toast.error(`Skipped ${result.skipped.length} user(s): ${reasons}`);
      }

      setSelectedUsers([]);
      setEmailInput("");
      if (result.skipped.length === 0) {
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to send invites");
    } finally {
      setIsInviting(false);
    }
  };

  const handleEmailInvite = async () => {
    const email = emailInviteInput.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSendingEmail(true);
    try {
      const { inviteByEmail } = await import("../../workspaces/api/workspaces.api");
      const result = await inviteByEmail(entityId!, email);

      if (!result.emailSent) {
        toast.warning(`Invite sent but email could not be delivered to ${email}`);
      } else {
        toast.success(`Invitation sent to ${email}`);
      }

      setEmailInviteInput("");
      onClose();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || "Failed to send invitation";
      toast.error(errorMsg);
    } finally {
      setIsSendingEmail(false);
    }
  };

  useEffect(() => {
    if (isOpen && type && !inviteUrl && !isLoading && !error) {
      generate(type, entityId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, entityId]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        reset();
        setIsCopied(false);
        setSelectedUsers([]);
        setEmailInput("");
        setEmailInviteInput("");
        setDebouncedQuery("");
      }, 300);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!inviteUrl) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
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

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent size="sm" elevation="md">
        <DialogHeader>
          <DialogTitle>Invite Someone</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {type === "WORKSPACE" && (
            <div className="mb-4">
              <h3 className="font-medium text-sm mb-2">Invite by email</h3>

              {}
              <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-muted/30 min-h-[42px] mb-2 focus-within:ring-1 focus-within:ring-ring focus-within:border-border">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 bg-primary/10 border border-primary/20 text-sm rounded-full"
                  >
                    <UserAvatar
                      name={user.username}
                      src={user.avatarUrl}
                      className="h-4 w-4 shrink-0"
                      fallbackClassName="text-[8px]"
                    />
                    <span className="text-xs font-medium max-w-[120px] truncate">
                      {user.fullName || `@${user.username}`}
                    </span>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={selectedUsers.length === 0 ? "Type email or username..." : ""}
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (e.target.value) setShowDropdown(true);
                  }}
                  onFocus={() => {
                    if (emailInput || filteredResults?.length) setShowDropdown(true);
                  }}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground py-0.5"
                  disabled={isInviting}
                />
              </div>

              {}
              {showDropdown && debouncedQuery.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="border rounded-lg bg-popover shadow-lg max-h-48 overflow-y-auto mb-3"
                >
                  {isSearching ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : filteredResults && filteredResults.length > 0 ? (
                    <div className="py-1">
                      {filteredResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() =>
                            addUser({
                              id: user.id,
                              email: user.email,
                              username: user.username,
                              fullName: user.fullName,
                              avatarUrl: user.avatarUrl,
                            })
                          }
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                        >
                          <UserAvatar
                            name={user.username}
                            src={user.avatarUrl}
                            className="h-8 w-8 shrink-0"
                            fallbackClassName="text-xs"
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            {user.fullName ? (
                              <>
                                <p className="text-sm font-medium truncate leading-none">{user.fullName}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                                  <span className="text-xs text-muted-foreground/50">•</span>
                                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium truncate leading-none">@{user.username}</p>
                                <p className="text-xs text-muted-foreground truncate mt-1">{user.email}</p>
                              </>
                            )}
                          </div>
                          <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No user found with that email or username
                    </div>
                  )}
                </div>
              )}

              {}
              <Button
                onClick={handleSubmit}
                disabled={selectedUsers.length === 0 || isInviting}
                className="w-full mb-4"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending invites...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {selectedUsers.length > 0
                      ? `Invite ${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""}`
                      : "Invite"}
                  </>
                )}
              </Button>

              {}
              <div className="mb-4">
                <div className="flex gap-2">
                  <Input
                    ref={emailInviteRef}
                    type="email"
                    placeholder="Enter email address..."
                    value={emailInviteInput}
                    onChange={(e) => setEmailInviteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleEmailInvite();
                      }
                    }}
                    className="flex-1"
                    disabled={isSendingEmail}
                  />
                  <Button
                    onClick={handleEmailInvite}
                    disabled={!emailInviteInput.trim() || isSendingEmail}
                    variant="outline"
                    className="shrink-0"
                  >
                    {isSendingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Invite someone who doesn&apos;t have an account yet. They&apos;ll receive an email with the invite link.
                </p>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-popover px-2 text-muted-foreground">
                    Or share link
                  </span>
                </div>
              </div>
            </div>
          )}

          {type !== "WORKSPACE" && (
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <LinkIcon className="h-8 w-8 text-primary" />
              </div>
            </div>
          )}

          {type !== "WORKSPACE" && (
            <>
              <h3 className="text-center font-medium text-lg mb-2">
                Share this link
              </h3>
              <p className="text-center text-muted-foreground text-sm mb-6">
                Anyone with this link can join the conversation.
              </p>
            </>
          )}

          {!type ? (
            <div className="text-center py-4 text-sm text-amber-500 bg-amber-500/10 rounded-md border border-amber-500/20">
              Please select a target to invite someone to.
              <br />
              (General workspace invites coming soon)
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Generating secure link...
              </span>
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
                {expiresAt
                  ? `Link expires on ${new Date(expiresAt).toLocaleDateString()}`
                  : "Link does not expire"}
              </p>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
