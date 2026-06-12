"use client";

import { useState } from "react";
import { Search, Plus, LogOut } from "lucide-react";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "./PresenceIndicator";
import dynamic from "next/dynamic";
import { useConversationsQuery } from "../hooks/useConversations";
import { useWorkspaceChannelsQuery } from "../hooks/useWorkspaceChannels";
import type { ConversationMember } from "../types/conversation";
import { useAuth } from "@/modules/auth";
import { Input } from "@/shared/components/ui/input";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useGlobalSocket } from "../hooks/useGlobalSocket";
import { useChatStore } from "../store/chatStore";
import { cn } from "@/shared/lib/utils";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useInviteModal } from "@/shared/hooks/useInviteModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { MessageSquarePlus, UserPlus } from "lucide-react";

const NewConversationModal = dynamic(() => import("./NewConversationModal").then((m) => m.NewConversationModal), { ssr: false });
const InviteModal = dynamic(() => import("./InviteModal").then((m) => m.InviteModal), { ssr: false });

export function Sidebar() {
  useGlobalSocket();
  const { logout } = useAuth();
  const { data: conversations, isLoading } = useConversationsQuery();
  
  const mode = useChatStore((state) => state.mode);
  const activeWorkspaceId = useChatStore((state) => state.activeWorkspaceId);
  const { data: workspaceChannels, isLoading: isLoadingChannels } = useWorkspaceChannelsQuery(mode === "WORKSPACE" ? activeWorkspaceId : null);
  const currentAuthUser = useUser();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const inviteModal = useInviteModal();
  const [searchQuery, setSearchQuery] = useState("");
  const params = useParams();
  const activeId = params?.id as string;

  // Try to find the actual database user profile from the conversation members
  const myProfile = conversations?.[0]?.members.find((m) => m.userId === currentAuthUser?.id)?.user;

  const socketStatus = useChatStore((state) => state.socketStatus);
  const statusLabel = socketStatus === "connected" ? "Online" : socketStatus === "connecting" ? "Connecting..." : "Offline";

  const displayList = mode === "DM" 
    ? [...(conversations || [])]
        .filter((c) => {
          if (c.type !== "DM") return false;
          const otherMember = c.members.find((m) => m.userId !== currentAuthUser?.id);
          const isOtherDeleted = !otherMember?.user;
          const hasNoMessages = !c.latestMessageId;
          if (isOtherDeleted && hasNoMessages) return false;

          if (searchQuery.trim()) {
            const name = otherMember?.user.username?.toLowerCase() || "";
            if (!name.includes(searchQuery.toLowerCase())) {
              return false;
            }
          }

          return true;
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    : [...(workspaceChannels || [])]
        .filter((c) => {
          if (searchQuery.trim() && c.name) {
            return c.name.toLowerCase().includes(searchQuery.toLowerCase());
          }
          return true;
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const isListLoading = mode === "DM" ? isLoading : isLoadingChannels;

  return (
    <>
      <aside className="w-full md:w-60 border-r bg-muted/30 dark:bg-muted/10 flex flex-col shrink-0">
        {/* Top: Search */}
        <div className="h-14 border-b flex items-center px-3 shrink-0 shadow-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Find a conversation"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 py-1.5 bg-muted/50 border-transparent hover:border-border focus-visible:border-border focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Middle: Lists */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              <span>{mode === "DM" ? "Direct Messages" : "Channels"}</span>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 transition-colors py-1 px-2.5 -mr-1 rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary/10 text-primary hover:bg-primary/20 normal-case tracking-normal font-medium leading-none">
                  <span className="text-xs leading-none">New</span>
                  <Plus className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {mode === "DM" && (
                    <DropdownMenuItem onClick={() => setIsNewModalOpen(true)} className="gap-2 cursor-pointer">
                      <MessageSquarePlus className="h-4 w-4" />
                      <span>New Message</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); inviteModal.open("USER"); }} className="cursor-pointer">
                    <UserPlus className="h-4 w-4" />
                    <span>Invite Someone</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isListLoading ? (
              <div className="space-y-[2px]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-md">
                    <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5 justify-center">
                      <div className="w-24 h-3 bg-muted rounded animate-pulse" />
                      <div className="w-32 h-2.5 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayList.length === 0 ? (
              <div className="text-sm text-muted-foreground/70 px-2 py-1">Nothing here yet</div>
            ) : (
              <div className="space-y-[2px]">
                {displayList.map((chat) => {
                  let name = chat.name;
                  let avatarUrl = undefined;
                  let userId = undefined;

                  if (mode === "DM") {
                    const otherMember = chat.members.find((m: ConversationMember) => m.userId !== currentAuthUser?.id);
                    name = otherMember?.user.username || "Deleted user";
                    avatarUrl = otherMember?.user.avatarUrl;
                    userId = otherMember?.userId;
                  } else {
                    name = `# ${name || "channel"}`;
                  }

                  const isActive = chat.id === activeId;
                  const unreadCount = chat.unreadCount || 0;
                  const isUnread = unreadCount > 0;

                  return (
                    <Link
                      key={chat.id}
                      href={`/conversations/${chat.id}`}
                      prefetch={false}
                      className={`flex items-center gap-3 px-2 py-2 rounded-md transition-colors ${isActive
                        ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-foreground"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground dark:hover:bg-white/5"
                        }`}
                    >
                      {mode === "DM" ? (
                        <div className="relative shrink-0">
                          <UserAvatar
                            name={name}
                            src={avatarUrl}
                            className="h-9 w-9 shrink-0"
                            fallbackClassName="text-xs bg-primary/20 text-primary font-medium"
                          />
                          {userId && (
                            <PresenceIndicator userId={userId} className="-bottom-0.5 -right-0.5" />
                          )}
                        </div>
                      ) : null}

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className={`truncate text-sm leading-none ${isUnread && !isActive ? 'font-bold text-foreground' : 'font-medium'}`}>{name}</span>
                        {chat.latestMessage && mode === "DM" && (
                          <span className={`truncate text-[13px] ${isUnread && !isActive ? 'font-semibold text-foreground' : 'text-muted-foreground/80'}`}>
                            {chat.latestMessage.deletedAt
                              ? <span className="italic">This message was deleted</span>
                              : chat.latestMessage.userId === currentAuthUser?.id
                                ? `You: ${chat.latestMessage.content}`
                                : `${chat.latestMessage.user.username}: ${chat.latestMessage.content}`
                            }
                          </span>
                        )}
                      </div>

                      {isUnread && !isActive && (
                        <div className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[12px] font-bold shrink-0 leading-none">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: User Profile */}
        <div className="p-4 border-t bg-background shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <UserAvatar
                name={myProfile?.username || currentAuthUser?.user_metadata?.username || "ME"}
                src={myProfile?.avatarUrl || currentAuthUser?.user_metadata?.avatar_url || currentAuthUser?.user_metadata?.avatarUrl}
                className="h-8 w-8 shrink-0"
                fallbackClassName="text-xs"
              />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                  socketStatus === "connected" ? "bg-green-500" : socketStatus === "connecting" ? "bg-yellow-500" : "bg-muted-foreground"
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate mb-1 leading-none">
                {myProfile?.username || currentAuthUser?.user_metadata?.username || "My Account"}
              </p>
              <p className="text-xs text-muted-foreground leading-none truncate">{statusLabel}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <NewConversationModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
      <InviteModal isOpen={inviteModal.isOpen} onClose={inviteModal.close} type={inviteModal.type} entityId={inviteModal.entityId} />
    </>
  );
}
