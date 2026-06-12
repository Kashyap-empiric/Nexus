"use client";

import { useState } from "react";
import { Search, Plus, LogOut, X } from "lucide-react";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
import dynamic from "next/dynamic";
import { useConversationsQuery } from "../hooks/useConversations";
import { useWorkspaceChannelsQuery } from "@/modules/workspaces/hooks/useWorkspaceChannels";
import type { ConversationMember } from "../types/conversation";
import { useAuth } from "@/modules/auth";
import { Input } from "@/shared/components/ui/input";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useGlobalSocket } from "@/modules/chat/hooks/useGlobalSocket";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { useSocketStore } from "@/socket/socketStore";
import { cn } from "@/shared/lib/utils";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useInviteModal } from "@/modules/invites/hooks/useInviteModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { MessageSquarePlus, UserPlus } from "lucide-react";
import { WorkspaceHeader } from "@/modules/workspaces/components/WorkspaceHeader";
import { useWorkspaceDetails } from "@/modules/workspaces/hooks/useWorkspaces";

const NewConversationModal = dynamic(() => import("./NewConversationModal").then((m) => m.NewConversationModal), { ssr: false });
const InviteModal = dynamic(() => import("@/modules/invites/components/InviteModal").then((m) => m.InviteModal), { ssr: false });
const CreateChannelModal = dynamic(() => import("@/modules/workspaces/components/CreateChannelModal").then((m) => m.CreateChannelModal), { ssr: false });
import { WorkspaceChannelItem } from "@/modules/workspaces/components/WorkspaceChannelItem";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  useGlobalSocket();
  const { logout } = useAuth();
  const { data: conversations, isLoading } = useConversationsQuery();
  
  const mode = useChatStore((state) => state.mode);
  const activeWorkspaceId = useChatStore((state) => state.activeWorkspaceId);
  const { data: workspaceChannels, isLoading: isLoadingChannels } = useWorkspaceChannelsQuery(mode === "WORKSPACE" ? activeWorkspaceId : null);
  const { data: workspaceDetails } = useWorkspaceDetails(mode === "WORKSPACE" ? activeWorkspaceId : null);
  const currentAuthUser = useUser();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const inviteModal = useInviteModal();
  const [searchQuery, setSearchQuery] = useState("");
  const params = useParams();
  const router = useRouter();
  const activeId = (params?.channelId as string) || (params?.id as string);
  const lastVisitedChannels = useChatStore((state) => state.lastVisitedChannels);
  const setLastVisitedChannel = useChatStore((state) => state.setLastVisitedChannel);
  const pendingRedirect = useRef<string | null>(null);

  // Save last visited channel
  useEffect(() => {
    if (mode === "WORKSPACE" && activeWorkspaceId && activeId) {
      const isChannel = workspaceChannels?.some(c => c.id === activeId);
      if (isChannel) {
        setLastVisitedChannel(activeWorkspaceId, activeId);
        pendingRedirect.current = null; // Clear pending once we arrive
      }
    }
  }, [mode, activeWorkspaceId, activeId, workspaceChannels, setLastVisitedChannel]);

  // Redirect to last visited or fallback channel
  useEffect(() => {
    if (mode === "WORKSPACE" && activeWorkspaceId && workspaceChannels && workspaceChannels.length > 0) {
      const isCurrentlyInAChannel = workspaceChannels.some(c => c.id === activeId);
      if (!isCurrentlyInAChannel) {
        const savedChannelId = lastVisitedChannels[activeWorkspaceId];
        const savedChannelExists = savedChannelId && workspaceChannels.some(c => c.id === savedChannelId);
        
        const targetId = savedChannelExists 
          ? savedChannelId 
          : (workspaceChannels.find(c => c.name === "general") || workspaceChannels[0]).id;
        
        if (activeId !== targetId && pendingRedirect.current !== targetId) {
          pendingRedirect.current = targetId;
          router.push(`/workspaces/${activeWorkspaceId}/channels/${targetId}`);
        }
      }
    }
  }, [mode, activeWorkspaceId, activeId, workspaceChannels, lastVisitedChannels, router]);

  // Try to find the actual database user profile from the conversation members
  const myProfile = conversations?.[0]?.members.find((m) => m.userId === currentAuthUser?.id)?.user;

  const socketStatus = useSocketStore((state) => state.socketStatus);
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
      <aside className="w-full md:w-72 border-r bg-background md:bg-muted/30 md:dark:bg-muted/10 flex flex-col shrink-0">
        {mode === "WORKSPACE" && workspaceDetails ? (
          <WorkspaceHeader 
            workspace={workspaceDetails.workspace} 
            onInviteClick={() => inviteModal.open("WORKSPACE", workspaceDetails.workspace.id)}
            rightElement={
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigate?.();
                }}
                className="md:hidden p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-muted-foreground transition-colors cursor-pointer"
                title="Close sidebar"
              >
                <X className="h-5 w-5 pointer-events-none" />
              </button>
            }
          />
        ) : (
          <div className="h-14 border-b flex items-center px-3 shrink-0 shadow-sm gap-2">
            <div className="relative w-full flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Find a conversation"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 py-1.5 bg-muted/50 border-transparent hover:border-border focus-visible:border-border focus-visible:ring-1 w-full"
              />
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNavigate?.();
              }}
              className="md:hidden p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors shrink-0 cursor-pointer"
              title="Close sidebar"
            >
              <X className="h-5 w-5 pointer-events-none" />
            </button>
          </div>
        )}

        {/* Middle: Lists */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 mt-2">
              <span>{mode === "DM" ? "Direct Messages" : "Channels"}</span>
              {mode === "DM" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 transition-colors py-1 px-2.5 -mr-1 rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary/10 text-primary hover:bg-primary/20 normal-case tracking-normal font-medium leading-none">
                    <span className="text-xs leading-none">New</span>
                    <Plus className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setIsNewModalOpen(true)} className="gap-2 cursor-pointer">
                      <MessageSquarePlus className="h-4 w-4" />
                      <span>New Message</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); inviteModal.open("USER"); }} className="cursor-pointer">
                      <UserPlus className="h-4 w-4" />
                      <span>Invite Someone</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  onClick={() => setIsNewModalOpen(true)}
                  className="flex items-center justify-center transition-colors p-1 rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
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
            ) : mode === "DM" ? (
              <div className="space-y-[2px]">
                {displayList.map((chat) => {
                  const otherMember = chat.members.find((m: ConversationMember) => m.userId !== currentAuthUser?.id);
                  const name = otherMember?.user.username || "Deleted user";
                  const avatarUrl = otherMember?.user.avatarUrl;
                  const userId = otherMember?.userId;

                  const isActive = chat.id === activeId;
                  const unreadCount = chat.unreadCount || 0;
                  const isUnread = unreadCount > 0;

                  return (
                    <Link
                      key={chat.id}
                      href={`/conversations/${chat.id}`}
                      prefetch={false}
                      onClick={() => onNavigate?.()}
                      className={`flex items-center gap-3 px-2 py-2 rounded-md transition-colors ${isActive
                        ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-foreground"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground dark:hover:bg-white/5"
                        }`}
                    >
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

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className={`truncate text-sm leading-none ${isUnread && !isActive ? 'font-bold text-foreground' : 'font-medium'}`}>{name}</span>
                        {chat.latestMessage && (
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
            ) : (
              <div className="space-y-4">
                {/* Public Channels */}
                <div className="space-y-[2px]">
                  {displayList.filter(c => c.visibility === "PUBLIC").map((chat) => {
                    const isActive = chat.id === activeId;
                    const canManage = workspaceDetails?.workspace.members?.some(
                      m => m.userId === currentAuthUser?.id && (m.role === "OWNER" || m.role === "ADMIN")
                    ) || false;
                    
                    return (
                      <WorkspaceChannelItem 
                        key={chat.id}
                        channel={chat as any}
                        isActive={isActive}
                        workspaceId={activeWorkspaceId!}
                        canManage={canManage}
                        isGeneral={chat.name === "general"}
                        onNavigate={onNavigate}
                      />
                    );
                  })}
                </div>

                {/* Private Channels */}
                {displayList.some(c => c.visibility === "PRIVATE") && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 mt-4">
                      <span>Private Channels</span>
                    </div>
                    <div className="space-y-[2px]">
                      {displayList.filter(c => c.visibility === "PRIVATE").map((chat) => {
                        const isActive = chat.id === activeId;
                        const canManage = workspaceDetails?.workspace.members?.some(
                          m => m.userId === currentAuthUser?.id && (m.role === "OWNER" || m.role === "ADMIN")
                        ) || false;
                        
                        return (
                          <WorkspaceChannelItem 
                            key={chat.id}
                            channel={chat as any}
                            isActive={isActive}
                            workspaceId={activeWorkspaceId!}
                            canManage={canManage}
                            isGeneral={chat.name === "general"}
                            onNavigate={onNavigate}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
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

      <NewConversationModal isOpen={mode === "DM" && isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
      {mode === "WORKSPACE" && <CreateChannelModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} workspaceId={activeWorkspaceId!} />}
      <InviteModal isOpen={inviteModal.isOpen} onClose={inviteModal.close} type={inviteModal.type} entityId={inviteModal.entityId} />
    </>
  );
}
