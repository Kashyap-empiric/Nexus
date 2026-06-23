import type { QueryClient } from "@tanstack/react-query";
import type { Conversation } from "@/modules/conversations/types/conversation";
import type { WorkspaceMember } from "@/modules/workspaces/types/workspace";
import { getAuthUser } from "@/modules/auth/store/useAuthStore";
import { APP_ROUTES } from "@/config/url";
import type { ChannelUpdatePayload, MemberUpdatePayload, ChannelMemberAddedPayload, ChannelMemberRemovedPayload } from "@/socket/socket-events";
import { toast } from "sonner";

let isRedirectingFromRemoval = false;
let isRedirectingFromChannelRemoval = false;

export const handleWorkspaceUpdate = (queryClient: QueryClient, replace?: (url: string) => void) => {
  return (payload?: { action?: string; workspace?: { id?: string; name?: string } }) => {
    if (payload?.action === "DELETED") {
      queryClient.removeQueries({ queryKey: ["workspaces"] });
      queryClient.removeQueries({ queryKey: ["workspace-members"] });
      queryClient.removeQueries({ queryKey: ["workspace-channels"] });

        toast.error(`"${payload.workspace?.name || "Workspace"}" was deleted`);

      setTimeout(() => {
        (replace ?? window.location.assign)(APP_ROUTES.CONVERSATIONS.INDEX);
      }, 1500);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };
};

export const handleChannelUpdate = (queryClient: QueryClient) => {
  return (payload: ChannelUpdatePayload) => {
    if (!payload?.channel?.id) return;

    const { id, name, visibility } = payload.channel;

    const queries = queryClient.getQueriesData<Conversation[]>({ queryKey: ["workspace-channels"] });
    queries.forEach(([queryKey, oldData]) => {
      if (!Array.isArray(oldData)) return;

      if (payload.action === "UPDATED") {
        queryClient.setQueryData(queryKey, oldData.map((channel) => {
          if (channel.id !== id) return channel;
          return {
            ...channel,
            ...(name !== undefined && { name }),
            ...(visibility !== undefined && { visibility, isPrivate: visibility === "PRIVATE" }),
          };
        }));
      } else if (payload.action === "DELETED") {
        queryClient.setQueryData(queryKey, oldData.filter((channel) => channel.id !== id));
      }
    });
  };
};

export const handleMemberUpdate = (queryClient: QueryClient, replace?: (url: string) => void) => {
  return (payload: MemberUpdatePayload) => {
    if (!payload?.member) return;

    const { userId, role } = payload.member;

    if (payload.action === "REMOVED") {
      const currentUser = getAuthUser();
      if (currentUser?.id === userId) {
        if (isRedirectingFromRemoval) return;
        isRedirectingFromRemoval = true;

        setTimeout(() => {
          isRedirectingFromRemoval = false;
        }, 10_000);

        toast.error("You have been removed from the workspace");
        setTimeout(() => {
          (replace ?? window.location.assign)(APP_ROUTES.CONVERSATIONS.INDEX);
        }, 1500);
        return;
      }

      const queries = queryClient.getQueriesData<WorkspaceMember[]>({ queryKey: ["workspace-members"] });
      queries.forEach(([queryKey, oldData]) => {
        if (!Array.isArray(oldData)) return;
        queryClient.setQueryData(queryKey, oldData.filter((member) => member.userId !== userId));
      });

      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      return;
    }

    const queries = queryClient.getQueriesData<WorkspaceMember[]>({ queryKey: ["workspace-members"] });
    queries.forEach(([queryKey, oldData]) => {
      if (!Array.isArray(oldData)) return;

      queryClient.setQueryData(queryKey, oldData.map((member) => {
        if (member.userId !== userId) return member;
        return { ...member, role };
      }));
    });

    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };
};

export const handleChannelMemberAdded = (queryClient: QueryClient) => {
  return (payload: ChannelMemberAddedPayload) => {
    if (!payload?.workspaceId || !payload?.channelId) return;

    queryClient.invalidateQueries({
      queryKey: ["workspaces", payload.workspaceId, "channels", payload.channelId, "members"],
    });

    const currentUser = getAuthUser();
    if (currentUser && payload.addedMembers?.some((m) => m.id === currentUser.id)) {
      queryClient.invalidateQueries({
        queryKey: ["workspace-channels", payload.workspaceId],
      });
    }
  };
};

export const handleChannelMemberRemoved = (queryClient: QueryClient, replace?: (url: string) => void) => {
  return (payload: ChannelMemberRemovedPayload) => {
    if (!payload?.workspaceId || !payload?.channelId || !payload?.removedUserId) return;

    queryClient.invalidateQueries({
      queryKey: ["workspaces", payload.workspaceId, "channels", payload.channelId, "members"],
    });

    const currentUser = getAuthUser();
    if (currentUser?.id === payload.removedUserId) {
      if (isRedirectingFromChannelRemoval) return;
      isRedirectingFromChannelRemoval = true;

      setTimeout(() => {
        isRedirectingFromChannelRemoval = false;
      }, 10_000);

      queryClient.setQueryData<Conversation[]>(
        ["workspace-channels", payload.workspaceId],
        (oldData) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.filter((ch) => ch.id !== payload.channelId);
        }
      );

      toast.error("You have been removed from the channel");
      setTimeout(() => {
        const channels = queryClient.getQueryData<Conversation[]>(["workspace-channels", payload.workspaceId]);
        const generalChannel = channels?.find((ch) => ch.name === "general");
        if (generalChannel) {
          const dest = `/workspaces/${payload.workspaceId}/channels/${generalChannel.id}`;
          (replace ?? window.location.assign)(dest);
        } else {
          (replace ?? window.location.assign)(APP_ROUTES.CONVERSATIONS.INDEX);
        }
      }, 1500);
    }
  };
};
