import { useQuery } from "@tanstack/react-query";
import { fetchWorkspaceChannels } from "../api/workspaces.api";

export function useWorkspaceChannelsQuery(workspaceId: string | null) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["workspace-channels", workspaceId],
    queryFn: () => fetchWorkspaceChannels(workspaceId!),
    enabled: !!workspaceId,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { data, isLoading, isError, error };
}
