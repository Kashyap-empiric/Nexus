import { useParams, usePathname } from "next/navigation";

export function useRouteState() {
  const params = useParams();
  const pathname = usePathname();
  
  const isWorkspace = pathname?.startsWith('/workspaces/') ?? false;
  const mode = isWorkspace ? "WORKSPACE" : "DM";
  const activeWorkspaceId = (params?.slug as string) || null;
  const activeConversationId = (params?.channelId as string) || (params?.id as string) || null;
  
  return { mode, activeWorkspaceId, activeConversationId };
}
