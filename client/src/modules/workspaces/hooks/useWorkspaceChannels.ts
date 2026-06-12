import { useQuery } from "@tanstack/react-query";
import { fetchWorkspaceChannels } from "../api/workspaces.api";

export function useWorkspaceChannelsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-channels", workspaceId],
    queryFn: () => fetchWorkspaceChannels(workspaceId!),
    enabled: !!workspaceId,
    refetchInterval: 5000,
  });
}
