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
    mutationFn: ({ name, slug, imageUrl, description, iconPath }: { name: string; slug: string; imageUrl?: string; description?: string; iconPath?: string }) => createWorkspace(name, slug, imageUrl, description, iconPath),
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

import { updateChannel, deleteChannel, fetchWorkspaceMembers, updateMemberRole, removeMember, updateWorkspace, deleteWorkspace, leaveWorkspace } from "../api/workspaces.api";

export const useUpdateChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, channelId, data }: { workspaceId: string; channelId: string; data: { name?: string; description?: string; visibility?: "PUBLIC" | "PRIVATE" } }) => updateChannel(workspaceId, channelId, data),
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

export const useRemoveMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) => removeMember(workspaceId, userId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-members", variables.workspaceId] });
      if (data.workspaceId !== variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: ["workspace-members", data.workspaceId] });
      }
    },
  });
};

export const useUpdateWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, ...payload }: { workspaceId: string; name?: string; slug?: string; imageUrl?: string; iconPath?: string; description?: string }) => updateWorkspace(workspaceId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.workspaceId] });
    },
  });
};

export const useDeleteWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId }: { workspaceId: string }) => deleteWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

export const useLeaveWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId }: { workspaceId: string }) => leaveWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};
