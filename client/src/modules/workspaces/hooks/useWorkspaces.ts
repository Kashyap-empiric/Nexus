import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUserWorkspaces, fetchWorkspaceDetails, createWorkspace, createChannel } from "../api/workspaces.api";

export const useWorkspaces = () => {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchUserWorkspaces,
  });
};

export const useWorkspaceDetails = (workspaceId: string | null) => {
  return useQuery({
    queryKey: ["workspaces", workspaceId],
    queryFn: () => fetchWorkspaceDetails(workspaceId as string),
    enabled: !!workspaceId,
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, slug, imageUrl }: { name: string; slug: string; imageUrl?: string }) => createWorkspace(name, slug, imageUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

export const useCreateChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, name, visibility }: { workspaceId: string; name: string; visibility: "PUBLIC" | "PRIVATE" }) => createChannel(workspaceId, name, visibility),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-channels", variables.workspaceId] });
    },
  });
};

import { updateChannel, deleteChannel, fetchWorkspaceMembers, updateMemberRole } from "../api/workspaces.api";

export const useUpdateChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, channelId, data }: { workspaceId: string; channelId: string; data: { name?: string; visibility?: "PUBLIC" | "PRIVATE" } }) => updateChannel(workspaceId, channelId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-channels", variables.workspaceId] });
    },
  });
};

export const useDeleteChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, channelId }: { workspaceId: string; channelId: string }) => deleteChannel(workspaceId, channelId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-channels", variables.workspaceId] });
    },
  });
};

export const useWorkspaceMembersQuery = (workspaceId: string | null) => {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembers(workspaceId as string),
    enabled: !!workspaceId,
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, userId, role }: { workspaceId: string; userId: string; role: string }) => updateMemberRole(workspaceId, userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-members", variables.workspaceId] });
    },
  });
};
