import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getChannelMembers, addChannelMembers, removeChannelMember } from "../api/workspaces.api";

export const useChannelMembersQuery = (workspaceId: string | null, channelId: string | null) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["workspaces", workspaceId, "channels", channelId, "members"],
    queryFn: () => getChannelMembers(workspaceId!, channelId!),
    enabled: !!workspaceId && !!channelId,
    retry: false,
  });
  return { data, isLoading, isError, error };
};

export const useAddChannelMembersMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, channelId, userIds }: { workspaceId: string; channelId: string; userIds: string[] }) =>
      addChannelMembers(workspaceId, channelId, userIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.workspaceId, "channels", variables.channelId, "members"] });
    },
  });
};

export const useRemoveChannelMemberMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, channelId, userId }: { workspaceId: string; channelId: string; userId: string }) =>
      removeChannelMember(workspaceId, channelId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.workspaceId, "channels", variables.channelId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-channels", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};
