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
    mutationFn: ({ workspaceId, name }: { workspaceId: string; name: string }) => createChannel(workspaceId, name),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-channels", variables.workspaceId] });
    },
  });
};
