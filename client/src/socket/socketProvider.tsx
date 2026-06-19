"use client";

import { useEffect, useMemo } from "react";
import { socket } from "@/socket/socketClient";
import { SOCKET_EVENTS, type InitialPresencePayload, type MemberUpdatePayload } from "@/socket/socket-events";
import { useSocketEvents } from "@/socket/useSocketEvent";
import { useSocketStore } from "@/socket/socketStore";
import { useAuthInitialized, useUser } from "@/modules/auth/store/useAuthStore";
import { toast } from "sonner";
import { requestNotificationPermission } from "@/shared/lib/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useChatStore } from "@/modules/chat/store/chatStore";

export function SocketProvider() {
  const setSocketStatus = useSocketStore((state) => state.setSocketStatus);
  const isAuthInitialized = useAuthInitialized();
  const user = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const events = useMemo(() => {
    const onConnect = () => setSocketStatus("connected");
    const onDisconnect = () => setSocketStatus("disconnected");
    const onConnectError = (error: Error) => {
      setSocketStatus("disconnected");
      toast.error(`Connection lost: ${error.message}`);
    };

    const handleInitialPresence = (payload: InitialPresencePayload) => {
      useSocketStore.getState().setInitialOnlineUsers(payload.users.map((u: { userId: string }) => u.userId));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    };

    const handleUserStatusUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleUserUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleWorkspaceUpdate = (payload: { action: "UPDATED" | "DELETED"; workspace: { id: string; name?: string } }) => {
      if (payload.action === "DELETED" && payload.workspace?.id) {
        const currentWorkspaceId = useChatStore.getState().activeWorkspaceId;
        if (currentWorkspaceId === payload.workspace.id) {
          toast.error("The workspace you were viewing has been deleted.");
          useChatStore.getState().setMode("DM");
          useChatStore.getState().setActiveWorkspaceId(null);
          useChatStore.getState().setActiveConversationId(null);
          router.push("/conversations");
        }
      }
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    };

    const handleMemberUpdate = (payload: MemberUpdatePayload & { workspaceId?: string }) => {
      if (payload.action === "REMOVED" && payload.member?.userId === user?.id) {
        const currentWorkspaceId = useChatStore.getState().activeWorkspaceId;
        if (currentWorkspaceId === payload.workspaceId) {
          toast.error("You are no longer in this workspace.", { id: `removed-ws-${payload.workspaceId}` });
          useChatStore.getState().setMode("DM");
          useChatStore.getState().setActiveWorkspaceId(null);
          useChatStore.getState().setActiveConversationId(null);
          router.push("/conversations");
        }
      }
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    };

    const handleChannelMemberUpdate = (payload: { workspaceId: string; channelId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", payload.workspaceId, "channels", payload.channelId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-channels"] });
    };

    const handleChannelMemberRemoved = (payload: { workspaceId: string; channelId: string; removedUserId?: string }) => {
      if (payload.removedUserId === user?.id) {
        if (pathname.includes(`/channels/${payload.channelId}`)) {
          toast.error("You have been removed from this channel.", { id: `removed-${payload.channelId}` });
          const workspacePath = pathname.split('/channels/')[0];
          router.push(workspacePath || '/');
        }
      }
      
      setTimeout(() => {
        handleChannelMemberUpdate(payload);
      }, 150);
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      useSocketStore.getState().addUserOnline(userId);
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      useSocketStore.getState().removeUserOffline(userId);
    };

    return {
      "connect": onConnect,
      "disconnect": onDisconnect,
      "connect_error": onConnectError,
      [SOCKET_EVENTS.INITIAL_PRESENCE]: handleInitialPresence,
      [SOCKET_EVENTS.USER_ONLINE]: handleUserOnline,
      [SOCKET_EVENTS.USER_OFFLINE]: handleUserOffline,
      [SOCKET_EVENTS.USER_STATUS_UPDATE as string]: handleUserStatusUpdate,
      [SOCKET_EVENTS.USER_UPDATE as string]: handleUserUpdate,
      [SOCKET_EVENTS.WORKSPACE_UPDATE as string]: handleWorkspaceUpdate,
      [SOCKET_EVENTS.MEMBER_UPDATE as string]: handleMemberUpdate,
      [SOCKET_EVENTS.CHANNEL_MEMBER_ADDED as string]: handleChannelMemberUpdate,
      [SOCKET_EVENTS.CHANNEL_MEMBER_REMOVED as string]: handleChannelMemberRemoved,
    };
  }, [setSocketStatus, queryClient, user?.id, pathname, router]);

  useSocketEvents(events);

  useEffect(() => {
    if (!isAuthInitialized || !user) return;

    if (socket.connected) {
      setSocketStatus("connected");
    } else {
      socket.connect();
    }
    
    return () => {
      socket.disconnect();
    };
  }, [setSocketStatus, isAuthInitialized, user]);

  return null;
}
